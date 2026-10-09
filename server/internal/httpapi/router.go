package httpapi

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/domain"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/service"
)

// Cookie names.
const (
	SessionCookie = "traackly_session"
	StationCookie = "traackly_station"
)

// Options configure the HTTP layer.
type Options struct {
	CookieSecure bool
	StaticDir    string
	Logger       *slog.Logger
}

// API holds handler dependencies.
type API struct {
	svc    *service.Service
	opts   Options
	logger *slog.Logger
}

// NewRouter builds the full HTTP handler.
func NewRouter(svc *service.Service, opts Options) http.Handler {
	a := &API{svc: svc, opts: opts, logger: opts.Logger}
	r := chi.NewRouter()
	r.Use(middleware.Recoverer, securityHeaders)
	r.Route("/api", func(r chi.Router) {
		r.Use(noStore)
		a.publicRoutes(r)
		r.Group(a.staffRoutes)
		r.Group(a.kioskRoutes)
		r.NotFound(func(w http.ResponseWriter, req *http.Request) { a.writeError(w, req, errNotFound()) })
	})
	if opts.StaticDir != "" {
		r.NotFound(spaHandler(opts.StaticDir))
	}
	return r
}

func (a *API) publicRoutes(r chi.Router) {
	r.Get("/health", a.health)
	r.Post("/auth/login", a.login)
	r.Post("/auth/forgot-password", a.forgotPassword)
	r.Post("/auth/reset-password/{token}", a.resetPassword)
	r.Get("/users/activate/{token}", a.inviteInfo)
	r.Post("/users/activate/{token}", a.activate)
	r.Post("/kiosk/session", a.stationLogin)
	r.Delete("/kiosk/session", a.stationLogout)
	r.Get("/ws", a.websocket)
}

func (a *API) staffRoutes(r chi.Router) {
	r.Use(a.requireStaff)
	r.Post("/auth/logout", a.logout)
	r.Post("/auth/refresh", a.refresh)
	r.Get("/auth/me", a.me)
	r.Get("/departments", a.departments)

	office := []domain.Role{domain.RoleCoordinator, domain.RoleAuthorizer, domain.RoleLogistics}
	r.With(requireRole(office...)).Get("/requests", a.listRequests)
	r.With(requireRole(office...)).Get("/requests/{id}", a.getRequest)

	r.Group(func(r chi.Router) {
		r.Use(requireRole(domain.RoleCoordinator))
		r.Post("/requests", a.createRequest)
		r.Get("/coordinators/{id}/requests", a.coordinatorRequests)
	})
	r.Group(func(r chi.Router) {
		r.Use(requireRole(domain.RoleAuthorizer))
		r.Patch("/requests/{id}", a.editRequest)
		r.Post("/requests/{id}/approve", a.approveRequest)
		r.Post("/requests/{id}/decline", a.declineRequest)
		r.Get("/users", a.listUsers)
		r.Post("/users/invite", a.invite)
		r.Post("/users/{id}/resend-invite", a.resendInvite)
		r.Patch("/users/{id}", a.patchUser)
		r.Get("/stations", a.listStations)
		r.Post("/stations/{dept}", a.provisionStation)
		r.Delete("/stations/{dept}", a.revokeStation)
	})
	r.Group(func(r chi.Router) {
		r.Use(requireRole(domain.RoleLogistics))
		r.Post("/requests/{id}/timeline", a.setTimeline)
		r.Patch("/requests/{id}/timeline", a.setTimeline)
	})
}

func (a *API) kioskRoutes(r chi.Router) {
	r.Use(a.requireKiosk)
	r.Get("/kiosk/me", a.kioskMe)
	r.Get("/departments/{dept}/queue", a.kioskQueue)
	r.Get("/kiosk/jobs/{id}", a.kioskJob)
	r.Post("/requests/{id}/acknowledge", a.floorAction(service.FloorAcknowledge))
	r.Post("/kiosk/jobs/{id}/start", a.floorAction(service.FloorStart))
	r.Post("/kiosk/jobs/{id}/complete", a.floorAction(service.FloorComplete))
}

type healthResponse struct {
	Status string `json:"status"`
}

func (a *API) health(w http.ResponseWriter, r *http.Request) {
	if err := a.svc.Store().Ping(r.Context()); err != nil {
		writeJSON(w, http.StatusServiceUnavailable, healthResponse{Status: "degraded"})
		return
	}
	writeJSON(w, http.StatusOK, healthResponse{Status: "ok"})
}
