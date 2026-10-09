package domain_test

import (
	"strings"
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/apperrors"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/domain"
)

// TestNCBPIncidentIsPrevented replays the PRD's railway-order incident at the
// rule level: a spec edit after the job reached Production must block the floor
// until both Logistics and the floor have acknowledged it.
func TestNCBPIncidentIsPrevented(t *testing.T) {
	coord, authz, logi := bson.NewObjectID(), bson.NewObjectID(), bson.NewObjectID()
	r, err := domain.NewRequest(baseFields(), coord, t0)
	if err != nil {
		t.Fatal(err)
	}
	if err := domain.Approve(r, authz, t0); err != nil {
		t.Fatal(err)
	}
	if _, err := domain.SetTimeline(r, t0.Add(72*time.Hour), logi, t0); err != nil {
		t.Fatal(err)
	}
	if err := domain.StartWork(r, t0); err != nil {
		t.Fatalf("job should be actionable before the edit: %v", err)
	}

	// Mid-flight spec change by the Authorizer.
	f := baseFields()
	f.RequirementDetails = "Brush holders, 42mm, grade EG-34"
	editAt := t0.Add(2 * time.Hour)
	if _, err := domain.ApplyEdit(r, f, authz, editAt); err != nil {
		t.Fatal(err)
	}
	if r.State != domain.StateUpdated || !r.AwaitingAck(domain.AckFloor) || !r.AwaitingAck(domain.AckLogistics) {
		t.Fatalf("edit must flag both downstream owners: state=%s pending=%v", r.State, r.PendingAcks)
	}
	last, _ := r.LastChange()
	if last.OldValue != "Brush holders, 40mm, grade EG-34" || last.NewValue != f.RequirementDetails {
		t.Fatalf("changelog must show exact before/after, got %+v", last)
	}

	// The floor cannot finish the job on the stale spec.
	err = domain.Complete(r, domain.FloorActor{Label: "Line 2"}, editAt)
	if !apperrors.HasCode(err, apperrors.CodeBlocked) || !strings.Contains(err.Error(), "Acknowledge") {
		t.Fatalf("complete must be blocked until acknowledged, got %v", err)
	}

	// Floor acknowledges; still waiting on Logistics to revise the timeline.
	if ok, err := domain.Acknowledge(r, domain.FloorActor{Label: "Line 2"}, editAt.Add(time.Minute)); !ok || err != nil {
		t.Fatalf("acknowledge: %v %v", ok, err)
	}
	if err := domain.StartWork(r, editAt); !apperrors.HasCode(err, apperrors.CodeBlocked) {
		t.Fatalf("must still wait for Logistics, got %v", err)
	}
	if r.FloorBlocker() != domain.MsgAwaitLogistics {
		t.Fatalf("blocker %q", r.FloorBlocker())
	}

	// Logistics revises the timeline, which settles the request.
	if _, err := domain.SetTimeline(r, t0.Add(96*time.Hour), logi, editAt.Add(time.Hour)); err != nil {
		t.Fatal(err)
	}
	if r.State != domain.StateInProgress || r.FloorBlocker() != "" {
		t.Fatalf("expected settled request, state=%s blocker=%q", r.State, r.FloorBlocker())
	}
	if err := domain.Complete(r, domain.FloorActor{Label: "Line 2"}, editAt.Add(2*time.Hour)); err != nil {
		t.Fatal(err)
	}
	if r.State != domain.StateCompleted || r.CompletedAt == nil {
		t.Fatalf("not completed: %s", r.State)
	}
	if _, err := domain.ApplyEdit(r, baseFields(), authz, editAt); !apperrors.HasCode(err, apperrors.CodeConflict) {
		t.Fatalf("completed request must not be editable, got %v", err)
	}
}

func TestAcknowledgeLabelIsTruncated(t *testing.T) {
	r := newApproved(t)
	_, _ = domain.SetTimeline(r, t0.Add(time.Hour*24), bson.NewObjectID(), t0)
	f := baseFields()
	f.Priority = domain.PriorityUrgent
	_, _ = domain.ApplyEdit(r, f, bson.NewObjectID(), t0)
	long := strings.Repeat("n", domain.ActorLabelMax+10)
	if ok, _ := domain.Acknowledge(r, domain.FloorActor{Label: long}, t0); !ok {
		t.Fatal("ack failed")
	}
	if len(r.AcknowledgedByLabel) != domain.ActorLabelMax {
		t.Fatalf("label len %d", len(r.AcknowledgedByLabel))
	}
}
