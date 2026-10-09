package httpapi

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/domain"
)

type loginBody struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type userResponse struct {
	User userDTO `json:"user"`
}

func (a *API) login(w http.ResponseWriter, r *http.Request) {
	var body loginBody
	if err := decode(w, r, &body); err != nil {
		a.writeError(w, r, err)
		return
	}
	res, err := a.svc.Login(r.Context(), body.Email, body.Password, r.UserAgent())
	if err != nil {
		a.writeError(w, r, err)
		return
	}
	a.setCookie(w, SessionCookie, res.Token, a.svc.Issuer().TTL())
	writeJSON(w, http.StatusOK, userResponse{User: toUserDTO(res.User)})
}

func (a *API) refresh(w http.ResponseWriter, r *http.Request) {
	res, err := a.svc.Refresh(r.Context(), cookieValue(r, SessionCookie), r.UserAgent())
	if err != nil {
		a.writeError(w, r, err)
		return
	}
	a.setCookie(w, SessionCookie, res.Token, a.svc.Issuer().TTL())
	writeJSON(w, http.StatusOK, userResponse{User: toUserDTO(res.User)})
}

func (a *API) logout(w http.ResponseWriter, r *http.Request) {
	if err := a.svc.Logout(r.Context(), cookieValue(r, SessionCookie)); err != nil {
		a.writeError(w, r, err)
		return
	}
	a.clearCookie(w, SessionCookie)
	writeOK(w)
}

func (a *API) me(w http.ResponseWriter, r *http.Request) {
	_, u, err := a.svc.Authenticate(r.Context(), cookieValue(r, SessionCookie))
	if err != nil {
		a.writeError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, userResponse{User: toUserDTO(u)})
}

type emailBody struct {
	Email string `json:"email"`
}

type linkResponse struct {
	OK      bool   `json:"ok"`
	DevLink string `json:"devLink,omitempty"`
}

func (a *API) forgotPassword(w http.ResponseWriter, r *http.Request) {
	var body emailBody
	if err := decode(w, r, &body); err != nil {
		a.writeError(w, r, err)
		return
	}
	link, err := a.svc.ForgotPassword(r.Context(), body.Email)
	if err != nil {
		a.writeError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, linkResponse{OK: true, DevLink: link})
}

type passwordBody struct {
	Password        string `json:"password"`
	ConfirmPassword string `json:"confirmPassword"`
}

func (a *API) resetPassword(w http.ResponseWriter, r *http.Request) {
	var body passwordBody
	if err := decode(w, r, &body); err != nil {
		a.writeError(w, r, err)
		return
	}
	if err := a.svc.ResetPassword(r.Context(), chi.URLParam(r, "token"), body.Password, body.ConfirmPassword); err != nil {
		a.writeError(w, r, err)
		return
	}
	writeOK(w)
}

type inviteInfoResponse struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

func (a *API) inviteInfo(w http.ResponseWriter, r *http.Request) {
	u, err := a.svc.InviteInfo(r.Context(), chi.URLParam(r, "token"))
	if err != nil {
		a.writeError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, inviteInfoResponse{Name: u.Name, Email: u.Email})
}

type activateResponse struct {
	Email string `json:"email"`
}

func (a *API) activate(w http.ResponseWriter, r *http.Request) {
	var body passwordBody
	if err := decode(w, r, &body); err != nil {
		a.writeError(w, r, err)
		return
	}
	email, err := a.svc.Activate(r.Context(), chi.URLParam(r, "token"), body.Password, body.ConfirmPassword)
	if err != nil {
		a.writeError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, activateResponse{Email: email})
}

type departmentDTO struct {
	ID           string `json:"id"`
	DisplayName  string `json:"displayName"`
	StationCount int    `json:"stationCount"`
}

type departmentsResponse struct {
	Departments []departmentDTO `json:"departments"`
}

func (a *API) departments(w http.ResponseWriter, r *http.Request) {
	docs, err := a.svc.Store().ListDepartments(r.Context())
	if err != nil {
		a.writeError(w, r, err)
		return
	}
	out := make([]departmentDTO, 0, len(docs))
	for _, d := range docs {
		out = append(out, departmentDTO{ID: string(d.ID), DisplayName: d.DisplayName, StationCount: d.StationCount})
	}
	writeJSON(w, http.StatusOK, departmentsResponse{Departments: out})
}

func deptParam(r *http.Request) domain.Department {
	return domain.Department(chi.URLParam(r, "dept"))
}
