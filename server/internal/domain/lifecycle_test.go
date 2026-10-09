package domain_test

import (
	"strings"
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/apperrors"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/domain"
)

var t0 = time.Date(2026, 8, 1, 9, 0, 0, 0, time.UTC)

func baseFields() domain.Fields {
	return domain.Fields{
		ClientName:         "Railway contractor",
		RequirementDetails: "Brush holders, 40mm, grade EG-34",
		TargetDepartment:   domain.DeptProduction,
	}
}

func newRaised(t *testing.T) *domain.Request {
	t.Helper()
	r, err := domain.NewRequest(baseFields(), bson.NewObjectID(), t0)
	if err != nil {
		t.Fatalf("NewRequest: %v", err)
	}
	return r
}

func newApproved(t *testing.T) *domain.Request {
	t.Helper()
	r := newRaised(t)
	if err := domain.Approve(r, bson.NewObjectID(), t0); err != nil {
		t.Fatalf("Approve: %v", err)
	}
	return r
}

func TestNewRequestDefaultsAndValidation(t *testing.T) {
	r := newRaised(t)
	if r.State != domain.StateRaised || r.Priority != domain.PriorityNormal {
		t.Fatalf("unexpected defaults: %s %s", r.State, r.Priority)
	}
	if !strings.HasPrefix(r.JobCode(), "TRK-") || len(r.JobCode()) != 10 {
		t.Fatalf("job code %q", r.JobCode())
	}
	_, err := domain.NewRequest(domain.Fields{Priority: "low"}, bson.NewObjectID(), t0)
	ae, ok := apperrors.As(err)
	if !ok || ae.Code != apperrors.CodeValidation {
		t.Fatalf("want validation error, got %v", err)
	}
	for _, f := range []string{"clientName", "requirementDetails", "targetDepartment", "priority"} {
		if ae.Fields[f] == "" {
			t.Errorf("missing field error for %s", f)
		}
	}
	long := baseFields()
	long.ClientName = "x"
	long.RequirementDetails = strings.Repeat("a", domain.RequirementMax+1)
	_, err = domain.NewRequest(long, bson.NewObjectID(), t0)
	ae, _ = apperrors.As(err)
	if ae == nil || ae.Fields["clientName"] == "" || ae.Fields["requirementDetails"] == "" {
		t.Fatalf("want length errors, got %v", err)
	}
}

func TestApproveAndDecline(t *testing.T) {
	r := newApproved(t)
	if r.State != domain.StateInProgress || len(r.StatusHistory) != 3 {
		t.Fatalf("approve: state %s history %d", r.State, len(r.StatusHistory))
	}
	if err := domain.Approve(r, bson.NewObjectID(), t0); !apperrors.HasCode(err, apperrors.CodeConflict) {
		t.Fatalf("double approve should conflict, got %v", err)
	}
	if err := domain.Decline(r, "no", bson.NewObjectID(), t0); !apperrors.HasCode(err, apperrors.CodeConflict) {
		t.Fatalf("decline after approve should conflict, got %v", err)
	}
	d := newRaised(t)
	if err := domain.Decline(d, "   ", bson.NewObjectID(), t0); !apperrors.HasCode(err, apperrors.CodeValidation) {
		t.Fatalf("empty reason should fail validation, got %v", err)
	}
	if err := domain.Decline(d, " Out of capacity ", bson.NewObjectID(), t0); err != nil {
		t.Fatal(err)
	}
	if d.State != domain.StateDeclined || *d.DeclineReason != "Out of capacity" {
		t.Fatalf("decline: %s %v", d.State, d.DeclineReason)
	}
	if _, err := domain.ApplyEdit(d, baseFields(), bson.NewObjectID(), t0); !apperrors.HasCode(err, apperrors.CodeConflict) {
		t.Fatalf("editing declined request should conflict, got %v", err)
	}
}

func TestEditRaisedRequestCreatesNoChangelog(t *testing.T) {
	r := newRaised(t)
	f := baseFields()
	f.RequirementDetails = "Brush holders, 42mm"
	res, err := domain.ApplyEdit(r, f, bson.NewObjectID(), t0)
	if err != nil {
		t.Fatal(err)
	}
	if !res.Changed || res.Flagged || len(r.Changelog) != 0 || r.State != domain.StateRaised {
		t.Fatalf("raised edit: %+v changelog=%d state=%s", res, len(r.Changelog), r.State)
	}
}

