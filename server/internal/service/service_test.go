package service_test

import (
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/domain"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/service"
)

func approvedRequest(t *testing.T, dept domain.Department, raisedBy bson.ObjectID) *domain.Request {
	t.Helper()
	now := time.Now()
	r, err := domain.NewRequest(domain.Fields{ClientName: "Kirloskar", RequirementDetails: "Slip rings", TargetDepartment: dept}, raisedBy, now)
	if err != nil {
		t.Fatal(err)
	}
	if err := domain.Approve(r, bson.NewObjectID(), now); err != nil {
		t.Fatal(err)
	}
	return r
}

func TestNextOwners(t *testing.T) {
	r := approvedRequest(t, domain.DeptSupply, bson.NewObjectID())
	if got := service.NextOwners(r); got != "the next owner" {
		t.Fatalf("no pending acks: %q", got)
	}
	r.PendingAcks = []domain.AckStage{domain.AckLogistics}
	if got := service.NextOwners(r); got != "Logistics" {
		t.Fatalf("logistics only: %q", got)
	}
	r.PendingAcks = append(r.PendingAcks, domain.AckFloor)
	if got := service.NextOwners(r); got != "Logistics and the Supply floor" {
		t.Fatalf("both: %q", got)
	}
}

func TestCanView(t *testing.T) {
	coord := bson.NewObjectID()
	r := approvedRequest(t, domain.DeptQA, coord)
	cases := []struct {
		name  string
		actor service.Actor
		want  bool
	}{
		{"owner coordinator", service.Actor{UserID: coord, Role: domain.RoleCoordinator}, true},
		{"other coordinator", service.Actor{UserID: bson.NewObjectID(), Role: domain.RoleCoordinator}, false},
		{"authorizer", service.Actor{Role: domain.RoleAuthorizer}, true},
		{"logistics after authorization", service.Actor{Role: domain.RoleLogistics}, true},
		{"station before timeline", service.Actor{Station: true, Department: domain.DeptQA}, false},
		{"unknown role", service.Actor{Role: "guest"}, false},
	}
	for _, c := range cases {
		if got := service.CanView(&c.actor, r); got != c.want {
			t.Errorf("%s: got %v", c.name, got)
		}
	}
	r.Timeline = &domain.Timeline{Estimate: time.Now().Add(time.Hour)}
	if !service.CanView(&service.Actor{Station: true, Department: domain.DeptQA}, r) {
		t.Fatal("station sees scheduled job in its department")
	}
	if service.CanView(&service.Actor{Station: true, Department: domain.DeptSupply}, r) {
		t.Fatal("station must not see other departments")
	}
	raised := approvedRequest(t, domain.DeptQA, coord)
	raised.State = domain.StateRaised
	if service.CanView(&service.Actor{Role: domain.RoleLogistics}, raised) {
		t.Fatal("logistics must not see raised requests")
	}
	if !(&service.Actor{Role: domain.RoleFloorSupervisor}).IsFloor() {
		t.Fatal("IsFloor")
	}
}
