package httpapi

import (
	"context"
	"net"
	"net/http"
	"os"
	"path"
	"slices"
	"strings"
	"time"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/apperrors"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/domain"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/service"
)

type ctxKey int

const actorKey ctxKey = iota

const stationCookieTTL = 400 * 24 * time.Hour

func withActor(ctx context.Context, a *service.Actor) context.Context {
	return context.WithValue(ctx, actorKey, a)
}

func actorFrom(ctx context.Context) *service.Actor {
	a, ok := ctx.Value(actorKey).(*service.Actor)
	if !ok {
		return &service.Actor{}
	}
	return a
}

func errNotFound() error { return apperrors.NewNotFound("Not found") }

func cookieValue(r *http.Request, name string) string {
	c, err := r.Cookie(name)
	if err != nil {
		return ""
	}
	return c.Value
}

// requireStaff authenticates a staff session cookie on every request; station tokens are never accepted here.
func (a *API) requireStaff(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := cookieValue(r, SessionCookie)
		if token == "" {
			a.writeError(w, r, apperrors.NewUnauthorized("Log in to continue"))
			return
		}
		actor, _, err := a.svc.Authenticate(r.Context(), token)
		if err != nil {
			a.clearCookie(w, SessionCookie)
			a.writeError(w, r, err)
			return
		}
		next.ServeHTTP(w, r.WithContext(withActor(r.Context(), actor)))
	})
}

// requireKiosk authenticates a department station token, or a logged-in floor supervisor.
func (a *API) requireKiosk(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		actor, err := a.kioskActor(r)
		if err != nil {
			a.writeError(w, r, err)
			return
		}
		next.ServeHTTP(w, r.WithContext(withActor(r.Context(), actor)))
	})
}

func (a *API) kioskActor(r *http.Request) (*service.Actor, error) {
	if raw := cookieValue(r, StationCookie); raw != "" {
		return a.svc.AuthenticateStation(r.Context(), raw)
	}
	token := cookieValue(r, SessionCookie)
	if token == "" {
		return nil, apperrors.NewUnauthorized("This kiosk is not connected to a department station")
	}
	actor, _, err := a.svc.Authenticate(r.Context(), token)
	if err != nil {
		return nil, err
	}
	if actor.Role != domain.RoleFloorSupervisor {
		return nil, apperrors.NewForbidden("The kiosk is for floor supervisors")
	}
	return actor, nil
}

func requireRole(roles ...domain.Role) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !slices.Contains(roles, actorFrom(r.Context()).Role) {
				writeJSON(w, http.StatusForbidden, errorEnvelope{Error: errorBody{
					Code: apperrors.CodeForbidden, Message: "You don't have access to this action",
				}})
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// setCookie sets an auth cookie. Max-Age is relative, so it is immune to client/server clock skew.
func (a *API) setCookie(w http.ResponseWriter, name, value string, ttl time.Duration) {
	//nolint:gosec // G124: Secure is config-driven (COOKIE_SECURE) so local http dev works; HttpOnly+SameSite=Strict are fixed.
	http.SetCookie(w, &http.Cookie{
		Name: name, Value: value, Path: "/", MaxAge: int(ttl.Seconds()),
		HttpOnly: true, Secure: a.opts.CookieSecure, SameSite: http.SameSiteStrictMode,
	})
}

func (a *API) clearCookie(w http.ResponseWriter, name string) {
	//nolint:gosec // G124: Secure is config-driven (COOKIE_SECURE) so local http dev works; HttpOnly+SameSite=Strict are fixed.
	http.SetCookie(w, &http.Cookie{
		Name: name, Value: "", Path: "/", MaxAge: -1,
		HttpOnly: true, Secure: a.opts.CookieSecure, SameSite: http.SameSiteStrictMode,
	})
}

func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "no-referrer")
		h.Set("Content-Security-Policy", "default-src 'self'; connect-src 'self' ws: wss:; img-src 'self' data:; "+
			"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com")
		next.ServeHTTP(w, r)
	})
}

func noStore(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		next.ServeHTTP(w, r)
	})
}

// spaHandler serves built client assets, falling back to index.html for client-side routes.
// os.Root confines every lookup to dir, so crafted paths cannot escape it.
func spaHandler(dir string) http.HandlerFunc {
	root, err := os.OpenRoot(dir)
	if err != nil {
		return func(w http.ResponseWriter, r *http.Request) { http.NotFound(w, r) }
	}
	files := http.FileServerFS(root.FS())
	return func(w http.ResponseWriter, r *http.Request) {
		name := strings.TrimPrefix(path.Clean("/"+r.URL.Path), "/")
		if strings.HasPrefix(name, "api/") {
			http.NotFound(w, r)
			return
		}
		if info, err := root.Stat(name); err == nil && !info.IsDir() {
			if strings.HasPrefix(name, "assets/") {
				w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
			}
			files.ServeHTTP(w, r)
			return
		}
		w.Header().Set("Cache-Control", "no-cache")
		r2 := r.Clone(r.Context())
		r2.URL.Path = "/"
		files.ServeHTTP(w, r2)
	}
}

// clientKey identifies the caller for rate limiting. Behind Render's proxy the
// last X-Forwarded-For hop is the one the proxy itself appended.
func clientKey(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		return strings.TrimSpace(parts[len(parts)-1])
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
