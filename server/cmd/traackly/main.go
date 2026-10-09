// Command traackly runs the Traackly API server (and serves the built client when STATIC_DIR is set).
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/config"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/auth"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/httpapi"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/notify"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/realtime"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/service"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/store"
)

const (
	readHeaderTimeout = 10 * time.Second
	shutdownTimeout   = 15 * time.Second
	startupTimeout    = 30 * time.Second
)

func main() {
	if err := run(); err != nil {
		slog.Error("traackly exited", "error", err)
		os.Exit(1)
	}
}

func newLogger(level string) *slog.Logger {
	levels := map[string]slog.Level{"DEBUG": slog.LevelDebug, "INFO": slog.LevelInfo, "WARNING": slog.LevelWarn, "ERROR": slog.LevelError}
	return slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: levels[level]}))
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}
	logger := newLogger(cfg.LogLevel)
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	startCtx, cancel := context.WithTimeout(ctx, startupTimeout)
	defer cancel()
	client, db, err := store.Connect(startCtx, cfg.MongoURI, cfg.MongoDB)
	if err != nil {
		return err
	}
	defer func() { _ = client.Disconnect(context.WithoutCancel(ctx)) }()
	st := store.New(db, time.Now)
	if err := st.EnsureIndexes(startCtx); err != nil {
		return err
	}
	if err := st.SeedDepartments(startCtx); err != nil {
		return err
	}
	svc := service.New(&service.Deps{
		Store: st, Hub: realtime.NewHub(), Mailer: newMailer(cfg, logger),
		Issuer: auth.NewIssuer(cfg.JWTSecret, cfg.SessionTTL, time.Now), Hasher: auth.NewHasher(), Limiter: auth.NewLimiter(time.Now),
		Logger: logger, BaseURL: cfg.AppBaseURL, ExposeDevLinks: cfg.ExposeDevLinks, Async: true,
	})
	handler := httpapi.NewRouter(svc, httpapi.Options{CookieSecure: cfg.CookieSecure, StaticDir: cfg.StaticDir, Logger: logger})
	return serve(ctx, &http.Server{Addr: ":" + cfg.Port, Handler: handler, ReadHeaderTimeout: readHeaderTimeout}, logger, svc)
}

func newMailer(cfg *config.Config, logger *slog.Logger) notify.Mailer {
	if cfg.ResendAPIKey != "" {
		return notify.NewResendMailer(cfg.ResendAPIKey, cfg.EmailFrom)
	}
	logger.Warn("RESEND_API_KEY not set; emails are written to the log")
	return &notify.LogMailer{Logger: logger}
}

func serve(ctx context.Context, srv *http.Server, logger *slog.Logger, svc *service.Service) error {
	errCh := make(chan error, 1)
	go func() {
		logger.Info("listening", "addr", srv.Addr)
		errCh <- srv.ListenAndServe()
	}()
	select {
	case err := <-errCh:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return fmt.Errorf("serve: %w", err)
	case <-ctx.Done():
	}
	shutCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), shutdownTimeout)
	defer cancel()
	if err := srv.Shutdown(shutCtx); err != nil {
		return fmt.Errorf("shutdown: %w", err)
	}
	svc.Wait()
	return nil
}
