package httpapi

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/domain"
)

type demoInfoResponse struct {
	Enabled bool `json:"enabled"`
}

type demoLoginBody struct {
	Role string `json:"role"`
}

// demoRoutes exist only on the public demo deployment; elsewhere /api/demo is a 404.
func (a *API) demoRoutes(r chi.Router) {
	if !a.svc.DemoMode() {
		return
	}
	r.Get("/demo", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, demoInfoResponse{Enabled: true})
	})
	r.Post("/demo/login", a.demoLogin)
}

// demoLogin signs the visitor in as the demo account for a role, with no password.
func (a *API) demoLogin(w http.ResponseWriter, r *http.Request) {
	var body demoLoginBody
	if err := decode(w, r, &body); err != nil {
		a.writeError(w, r, err)
		return
	}
	res, err := a.svc.DemoLogin(r.Context(), domain.Role(body.Role), r.UserAgent())
	if err != nil {
		a.writeError(w, r, err)
		return
	}
	// A station cookie would take precedence on the kiosk, so switching roles clears it.
	a.clearCookie(w, StationCookie)
	a.setCookie(w, SessionCookie, res.Token, a.svc.Issuer().TTL())
	writeJSON(w, http.StatusOK, userResponse{User: toUserDTO(res.User)})
}
