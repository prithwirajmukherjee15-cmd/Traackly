package httpapi

import (
	"context"
	"net/http"
	"time"

	"github.com/coder/websocket"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/apperrors"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/domain"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/realtime"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/service"
)

const wsPingInterval = 25 * time.Second

type stationLoginBody struct {
	Token string `json:"token"`
}

type kioskMeResponse struct {
	Department  string `json:"department"`
	DisplayName string `json:"displayName"`
	Mode        string `json:"mode"`
	Name        string `json:"name"`
}

func kioskMe(a *service.Actor) kioskMeResponse {
	mode := "supervisor"
	if a.Station {
		mode = "station"
	}
	return kioskMeResponse{Department: string(a.Department), DisplayName: a.Department.DisplayName(), Mode: mode, Name: a.Name}
}

func (a *API) stationLogin(w http.ResponseWriter, r *http.Request) {
	var body stationLoginBody
	if err := decode(w, r, &body); err != nil {
		a.writeError(w, r, err)
		return
	}
	actor, err := a.svc.StationLogin(r.Context(), body.Token, clientKey(r))
	if err != nil {
		a.writeError(w, r, err)
		return
	}
	a.setCookie(w, StationCookie, body.Token, stationCookieTTL)
	writeJSON(w, http.StatusOK, kioskMe(actor))
}

func (a *API) stationLogout(w http.ResponseWriter, _ *http.Request) {
	a.clearCookie(w, StationCookie)
	writeOK(w)
}

func (a *API) kioskMe(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, kioskMe(actorFrom(r.Context())))
}

func (a *API) kioskQueue(w http.ResponseWriter, r *http.Request) {
	actor := actorFrom(r.Context())
	if deptParam(r) != actor.Department {
		a.writeError(w, r, errNotFound())
		return
	}
	reqs, err := a.svc.KioskQueue(r.Context(), actor)
	a.writeRequests(w, r, reqs, err)
}

func (a *API) kioskJob(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r, "id")
	if err != nil {
		a.writeError(w, r, err)
		return
	}
	req, err := a.svc.GetRequest(r.Context(), actorFrom(r.Context()), id)
	a.writeRequest(w, r, http.StatusOK, requestResult{req: req, err: err})
}

type floorBody struct {
	Name string `json:"name"`
}

func (a *API) floorAction(action service.FloorAction) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var body floorBody
		id, err := pathID(r, "id")
		if err == nil {
			err = decode(w, r, &body)
		}
		if err != nil {
			a.writeError(w, r, err)
			return
		}
		req, err := a.svc.Floor(r.Context(), actorFrom(r.Context()), id, service.FloorInput{Action: action, Label: body.Name})
		a.writeRequest(w, r, http.StatusOK, requestResult{req: req, err: err})
	}
}

// channelsFor returns the real-time channels an actor may subscribe to.
func channelsFor(a *service.Actor) []string {
	if a.Station {
		return []string{realtime.ChanDepartment(a.Department)}
	}
	chans := []string{realtime.ChanUser(a.UserID)}
	switch a.Role {
	case domain.RoleCoordinator:
		chans = append(chans, realtime.ChanCoordinator(a.UserID))
	case domain.RoleAuthorizer:
		chans = append(chans, realtime.ChanAuthorizer)
	case domain.RoleLogistics:
		chans = append(chans, realtime.ChanLogistics)
	case domain.RoleFloorSupervisor:
		chans = append(chans, realtime.ChanDepartment(a.Department))
	default:
	}
	return chans
}

func (a *API) wsActor(r *http.Request) (*service.Actor, error) {
	if token := cookieValue(r, SessionCookie); token != "" {
		actor, _, err := a.svc.Authenticate(r.Context(), token)
		return actor, err
	}
	if raw := cookieValue(r, StationCookie); raw != "" {
		return a.svc.AuthenticateStation(r.Context(), raw)
	}
	return nil, apperrors.NewUnauthorized("Log in to continue")
}

func (a *API) websocket(w http.ResponseWriter, r *http.Request) {
	actor, err := a.wsActor(r)
	if err != nil {
		a.writeError(w, r, err)
		return
	}
	conn, err := websocket.Accept(w, r, nil)
	if err != nil {
		return
	}
	defer func() { _ = conn.CloseNow() }()
	sub := a.svc.Hub().Subscribe(channelsFor(actor)...)
	defer a.svc.Hub().Unsubscribe(sub)
	ctx := conn.CloseRead(r.Context())
	pumpEvents(ctx, conn, sub)
}

func pumpEvents(ctx context.Context, conn *websocket.Conn, sub *realtime.Subscription) {
	ticker := time.NewTicker(wsPingInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case msg := <-sub.C:
			if err := conn.Write(ctx, websocket.MessageText, msg); err != nil {
				return
			}
		case <-ticker.C:
			if err := conn.Ping(ctx); err != nil {
				return
			}
		}
	}
}