func TestEditPostAuthorizationFlagsAndLogsEachField(t *testing.T) {
	r := newApproved(t)
	actor := bson.NewObjectID()
	f := baseFields()
	f.RequirementDetails = "Brush holders, 42mm, grade EG-34"
	f.Priority = domain.PriorityUrgent
	edited := t0.Add(time.Hour)
	res, err := domain.ApplyEdit(r, f, actor, edited)
	if err != nil {
		t.Fatal(err)
	}
	if !res.Flagged || len(res.Entries) != 2 || len(r.Changelog) != 2 {
		t.Fatalf("want 2 changelog entries, got %+v / %d", res, len(r.Changelog))
	}
	e := r.Changelog[0]
	if e.Field != domain.FieldRequirementDetails || e.OldValue != "Brush holders, 40mm, grade EG-34" ||
		e.NewValue != f.RequirementDetails || e.ChangedBy != actor || !e.ChangedAt.Equal(edited) {
		t.Fatalf("bad entry %+v", e)
	}
	if r.State != domain.StateUpdated {
		t.Fatalf("state %s", r.State)
	}
	// No timeline yet: only Logistics has received the request.
	if !r.AwaitingAck(domain.AckLogistics) || r.AwaitingAck(domain.AckFloor) {
		t.Fatalf("pending acks %v", r.PendingAcks)
	}
	noop, err := domain.ApplyEdit(r, f, actor, edited)
	if err != nil || noop.Changed || len(r.Changelog) != 2 {
		t.Fatalf("identical edit should be a no-op: %+v %v", noop, err)
	}
}

func TestEditRecordsDepartmentReroute(t *testing.T) {
	r := newApproved(t)
	f := baseFields()
	f.TargetDepartment = domain.DeptQA
	res, err := domain.ApplyEdit(r, f, bson.NewObjectID(), t0)
	if err != nil {
		t.Fatal(err)
	}
	if res.PreviousDepartment != domain.DeptProduction || r.TargetDepartment != domain.DeptQA {
		t.Fatalf("reroute %+v", res)
	}
}

func TestSetTimeline(t *testing.T) {
	r := newRaised(t)
	if _, err := domain.SetTimeline(r, t0.Add(time.Hour), bson.NewObjectID(), t0); !apperrors.HasCode(err, apperrors.CodeConflict) {
		t.Fatalf("timeline on raised should conflict, got %v", err)
	}
	r = newApproved(t)
	if _, err := domain.SetTimeline(r, t0.Add(-time.Hour), bson.NewObjectID(), t0); !apperrors.HasCode(err, apperrors.CodeValidation) {
		t.Fatalf("past date should fail, got %v", err)
	}
	cleared, err := domain.SetTimeline(r, t0.Add(48*time.Hour), bson.NewObjectID(), t0)
	if err != nil || cleared || !r.OnFloor() {
		t.Fatalf("first timeline: cleared=%v err=%v onFloor=%v", cleared, err, r.OnFloor())
	}
}

func TestEditBeforeTimelineIsSettledByLogistics(t *testing.T) {
	r := newApproved(t)
	f := baseFields()
	f.ClientName = "Railway contractor (East)"
	if _, err := domain.ApplyEdit(r, f, bson.NewObjectID(), t0); err != nil {
		t.Fatal(err)
	}
	logi := bson.NewObjectID()
	cleared, err := domain.SetTimeline(r, t0.Add(24*time.Hour), logi, t0)
	if err != nil || !cleared {
		t.Fatalf("cleared=%v err=%v", cleared, err)
	}
	if r.State != domain.StateInProgress || len(r.PendingAcks) != 0 || *r.AcknowledgedBy != logi {
		t.Fatalf("state %s pending %v", r.State, r.PendingAcks)
	}
}

func TestAcknowledgeIsIdempotentAndIgnoresTerminal(t *testing.T) {
	r := newApproved(t)
	ok, err := domain.Acknowledge(r, domain.FloorActor{Label: "Asha"}, t0)
	if ok || err != nil {
		t.Fatalf("nothing pending: ok=%v err=%v", ok, err)
	}
	d := newRaised(t)
	_ = domain.Decline(d, "dup", bson.NewObjectID(), t0)
	if ok, _ := domain.Acknowledge(d, domain.FloorActor{}, t0); ok {
		t.Fatal("terminal request should not acknowledge")
	}
}

func TestFloorActionsRequireJobOnFloor(t *testing.T) {
	r := newApproved(t)
	if err := domain.StartWork(r, t0); !apperrors.HasCode(err, apperrors.CodeConflict) {
		t.Fatalf("no timeline: want conflict, got %v", err)
	}
	if err := domain.Complete(r, domain.FloorActor{}, t0); !apperrors.HasCode(err, apperrors.CodeConflict) {
		t.Fatalf("no timeline: want conflict, got %v", err)
	}
}

func TestStateHelpers(t *testing.T) {
	if !domain.StateUpdated.Valid() || domain.State("x").Valid() {
		t.Fatal("State.Valid")
	}
	if !domain.RoleLogistics.Valid() || domain.Role("x").Valid() {
		t.Fatal("Role.Valid")
	}
	names := map[domain.Department]string{
		domain.DeptProduction: "Production", domain.DeptSupply: "Supply", domain.DeptQA: "QA", "x": "x",
	}
	for d, want := range names {
		if d.DisplayName() != want {
			t.Errorf("%s display %s", d, d.DisplayName())
		}
	}
	if len(domain.AllDepartments()) != 3 {
		t.Fatal("AllDepartments")
	}
	if _, ok := (&domain.Request{}).LastChange(); ok {
		t.Fatal("empty LastChange")
	}
}
