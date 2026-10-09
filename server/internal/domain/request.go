package domain

import (
	"slices"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

const jobCodeLen = 6

// ChangeEntry is one append-only changelog record for a post-authorization edit.
type ChangeEntry struct {
	Field     string        `bson:"field"`
	OldValue  string        `bson:"oldValue"`
	NewValue  string        `bson:"newValue"`
	ChangedBy bson.ObjectID `bson:"changedBy"`
	ChangedAt time.Time     `bson:"changedAt"`
}

// StatusEntry records one lifecycle transition.
type StatusEntry struct {
	From       State          `bson:"from"`
	To         State          `bson:"to"`
	ChangedBy  *bson.ObjectID `bson:"changedBy"`
	ActorLabel string         `bson:"actorLabel,omitempty"`
	At         time.Time      `bson:"at"`
}

// Timeline is the Logistics execution estimate.
type Timeline struct {
	Estimate time.Time     `bson:"estimate"`
	SetBy    bson.ObjectID `bson:"setBy"`
	SetAt    time.Time     `bson:"setAt"`
}

// Request is Traackly's core object.
type Request struct {
	ID                  bson.ObjectID  `bson:"_id"`
	ClientName          string         `bson:"clientName"`
	RequirementDetails  string         `bson:"requirementDetails"`
	TargetDepartment    Department     `bson:"targetDepartment"`
	Priority            Priority       `bson:"priority"`
	State               State          `bson:"state"`
	RaisedBy            bson.ObjectID  `bson:"raisedBy"`
	DeclineReason       *string        `bson:"declineReason"`
	Timeline            *Timeline      `bson:"timeline"`
	Changelog           []ChangeEntry  `bson:"changelog"`
	StatusHistory       []StatusEntry  `bson:"statusHistory"`
	PendingAcks         []AckStage     `bson:"pendingAcks"`
	AcknowledgedBy      *bson.ObjectID `bson:"acknowledgedBy"`
	AcknowledgedByLabel string         `bson:"acknowledgedByLabel"`
	AcknowledgedAt      *time.Time     `bson:"acknowledgedAt"`
	WorkStartedAt       *time.Time     `bson:"workStartedAt"`
	CompletedAt         *time.Time     `bson:"completedAt"`
	CreatedAt           time.Time      `bson:"createdAt"`
	UpdatedAt           time.Time      `bson:"updatedAt"`
}

// Fields are the protected, user-editable request fields.
type Fields struct {
	ClientName         string
	RequirementDetails string
	TargetDepartment   Department
	Priority           Priority
}

// Fields returns the request's current protected fields.
func (r *Request) Fields() Fields {
	return Fields{
		ClientName:         r.ClientName,
		RequirementDetails: r.RequirementDetails,
		TargetDepartment:   r.TargetDepartment,
		Priority:           r.Priority,
	}
}

// NewRequest validates fields and builds a request in the raised state.
func NewRequest(f Fields, raisedBy bson.ObjectID, now time.Time) (*Request, error) {
	f = f.Normalize()
	if err := f.Validate(); err != nil {
		return nil, err
	}
	return &Request{
		ID:                 bson.NewObjectID(),
		ClientName:         f.ClientName,
		RequirementDetails: f.RequirementDetails,
		TargetDepartment:   f.TargetDepartment,
		Priority:           f.Priority,
		State:              StateRaised,
		RaisedBy:           raisedBy,
		Changelog:          []ChangeEntry{},
		StatusHistory:      []StatusEntry{{From: "", To: StateRaised, ChangedBy: &raisedBy, At: now}},
		PendingAcks:        []AckStage{},
		CreatedAt:          now,
		UpdatedAt:          now,
	}, nil
}

// JobCode returns the short product/job identifier printed on kiosk job cards.
func (r *Request) JobCode() string {
	hex := r.ID.Hex()
	return "TRK-" + strings.ToUpper(hex[len(hex)-jobCodeLen:])
}

// OnFloor reports whether the job has been passed to its department's kiosk queue.
func (r *Request) OnFloor() bool {
	return r.Timeline != nil && (r.State == StateInProgress || r.State == StateUpdated)
}

// AwaitingAck reports whether stage still has to acknowledge the latest edit.
func (r *Request) AwaitingAck(stage AckStage) bool {
	return slices.Contains(r.PendingAcks, stage)
}

// EditEvents counts distinct post-authorization edit actions in the changelog.
func (r *Request) EditEvents() int {
	seen := map[int64]bool{}
	for i := range r.Changelog {
		seen[r.Changelog[i].ChangedAt.UnixMilli()] = true
	}
	return len(seen)
}

// LastChange returns the most recent changelog entry, if any.
func (r *Request) LastChange() (ChangeEntry, bool) {
	if len(r.Changelog) == 0 {
		return ChangeEntry{}, false
	}
	return r.Changelog[len(r.Changelog)-1], true
}

func (r *Request) transition(to State, actor *bson.ObjectID, label string, now time.Time) {
	if r.State == to {
		return
	}
	r.StatusHistory = append(r.StatusHistory, StatusEntry{
		From: r.State, To: to, ChangedBy: actor, ActorLabel: label, At: now,
	})
	r.State = to
}

func (r *Request) addPendingAck(stage AckStage) {
	if !r.AwaitingAck(stage) {
		r.PendingAcks = append(r.PendingAcks, stage)
	}
}

func (r *Request) clearPendingAck(stage AckStage) bool {
	idx := slices.Index(r.PendingAcks, stage)
	if idx < 0 {
		return false
	}
	r.PendingAcks = slices.Delete(r.PendingAcks, idx, idx+1)
	return true
}
