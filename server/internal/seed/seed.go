// Package seed creates the bootstrap Authorizer and optional demo data.
package seed

import (
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/auth"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/domain"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/store"
)

// DemoPassword is the password given to every demo account.
const DemoPassword = "traackly123"

const demoLeadDays = 5

// Account is a user to create directly in the active state (bypassing the invite flow).
type Account struct {
	Name       string
	Email      string
	Password   string
	Role       domain.Role
	Department domain.Department
}

// EnsureAccount creates an active user if the email is not taken, returning the user either way.
func EnsureAccount(ctx context.Context, st *store.Store, h *auth.Hasher, acc *Account) (*domain.User, error) {
	if u, err := st.UserByEmail(ctx, acc.Email); err == nil {
		return u, nil
	} else if !store.IsNotFound(err) {
		return nil, err
	}
	hash, err := h.Hash(acc.Password)
	if err != nil {
		return nil, err
	}
	now := st.Now()
	u := &domain.User{
		ID: bson.NewObjectID(), Name: acc.Name, Email: acc.Email, PasswordHash: &hash, Role: acc.Role,
		Status: domain.UserActive, InvitedAt: &now, ActivatedAt: &now, CreatedAt: now, UpdatedAt: now,
	}
	if acc.Department != "" {
		d := acc.Department
		u.Department = &d
	}
	if err := st.InsertUser(ctx, u); err != nil {
		return nil, err
	}
	return u, nil
}

// Demo creates one account per role plus requests in every lifecycle state,
// including a replay of the NCBP railway order with an unacknowledged spec change.
func Demo(ctx context.Context, st *store.Store, h *auth.Hasher, authorizer *domain.User) error {
	people := map[domain.Role]*domain.User{domain.RoleAuthorizer: authorizer}
	accounts := []Account{
		{Name: "Meera Iyer", Email: "coordinator@traackly.demo", Role: domain.RoleCoordinator},
		{Name: "Arjun Rao", Email: "logistics@traackly.demo", Role: domain.RoleLogistics},
		{Name: "Sunil Patil", Email: "floor@traackly.demo", Role: domain.RoleFloorSupervisor, Department: domain.DeptProduction},
	}
	for i := range accounts {
		accounts[i].Password = DemoPassword
		u, err := EnsureAccount(ctx, st, h, &accounts[i])
		if err != nil {
			return err
		}
		people[u.Role] = u
	}
	existing, err := st.ListRequests(ctx, &store.RequestQuery{RaisedBy: &people[domain.RoleCoordinator].ID})
	if err != nil || len(existing) > 0 {
		return err
	}
	demos := demoRequests()
	for i := range demos {
		d := &demos[i]
		if err := createDemo(ctx, st, people, d); err != nil {
			return fmt.Errorf("demo %q: %w", d.fields.ClientName, err)
		}
	}
	return nil
}

type demoStage int

const (
	stageRaised demoStage = iota
	stageApproved
	stageScheduled
	stageEditedOnFloor
	stageDeclined
	stageCompleted
)

type demoRequest struct {
	fields domain.Fields
	stage  demoStage
	edit   string
}

func demoRequests() []demoRequest {
	f := func(client, details string, dept domain.Department, p domain.Priority) domain.Fields {
		return domain.Fields{ClientName: client, RequirementDetails: details, TargetDepartment: dept, Priority: p}
	}
	return []demoRequest{
		{
			fields: f("Indian Railways \u2014 Central Workshop", "Brush holders BH-40, 40mm, carbon grade EG-34. Qty 120. Spring pressure 1.8 N/cm\u00b2.", domain.DeptProduction, domain.PriorityUrgent),
			stage:  stageEditedOnFloor, edit: "Brush holders BH-42, 42mm, carbon grade EG-34. Qty 120. Spring pressure 1.8 N/cm\u00b2.",
		},
		{fields: f("Kirloskar Motors", "Slip rings SR-110, bronze, 110mm OD. Qty 40.", domain.DeptProduction, domain.PriorityNormal), stage: stageScheduled},
		{fields: f("Tata Steel Jamshedpur", "Commutators CM-75 for DC traction motors. Qty 12. Mica undercut 1.2mm.", domain.DeptQA, domain.PriorityNormal), stage: stageApproved},
		{fields: f("BHEL Haridwar", "Carbon brushes EG-367, 25\u00d732\u00d750mm, pigtail 120mm. Qty 600.", domain.DeptSupply, domain.PriorityUrgent), stage: stageRaised},
		{fields: f("Siemens Kalwa", "Brush holder springs, constant-force, 2.2 N. Qty 300.", domain.DeptSupply, domain.PriorityNormal), stage: stageRaised},
		{fields: f("Crompton Greaves", "Sample batch, graphite plates 5mm.", domain.DeptQA, domain.PriorityNormal), stage: stageDeclined},
		{fields: f("L&T Hazira", "Slip ring assembly SRA-6, 6 rings, 80mm bore. Qty 4.", domain.DeptProduction, domain.PriorityNormal), stage: stageCompleted},
	}
}

func createDemo(ctx context.Context, st *store.Store, people map[domain.Role]*domain.User, d *demoRequest) error {
	r, err := domain.NewRequest(d.fields, people[domain.RoleCoordinator].ID, st.Now())
	if err != nil {
		return err
	}
	if err := st.InsertRequest(ctx, r); err != nil {
		return err
	}
	if d.stage == stageRaised {
		return nil
	}
	authz, logi := people[domain.RoleAuthorizer].ID, people[domain.RoleLogistics].ID
	_, err = st.MutateRequest(ctx, r.ID, nil, func(r *domain.Request, now time.Time) error {
		if d.stage == stageDeclined {
			return domain.Decline(r, "We don't stock this grade \u2014 please raise with the supplier spec sheet.", authz, now)
		}
		if err := domain.Approve(r, authz, now); err != nil || d.stage == stageApproved {
			return err
		}
		if _, err := domain.SetTimeline(r, now.Add(demoLeadDays*24*time.Hour), logi, now); err != nil {
			return err
		}
		return advanceDemo(r, d, authz, now)
	})
	return err
}

func advanceDemo(r *domain.Request, d *demoRequest, authz bson.ObjectID, now time.Time) error {
	switch d.stage {
	case stageEditedOnFloor:
		f := r.Fields()
		f.RequirementDetails = d.edit
		_, err := domain.ApplyEdit(r, f, authz, now)
		return err
	case stageCompleted:
		return domain.Complete(r, domain.FloorActor{Label: "Sunil Patil"}, now)
	case stageRaised, stageApproved, stageScheduled, stageDeclined:
		return nil
	default:
		return nil
	}
}
