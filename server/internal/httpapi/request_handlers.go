package httpapi

import (
	"net/http"
	"time"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/apperrors"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/domain"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/service"
)

type fieldsBody struct {
	ClientName         string     `json:"clientName"`
	RequirementDetails string     `json:"requirementDetails"`
	TargetDepartment   string     `json:"targetDepartment"`
	Priority           string     `json:"priority"`
	ExpectedUpdatedAt  *time.Time `json:"expectedUpdatedAt"`
}

func (b *fieldsBody) fields() domain.Fields {
	return domain.Fields{
		ClientName: b.ClientName, RequirementDetails: b.RequirementDetails,
		TargetDepartment: domain.Department(b.TargetDepartment), Priority: domain.Priority(b.Priority),
	}
}

type requestsResponse struct {
	Requests []requestDTO `json:"requests"`
}

type requestResponse struct {
	Request    *requestDTO `json:"request"`
	NextOwners string      `json:"nextOwners,omitempty"`
}

func (a *API) writeRequests(w http.ResponseWriter, r *http.Request, reqs []domain.Request, err error) {
	if err != nil {
		a.writeError(w, r, err)
		return
	}
	dtos, err := a.toDTOs(r.Context(), reqs)
	if err != nil {
		a.writeError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, requestsResponse{Requests: dtos})
}

func (a *API) writeRequest(w http.ResponseWriter, r *http.Request, status int, res requestResult) {
	if res.err != nil {
		a.writeError(w, r, res.err)
		return
	}
	dto, err := a.toOneDTO(r.Context(), res.req)
	if err != nil {
		a.writeError(w, r, err)
		return
	}
	writeJSON(w, status, requestResponse{Request: dto, NextOwners: res.nextOwners})
}

type requestResult struct {
	req        *domain.Request
	err        error
	nextOwners string
}

func (a *API) listRequests(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	reqs, err := a.svc.ListRequests(r.Context(), actorFrom(r.Context()), service.ListParams{
		View: q.Get("view"), State: domain.State(q.Get("state")),
	})
	a.writeRequests(w, r, reqs, err)
}

func (a *API) coordinatorRequests(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r, "id")
	if err == nil && id != actorFrom(r.Context()).UserID {
		err = errNotFound()
	}
	if err != nil {
		a.writeError(w, r, err)
		return
	}
	a.listRequests(w, r)
}

func (a *API) getRequest(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r, "id")
	if err != nil {
		a.writeError(w, r, err)
		return
	}
	req, err := a.svc.GetRequest(r.Context(), actorFrom(r.Context()), id)
	a.writeRequest(w, r, http.StatusOK, requestResult{req: req, err: err})
}

func (a *API) createRequest(w http.ResponseWriter, r *http.Request) {
	var body fieldsBody
	if err := decode(w, r, &body); err != nil {
		a.writeError(w, r, err)
		return
	}
	req, err := a.svc.CreateRequest(r.Context(), actorFrom(r.Context()), body.fields())
	a.writeRequest(w, r, http.StatusCreated, requestResult{req: req, err: err})
}

func (a *API) editRequest(w http.ResponseWriter, r *http.Request) {
	var body fieldsBody
	id, err := pathID(r, "id")
	if err == nil {
		err = decode(w, r, &body)
	}
	if err != nil {
		a.writeError(w, r, err)
		return
	}
	req, res, err := a.svc.EditRequest(r.Context(), actorFrom(r.Context()), id,
		&service.EditInput{Fields: body.fields(), Expected: body.ExpectedUpdatedAt})
	out := requestResult{req: req, err: err}
	if err == nil && res.Flagged {
		out.nextOwners = service.NextOwners(req)
	}
	a.writeRequest(w, r, http.StatusOK, out)
}

type approveBody struct {
	Fields            *fieldsBody `json:"fields"`
	ExpectedUpdatedAt *time.Time  `json:"expectedUpdatedAt"`
}

func (a *API) approveRequest(w http.ResponseWriter, r *http.Request) {
	var body approveBody
	id, err := pathID(r, "id")
	if err == nil {
		err = decode(w, r, &body)
	}
	if err != nil {
		a.writeError(w, r, err)
		return
	}
	in := &service.EditInput{Expected: body.ExpectedUpdatedAt}
	if body.Fields != nil {
		in.Fields = body.Fields.fields()
	}
	req, err := a.svc.ApproveRequest(r.Context(), actorFrom(r.Context()), id, in)
	a.writeRequest(w, r, http.StatusOK, requestResult{req: req, err: err})
}

type declineBody struct {
	Reason            string     `json:"reason"`
	ExpectedUpdatedAt *time.Time `json:"expectedUpdatedAt"`
}

func (a *API) declineRequest(w http.ResponseWriter, r *http.Request) {
	var body declineBody
	id, err := pathID(r, "id")
	if err == nil {
		err = decode(w, r, &body)
	}
	if err != nil {
		a.writeError(w, r, err)
		return
	}
	req, err := a.svc.DeclineRequest(r.Context(), actorFrom(r.Context()), id,
		&service.DeclineInput{Reason: body.Reason, Expected: body.ExpectedUpdatedAt})
	a.writeRequest(w, r, http.StatusOK, requestResult{req: req, err: err})
}

type timelineBody struct {
	Estimate *time.Time `json:"estimate"`
}

func (a *API) setTimeline(w http.ResponseWriter, r *http.Request) {
	var body timelineBody
	id, err := pathID(r, "id")
	if err == nil {
		err = decode(w, r, &body)
	}
	if err == nil && body.Estimate == nil {
		err = apperrors.NewValidation("Timeline must be a valid future date",
			map[string]string{"estimate": "Timeline must be a valid future date"})
	}
	if err != nil {
		a.writeError(w, r, err)
		return
	}
	req, err := a.svc.SetTimeline(r.Context(), actorFrom(r.Context()), id, body.Estimate.UTC())
	a.writeRequest(w, r, http.StatusOK, requestResult{req: req, err: err})
}
