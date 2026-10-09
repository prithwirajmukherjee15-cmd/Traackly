package domain_test

import (
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/apperrors"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/domain"
)

func TestAssessRisk(t *testing.T) {
	r := newApproved(t)
	if domain.AssessRisk(r, t0).AtRisk {
		t.Fatal("fresh request should not be at risk")
	}
	f := baseFields()
	f.Priority = domain.PriorityUrgent
	_, _ = domain.ApplyEdit(r, f, bson.NewObjectID(), t0)
	f.ClientName = "Railway contractor B"
	_, _ = domain.ApplyEdit(r, f, bson.NewObjectID(), t0.Add(time.Minute))
	risk := domain.AssessRisk(r, t0.Add(49*time.Hour))
	if !risk.AtRisk || len(risk.Reasons) != 2 {
		t.Fatalf("want two reasons, got %+v", risk)
	}
	if domain.UnackedWindow(domain.DeptQA) != 24*time.Hour {
		t.Fatal("qa window")
	}
	d := newRaised(t)
	_ = domain.Decline(d, "x", bson.NewObjectID(), t0)
	if domain.AssessRisk(d, t0).AtRisk {
		t.Fatal("terminal request is never at risk")
	}
}

func TestValidatePassword(t *testing.T) {
	cases := []struct {
		pw, confirm string
		ok          bool
	}{
		{"password1", "password1", true},
		{"password", "password", false},
		{"pass1", "pass1", false},
		{"password1", "password2", false},
	}
	for _, c := range cases {
		err := domain.ValidatePassword(c.pw, c.confirm)
		if (err == nil) != c.ok {
			t.Errorf("%q/%q: err=%v", c.pw, c.confirm, err)
		}
	}
}

func TestNormalizeEmail(t *testing.T) {
	e, err := domain.NormalizeEmail("  Asha@NCBP.in ")
	if err != nil || e != "asha@ncbp.in" {
		t.Fatalf("got %q %v", e, err)
	}
	for _, bad := range []string{"", "asha", "@ncbp.in", "asha@ncbp", "asha@ncbp.", "a b@c.in"} {
		if _, err := domain.NormalizeEmail(bad); !apperrors.HasCode(err, apperrors.CodeValidation) {
			t.Errorf("%q should be invalid", bad)
		}
	}
}

func TestNewInvitedUser(t *testing.T) {
	by := bson.NewObjectID()
	u, err := domain.NewInvitedUser(domain.Invite{
		Name: "Ravi", Email: "Ravi@ncbp.in", Role: domain.RoleFloorSupervisor, Department: domain.DeptQA,
	}, by, t0)
	if err != nil || u.Status != domain.UserInvited || *u.Department != domain.DeptQA || u.Email != "ravi@ncbp.in" {
		t.Fatalf("got %+v %v", u, err)
	}
	bad := []domain.Invite{
		{Name: "Ravi", Email: "bad", Role: domain.RoleCoordinator},
		{Name: "R", Email: "r@ncbp.in", Role: domain.RoleCoordinator},
		{Name: "Ravi", Email: "r@ncbp.in", Role: "boss"},
		{Name: "Ravi", Email: "r@ncbp.in", Role: domain.RoleFloorSupervisor},
	}
	for _, in := range bad {
		if _, err := domain.NewInvitedUser(in, by, t0); !apperrors.HasCode(err, apperrors.CodeValidation) {
			t.Errorf("%+v should be invalid, got %v", in, err)
		}
	}
	c, _ := domain.NewInvitedUser(domain.Invite{Name: "Meera", Email: "m@ncbp.in", Role: domain.RoleCoordinator}, by, t0)
	if c.Department != nil {
		t.Fatal("coordinator must not have a department")
	}
}
