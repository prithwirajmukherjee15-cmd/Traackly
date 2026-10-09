// Command seed creates the departments, the bootstrap Authorizer, and (with -demo) demo data.
package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/config"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/auth"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/domain"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/seed"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/store"
)

const seedTimeout = time.Minute

func main() {
	demo := flag.Bool("demo", false, "also create demo users and requests")
	flag.Parse()
	if err := run(*demo); err != nil {
		slog.Error("seed failed", "error", err)
		os.Exit(1)
	}
}

func run(demo bool) error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}
	sc, err := config.LoadSeed()
	if err != nil {
		return fmt.Errorf("load seed config: %w", err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), seedTimeout)
	defer cancel()
	client, db, err := store.Connect(ctx, cfg.MongoURI, cfg.MongoDB)
	if err != nil {
		return err
	}
	defer func() { _ = client.Disconnect(ctx) }()
	st := store.New(db, time.Now)
	if err := st.EnsureIndexes(ctx); err != nil {
		return err
	}
	if err := st.SeedDepartments(ctx); err != nil {
		return err
	}
	authz, err := seed.EnsureAccount(ctx, st, auth.NewHasher(), &seed.Account{
		Name: sc.AuthorizerName, Email: sc.AuthorizerEmail, Password: sc.AuthorizerPassword, Role: domain.RoleAuthorizer,
	})
	if err != nil {
		return err
	}
	slog.Info("bootstrap authorizer ready", "email", authz.Email)
	if !demo {
		return nil
	}
	if err := seed.Demo(ctx, st, auth.NewHasher(), authz); err != nil {
		return err
	}
	slog.Info("demo data ready", "password", seed.DemoPassword,
		"accounts", "coordinator@traackly.demo, logistics@traackly.demo, floor@traackly.demo")
	return nil
}
