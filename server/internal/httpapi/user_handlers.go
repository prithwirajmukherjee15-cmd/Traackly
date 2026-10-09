package httpapi

import (
	"net/http"
	"time"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/apperrors"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/domain"
)

type usersResponse struct {
	Users []userDTO `json:"users"`
}

func (a *API) listUsers(w http.ResponseWriter, r *http.Request) {
	users, err := a.svc.ListUsers(r.Context())
	if err != nil {
		a.writeError(w, r, err)
		return
	}
	out := make([]userDTO, 0, len(users))
	for i := range users {
		out = append(out, toUserDTO(&users[i]))
	}
	writeJSON(w, http.StatusOK, usersResponse{Users: out})
}

type inviteBody struct {
	Name       string `json:"name"`
	Email      string `json:"email"`
	Role       string `json:"role"`
	Department string `json:"department"`
}

type inviteResponse struct {
	User    userDTO `json:"user"`
	DevLink string  `json:"devLink,omitempty"`
}

func (a *API) invite(w http.ResponseWriter, r *http.Request) {
	var body inviteBody
	if err := decode(w, r, &body); err != nil {
		a.writeError(w, r, err)
		return
	}
	u, link, err := a.svc.Invite(r.Context(), actorFrom(r.Context()), domain.Invite{
		Name: body.Name, Email: body.Email, Role: domain.Role(body.Role), Department: domain.Department(body.Department),
	})
	if err != nil {
		a.writeError(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, inviteResponse{User: toUserDTO(u), DevLink: link})
}

func (a *API) resendInvite(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r, "id")
	if err != nil {
		a.writeError(w, r, err)
		return
	}
	link, err := a.svc.ResendInvite(r.Context(), actorFrom(r.Context()), id)
	if err != nil {
		a.writeError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, linkResponse{OK: true, DevLink: link})
}

type patchUserBody struct {
	Status string `json:"status"`
}

func (a *API) patchUser(w http.ResponseWriter, r *http.Request) {
	var body patchUserBody
	id, err := pathID(r, "id")
	if err == nil {
		err = decode(w, r, &body)
	}
	if err == nil && domain.UserStatus(body.Status) != domain.UserDeactivated {
		err = apperrors.NewClient("Only deactivation is supported")
	}
	if err == nil {
		err = a.svc.Deactivate(r.Context(), id)
	}
	if err != nil {
		a.writeError(w, r, err)
		return
	}
	writeOK(w)
}

type stationDTO struct {
	Department    string    `json:"department"`
	Revoked       bool      `json:"revoked"`
	ProvisionedAt time.Time `json:"provisionedAt"`
}

type stationsResponse struct {
	Stations []stationDTO `json:"stations"`
}

func (a *API) listStations(w http.ResponseWriter, r *http.Request) {
	stations, err := a.svc.ListStations(r.Context())
	if err != nil {
		a.writeError(w, r, err)
		return
	}
	out := make([]stationDTO, 0, len(stations))
	for i := range stations {
		out = append(out, stationDTO{
			Department: string(stations[i].Department), Revoked: stations[i].Revoked, ProvisionedAt: stations[i].ProvisionedAt,
		})
	}
	writeJSON(w, http.StatusOK, stationsResponse{Stations: out})
}

type provisionResponse struct {
	Token string `json:"token"`
	URL   string `json:"url"`
}

func (a *API) provisionStation(w http.ResponseWriter, r *http.Request) {
	res, err := a.svc.ProvisionStation(r.Context(), actorFrom(r.Context()), deptParam(r))
	if err != nil {
		a.writeError(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, provisionResponse{Token: res.Token, URL: res.URL})
}

func (a *API) revokeStation(w http.ResponseWriter, r *http.Request) {
	if err := a.svc.RevokeStation(r.Context(), deptParam(r)); err != nil {
		a.writeError(w, r, err)
		return
	}
	writeOK(w)
}
