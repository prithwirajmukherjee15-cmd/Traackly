package domain

import (
	"strings"
	"time"
	"unicode/utf8"

	"go.mongodb.org/mongo-driver/v2/bson"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/apperrors"
)

// Messages shown when the acknowledgment gate refuses an action.
const (
	MsgAcknowledgeFirst = "Acknowledge the recent change before marking this done"
	MsgAwaitLogistics   = "Waiting for Logistics to confirm the revised timeline"
	msgNotOnFloor       = "This job is not active on the floor"
)

// FloorActor identifies who acted at a kiosk: a logged-in supervisor, or a station plus an optional name tap.
type FloorActor struct {
	UserID *bson.ObjectID
	Label  string
}

func (a FloorActor) label() string {
	l := strings.TrimSpace(a.Label)
	if utf8.RuneCountInString(l) > ActorLabelMax {
		l = string([]rune(l)[:ActorLabelMax])
	}
	return l
}

// SetTimeline sets or revises the Logistics estimate (PRD Story 4).
//
// Saving the timeline is also Logistics' acknowledgment of a pending edit. It
// reports whether that acknowledgment cleared a flag.
func SetTimeline(r *Request, estimate time.Time, actor bson.ObjectID, now time.Time) (bool, error) {
	if r.State != StateInProgress && r.State != StateUpdated {
		return false, apperrors.NewConflict("A timeline can only be set on an authorized, open request")
	}
	if !estimate.After(now) {
		return false, apperrors.NewValidation("Timeline must be a valid future date",
			map[string]string{"estimate": "Timeline must be a valid future date"})
	}
	r.Timeline = &Timeline{Estimate: estimate, SetBy: actor, SetAt: now}
	cleared := r.clearPendingAck(AckLogistics)
	if cleared {
		r.AcknowledgedBy, r.AcknowledgedByLabel, r.AcknowledgedAt = &actor, "", &now
	}
	r.settleIfAcknowledged(&actor, "", now)
	return cleared, nil
}

// Acknowledge clears the floor's pending acknowledgment (PRD Story 6).
//
// It is idempotent: acknowledging when nothing is pending reports false with no
// error, so a queued offline retry reconciles silently with the server state.
func Acknowledge(r *Request, actor FloorActor, now time.Time) (bool, error) {
	if r.State.IsTerminal() {
		return false, nil
	}
	if !r.clearPendingAck(AckFloor) {
		return false, nil
	}
	r.AcknowledgedBy, r.AcknowledgedByLabel, r.AcknowledgedAt = actor.UserID, actor.label(), &now
	r.settleIfAcknowledged(actor.UserID, actor.label(), now)
	return true, nil
}

// FloorBlocker returns why floor execution is blocked, or "" when the job is actionable.
func (r *Request) FloorBlocker() string {
	switch {
	case r.AwaitingAck(AckFloor):
		return MsgAcknowledgeFirst
	case r.AwaitingAck(AckLogistics):
		return MsgAwaitLogistics
	default:
		return ""
	}
}

func (r *Request) checkFloorActionable() error {
	if !r.OnFloor() {
		return apperrors.NewConflict(msgNotOnFloor)
	}
	if msg := r.FloorBlocker(); msg != "" {
		return apperrors.NewBlocked(msg)
	}
	return nil
}

// StartWork marks a job as in progress on the floor, gated on acknowledgment.
func StartWork(r *Request, now time.Time) error {
	if err := r.checkFloorActionable(); err != nil {
		return err
	}
	if r.WorkStartedAt == nil {
		r.WorkStartedAt = &now
	}
	return nil
}

// Complete marks a job done, gated on acknowledgment. Completed is terminal.
func Complete(r *Request, actor FloorActor, now time.Time) error {
	if err := r.checkFloorActionable(); err != nil {
		return err
	}
	if r.WorkStartedAt == nil {
		r.WorkStartedAt = &now
	}
	r.CompletedAt = &now
	r.transition(StateCompleted, actor.UserID, actor.label(), now)
	return nil
}
