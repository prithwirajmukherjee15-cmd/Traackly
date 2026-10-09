// Package service orchestrates domain rules, persistence, real-time events and
// notifications. HTTP handlers call this package; they never mutate data directly.
package service

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/auth"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/domain"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/notify"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/realtime"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/store"
)

const backgroundTimeout = 30 * time.Second

// Deps are the Service's collaborators.
type Deps struct {
	Store          *store.Store
	Hub            *realtime.Hub
	Mailer         notify.Mailer
	Issuer         *auth.Issuer
	Hasher         *auth.Hasher
	Limiter        *auth.Limiter
	Logger         *slog.Logger
	BaseURL        string
	ExposeDevLinks bool
	// Async sends notifications in the background. Tests run them inline.
	Async bool
}

// Service implements Traackly's use cases.
type Service struct {
	d  Deps
	wg sync.WaitGroup
}

// New builds a Service.
func New(d *Deps) *Service {
	return &Service{d: *d}
}

// Store exposes the underlying store for read-only helpers such as name resolution.
func (s *Service) Store() *store.Store { return s.d.Store }

// Hub exposes the real-time hub.
func (s *Service) Hub() *realtime.Hub { return s.d.Hub }

// Issuer exposes the JWT issuer (for cookie lifetimes).
func (s *Service) Issuer() *auth.Issuer { return s.d.Issuer }

// Wait blocks until background notification work finishes.
func (s *Service) Wait() { s.wg.Wait() }

// Actor is the authenticated caller: a staff user, or a kiosk station.
type Actor struct {
	UserID     bson.ObjectID
	Name       string
	Role       domain.Role
	Department domain.Department
	// Station is true for a department-stationed kiosk authenticated by station token.
	Station bool
}

// IsFloor reports whether the actor operates a department kiosk.
func (a *Actor) IsFloor() bool {
	return a.Station || a.Role == domain.RoleFloorSupervisor
}

func (a *Actor) floorActor(label string) domain.FloorActor {
	if a.Station {
		return domain.FloorActor{Label: label}
	}
	id := a.UserID
	if label == "" {
		label = a.Name
	}
	return domain.FloorActor{UserID: &id, Label: label}
}

func (s *Service) background(ctx context.Context, fn func(ctx context.Context)) {
	run := func() {
		bg, cancel := context.WithTimeout(context.WithoutCancel(ctx), backgroundTimeout)
		defer cancel()
		fn(bg)
	}
	if !s.d.Async {
		run()
		return
	}
	s.wg.Go(run)
}

func (s *Service) publish(ctx context.Context, r *domain.Request, prevDept domain.Department) {
	channels := []string{realtime.ChanAuthorizer, realtime.ChanCoordinator(r.RaisedBy)}
	if r.State.IsPostAuthorization() || r.State == domain.StateCompleted {
		channels = append(channels, realtime.ChanLogistics)
	}
	if r.Timeline != nil {
		channels = append(channels, realtime.ChanDepartment(r.TargetDepartment))
	}
	if prevDept != "" {
		channels = append(channels, realtime.ChanDepartment(prevDept))
	}
	ev := realtime.Event{Type: realtime.EventRequestChanged, RequestID: r.ID.Hex()}
	if err := s.d.Hub.Publish(ev, channels...); err != nil {
		s.d.Logger.ErrorContext(ctx, "publish failed", "error", err)
	}
}

// delivery is one notification fan-out.
type delivery struct {
	req     *domain.Request
	trigger domain.TriggerEvent
	to      []domain.User
	msg     notify.Message
}

// deliver records and sends one notification per recipient, logging every outcome.
func (s *Service) deliver(ctx context.Context, d *delivery) {
	r, to, msg := d.req, d.to, d.msg
	for i := range to {
		n := &domain.Notification{
			ID: bson.NewObjectID(), RequestID: r.ID, RecipientID: to[i].ID, Channel: "email",
			Status: domain.NotifyPending, TriggerEvent: d.trigger, CreatedAt: s.d.Store.Now(),
		}
		if err := s.d.Store.InsertNotification(ctx, n); err != nil {
			s.d.Logger.ErrorContext(ctx, "record notification failed", "error", err)
			continue
		}
		m := msg
		m.To = to[i].Email
		sendErr := s.d.Mailer.Send(ctx, m)
		if sendErr != nil {
			s.d.Logger.WarnContext(ctx, "notification send failed", "error", sendErr, "requestId", r.ID.Hex())
		}
		if err := s.d.Store.MarkNotification(ctx, n.ID, sendErr); err != nil {
			s.d.Logger.ErrorContext(ctx, "mark notification failed", "error", err)
		}
	}
}

func (s *Service) sendMail(ctx context.Context, m notify.Message) {
	s.background(ctx, func(ctx context.Context) {
		if err := s.d.Mailer.Send(ctx, m); err != nil {
			s.d.Logger.WarnContext(ctx, "email send failed", "error", err, "subject", m.Subject)
		}
	})
}

func (s *Service) devLink(link string) string {
	if s.d.ExposeDevLinks {
		return link
	}
	return ""
}
