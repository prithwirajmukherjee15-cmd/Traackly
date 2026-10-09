package service

import (
	"context"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/apperrors"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/domain"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/store"
)

// List views.
const (
	ViewPending    = "pending"
	ViewAuthorized = "authorized"
	ViewScheduled  = "scheduled"
	msgNotFound    = "Request not found"
)

// ListParams selects a role-scoped request listing.
type ListParams struct {
	View  string
	State domain.State
}

// EditInput carries new field values and the client's last-seen updatedAt.
type EditInput struct {
	Fields   domain.Fields
	Expected *time.Time
}

// CanView reports whether a may see r. Unauthorized reads surface as 404, never 403.
func CanView(a *Actor, r *domain.Request) bool {
	if a.IsFloor() {
		return r.TargetDepartment == a.Department && r.Timeline != nil &&
			(r.OnFloor() || r.State == domain.StateCompleted)
	}
	switch a.Role {
	case domain.RoleCoordinator:
		return r.RaisedBy == a.UserID
	case domain.RoleAuthorizer:
		return true
	case domain.RoleLogistics:
		return r.State.IsPostAuthorization() || r.State == domain.StateCompleted
	default:
		return false
	}
}

// GetRequest loads a request the actor may see.
func (s *Service) GetRequest(ctx context.Context, a *Actor, id bson.ObjectID) (*domain.Request, error) {
	r, err := s.d.Store.GetRequest(ctx, id)
	if err != nil {
		return nil, err
	}
	if !CanView(a, r) {
		return nil, apperrors.NewNotFound(msgNotFound)
	}
	return r, nil
}

// ListRequests returns the actor's role-scoped listing.
func (s *Service) ListRequests(ctx context.Context, a *Actor, p ListParams) ([]domain.Request, error) {
	q := &store.RequestQuery{}
	switch a.Role {
	case domain.RoleCoordinator:
		q.RaisedBy = &a.UserID
		if p.State.Valid() {
			q.States = []domain.State{p.State}
		}
	case domain.RoleAuthorizer:
		switch p.View {
		case ViewPending:
			q.States = []domain.State{domain.StateRaised}
		case ViewAuthorized:
			q.States = []domain.State{domain.StateAuthorization, domain.StateInProgress, domain.StateUpdated, domain.StateCompleted}
		default:
		}
	case domain.RoleLogistics:
		if p.View == ViewScheduled {
			q.States = []domain.State{domain.StateInProgress, domain.StateUpdated, domain.StateCompleted}
			q.OnFloor = true
		} else {
			q.States = []domain.State{domain.StateInProgress, domain.StateUpdated}
			q.LogisticsQueue = true
		}
	default:
		return nil, apperrors.NewForbidden("Not available for this role")
	}
	return s.d.Store.ListRequests(ctx, q)
}

// CreateRequest raises a new request (Story 1).
func (s *Service) CreateRequest(ctx context.Context, a *Actor, f domain.Fields) (*domain.Request, error) {
	r, err := domain.NewRequest(f, a.UserID, s.d.Store.Now())
	if err != nil {
		return nil, err
	}
	if err := s.d.Store.InsertRequest(ctx, r); err != nil {
		return nil, err
	}
	s.publish(ctx, r, "")
	return r, nil
}

// ApproveRequest optionally applies pre-approval edits, then authorizes the request (Story 2).
func (s *Service) ApproveRequest(ctx context.Context, a *Actor, id bson.ObjectID, in *EditInput) (*domain.Request, error) {
	r, err := s.d.Store.MutateRequest(ctx, id, in.Expected, func(r *domain.Request, now time.Time) error {
		if in.Fields != (domain.Fields{}) {
			if _, err := domain.ApplyEdit(r, in.Fields, a.UserID, now); err != nil {
				return err
			}
		}
		return domain.Approve(r, a.UserID, now)
	})
	if err != nil {
		return nil, err
	}
	s.publish(ctx, r, "")
	s.background(ctx, func(ctx context.Context) { s.notifyAuthorized(ctx, r) })
	return r, nil
}

