package httpapi

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/domain"
)

type personRef struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type timelineDTO struct {
	Estimate time.Time `json:"estimate"`
	SetBy    personRef `json:"setBy"`
	SetAt    time.Time `json:"setAt"`
}

type changeDTO struct {
	Field     string    `json:"field"`
	OldValue  string    `json:"oldValue"`
	NewValue  string    `json:"newValue"`
	ChangedBy personRef `json:"changedBy"`
	ChangedAt time.Time `json:"changedAt"`
}

type statusDTO struct {
	From  string    `json:"from"`
	To    string    `json:"to"`
	Actor string    `json:"actor"`
	At    time.Time `json:"at"`
}

type ackDTO struct {
	By string    `json:"by"`
	At time.Time `json:"at"`
}

type riskDTO struct {
	AtRisk  bool     `json:"atRisk"`
	Reasons []string `json:"reasons"`
}

type requestDTO struct {
	ID                 string       `json:"id"`
	JobCode            string       `json:"jobCode"`
	ClientName         string       `json:"clientName"`
	RequirementDetails string       `json:"requirementDetails"`
	TargetDepartment   string       `json:"targetDepartment"`
	Priority           string       `json:"priority"`
	State              string       `json:"state"`
	RaisedBy           personRef    `json:"raisedBy"`
	DeclineReason      *string      `json:"declineReason"`
	Timeline           *timelineDTO `json:"timeline"`
	Changelog          []changeDTO  `json:"changelog"`
	StatusHistory      []statusDTO  `json:"statusHistory"`
	PendingAcks        []string     `json:"pendingAcks"`
	Acknowledged       *ackDTO      `json:"acknowledged"`
	WorkStartedAt      *time.Time   `json:"workStartedAt"`
	CompletedAt        *time.Time   `json:"completedAt"`
	FloorBlocker       string       `json:"floorBlocker"`
	Risk               riskDTO      `json:"risk"`
	CreatedAt          time.Time    `json:"createdAt"`
	UpdatedAt          time.Time    `json:"updatedAt"`
}

type nameMap map[bson.ObjectID]string

func (n nameMap) ref(id bson.ObjectID) personRef {
	name, ok := n[id]
	if !ok {
		name = "Unknown user"
	}
	return personRef{ID: id.Hex(), Name: name}
}

func collectIDs(reqs []domain.Request) []bson.ObjectID {
	set := map[bson.ObjectID]bool{}
	for i := range reqs {
		addRequestIDs(set, &reqs[i])
	}
	ids := make([]bson.ObjectID, 0, len(set))
	for id := range set {
		ids = append(ids, id)
	}
	return ids
}

func addRequestIDs(set map[bson.ObjectID]bool, r *domain.Request) {
	set[r.RaisedBy] = true
	if r.Timeline != nil {
		set[r.Timeline.SetBy] = true
	}
	if r.AcknowledgedBy != nil {
		set[*r.AcknowledgedBy] = true
	}
	for j := range r.Changelog {
		set[r.Changelog[j].ChangedBy] = true
	}
	for j := range r.StatusHistory {
		if r.StatusHistory[j].ChangedBy != nil {
			set[*r.StatusHistory[j].ChangedBy] = true
		}
	}
}

func (a *API) toDTOs(ctx context.Context, reqs []domain.Request) ([]requestDTO, error) {
	names, err := a.svc.Store().UserNames(ctx, collectIDs(reqs))
	if err != nil {
		return nil, err
	}
	now := a.svc.Store().Now()
	out := make([]requestDTO, 0, len(reqs))
	for i := range reqs {
		out = append(out, toDTO(&reqs[i], nameMap(names), now))
	}
	return out, nil
}

func (a *API) toOneDTO(ctx context.Context, r *domain.Request) (*requestDTO, error) {
	dtos, err := a.toDTOs(ctx, []domain.Request{*r})
	if err != nil {
		return nil, err
	}
	return &dtos[0], nil
}

func toDTO(r *domain.Request, names nameMap, now time.Time) requestDTO {
	risk := domain.AssessRisk(r, now)
	d := requestDTO{
		ID: r.ID.Hex(), JobCode: r.JobCode(), ClientName: r.ClientName, RequirementDetails: r.RequirementDetails,
		TargetDepartment: string(r.TargetDepartment), Priority: string(r.Priority), State: string(r.State),
		RaisedBy: names.ref(r.RaisedBy), DeclineReason: r.DeclineReason,
		Changelog: make([]changeDTO, 0, len(r.Changelog)), StatusHistory: make([]statusDTO, 0, len(r.StatusHistory)),
		PendingAcks: make([]string, 0, len(r.PendingAcks)), WorkStartedAt: r.WorkStartedAt, CompletedAt: r.CompletedAt,
		FloorBlocker: r.FloorBlocker(), Risk: riskDTO{AtRisk: risk.AtRisk, Reasons: risk.Reasons},
		CreatedAt: r.CreatedAt, UpdatedAt: r.UpdatedAt,
	}
	if r.Timeline != nil {
		d.Timeline = &timelineDTO{Estimate: r.Timeline.Estimate, SetBy: names.ref(r.Timeline.SetBy), SetAt: r.Timeline.SetAt}
	}
	for _, e := range r.Changelog {
		d.Changelog = append(d.Changelog, changeDTO{
			Field: e.Field, OldValue: e.OldValue, NewValue: e.NewValue, ChangedBy: names.ref(e.ChangedBy), ChangedAt: e.ChangedAt,
		})
	}
	for _, s := range r.StatusHistory {
		d.StatusHistory = append(d.StatusHistory, statusDTO{From: string(s.From), To: string(s.To), Actor: actorName(s.ChangedBy, s.ActorLabel, names), At: s.At})
	}
	for _, p := range r.PendingAcks {
		d.PendingAcks = append(d.PendingAcks, string(p))
	}
	if r.AcknowledgedAt != nil {
		d.Acknowledged = &ackDTO{By: actorName(r.AcknowledgedBy, r.AcknowledgedByLabel, names), At: *r.AcknowledgedAt}
	}
	return d
}

func actorName(id *bson.ObjectID, label string, names nameMap) string {
	if label != "" {
		return label
	}
	if id != nil {
		return names.ref(*id).Name
	}
	return labelKioskStation
}

const labelKioskStation = "Kiosk station"

type userDTO struct {
	ID          string     `json:"id"`
	Name        string     `json:"name"`
	Email       string     `json:"email"`
	Role        string     `json:"role"`
	Department  *string    `json:"department"`
	Status      string     `json:"status"`
	InvitedAt   *time.Time `json:"invitedAt"`
	ActivatedAt *time.Time `json:"activatedAt"`
}

func toUserDTO(u *domain.User) userDTO {
	d := userDTO{
		ID: u.ID.Hex(), Name: u.Name, Email: u.Email, Role: string(u.Role), Status: string(u.Status),
		InvitedAt: u.InvitedAt, ActivatedAt: u.ActivatedAt,
	}
	if u.Department != nil {
		dept := string(*u.Department)
		d.Department = &dept
	}
	return d
}