// DeclineInput carries the mandatory reason and the client's last-seen updatedAt.
type DeclineInput struct {
	Reason   string
	Expected *time.Time
}

// DeclineRequest ends a raised request with a reason.
func (s *Service) DeclineRequest(ctx context.Context, a *Actor, id bson.ObjectID, in *DeclineInput) (*domain.Request, error) {
	r, err := s.d.Store.MutateRequest(ctx, id, in.Expected, func(r *domain.Request, now time.Time) error {
		return domain.Decline(r, in.Reason, a.UserID, now)
	})
	if err != nil {
		return nil, err
	}
	s.publish(ctx, r, "")
	s.background(ctx, func(ctx context.Context) { s.notifyDeclined(ctx, r) })
	return r, nil
}

// EditRequest saves field changes; post-authorization this triggers the core mechanic (Story 3).
func (s *Service) EditRequest(ctx context.Context, a *Actor, id bson.ObjectID, in *EditInput) (*domain.Request, domain.EditResult, error) {
	var res domain.EditResult
	r, err := s.d.Store.MutateRequest(ctx, id, in.Expected, func(r *domain.Request, now time.Time) error {
		var err error
		res, err = domain.ApplyEdit(r, in.Fields, a.UserID, now)
		return err
	})
	if err != nil {
		return nil, res, err
	}
	s.publish(ctx, r, res.PreviousDepartment)
	if res.Flagged {
		s.background(ctx, func(ctx context.Context) { s.notifyUpdated(ctx, r, res.Entries) })
	}
	return r, res, nil
}

// SetTimeline sets or revises the Logistics estimate (Story 4); it doubles as Logistics' acknowledgment.
func (s *Service) SetTimeline(ctx context.Context, a *Actor, id bson.ObjectID, estimate time.Time) (*domain.Request, error) {
	r, err := s.GetRequest(ctx, a, id)
	if err != nil {
		return nil, err
	}
	r, err = s.d.Store.MutateRequest(ctx, r.ID, nil, func(r *domain.Request, now time.Time) error {
		_, err := domain.SetTimeline(r, estimate, a.UserID, now)
		return err
	})
	if err != nil {
		return nil, err
	}
	s.publish(ctx, r, "")
	return r, nil
}

// FloorAction is a kiosk action on a job.
type FloorAction string

// Kiosk actions.
const (
	FloorAcknowledge FloorAction = "acknowledge"
	FloorStart       FloorAction = "start"
	FloorComplete    FloorAction = "complete"
)

// FloorInput is a kiosk action plus an optional name/badge tap for attribution.
type FloorInput struct {
	Action FloorAction
	Label  string
}

// Floor performs a kiosk action, enforcing department scope and the acknowledgment gate (Stories 5-6).
func (s *Service) Floor(ctx context.Context, a *Actor, id bson.ObjectID, in FloorInput) (*domain.Request, error) {
	if _, err := s.GetRequest(ctx, a, id); err != nil {
		return nil, err
	}
	fa := a.floorActor(strings.TrimSpace(in.Label))
	r, err := s.d.Store.MutateRequest(ctx, id, nil, func(r *domain.Request, now time.Time) error {
		switch in.Action {
		case FloorAcknowledge:
			_, err := domain.Acknowledge(r, fa, now)
			return err
		case FloorStart:
			return domain.StartWork(r, now)
		case FloorComplete:
			return domain.Complete(r, fa, now)
		default:
			return apperrors.NewClient("Unknown action")
		}
	})
	if err != nil {
		return nil, err
	}
	s.publish(ctx, r, "")
	return r, nil
}

// KioskQueue lists the department's active jobs (S-40).
func (s *Service) KioskQueue(ctx context.Context, a *Actor) ([]domain.Request, error) {
	return s.d.Store.ListRequests(ctx, &store.RequestQuery{
		Department: a.Department,
		States:     []domain.State{domain.StateInProgress, domain.StateUpdated},
		OnFloor:    true,
	})
}
