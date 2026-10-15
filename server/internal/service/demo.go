package service

import (
	"context"
	"time"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/apperrors"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/domain"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/realtime"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/seed"
)

const (
	msgDemoOff           = "Not found"
	msgDemoRole          = "Pick one of the demo roles"
	msgDemoAccountLocked = "Demo accounts stay active so every visitor can try each role"
)

// DemoMode reports whether this deployment is the public demo.
func (s *Service) DemoMode() bool { return s.d.Demo }

// DemoLogin starts a session as the demo account for role, with no password.
// It exists only in demo mode, where every account and request is sample data.
func (s *Service) DemoLogin(ctx context.Context, role domain.Role, userAgent string) (*LoginResult, error) {
	if !s.d.Demo {
		return nil, apperrors.NewNotFound(msgDemoOff)
	}
	email, ok := seed.DemoEmail(role)
	if !ok {
		return nil, apperrors.NewValidation(msgDemoRole, map[string]string{"role": msgDemoRole})
	}
	u, err := s.d.Store.UserByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if u.Status != domain.UserActive {
		return nil, apperrors.NewAccessRemoved()
	}
	return s.startSession(ctx, u, userAgent)
}

// ResetDemo restores the demo's sample data and tells every open screen to refresh.
func (s *Service) ResetDemo(ctx context.Context) error {
	if err := seed.ResetDemo(ctx, s.d.Store, s.d.Hasher); err != nil {
		return err
	}
	channels := []string{realtime.ChanAuthorizer, realtime.ChanLogistics}
	for _, d := range domain.AllDepartments() {
		channels = append(channels, realtime.ChanDepartment(d))
	}
	if email, ok := seed.DemoEmail(domain.RoleCoordinator); ok {
		if u, err := s.d.Store.UserByEmail(ctx, email); err == nil {
			channels = append(channels, realtime.ChanCoordinator(u.ID))
		}
	}
	if err := s.d.Hub.Publish(realtime.Event{Type: realtime.EventRequestChanged}, channels...); err != nil {
		s.d.Logger.ErrorContext(ctx, "publish demo reset failed", "error", err)
	}
	s.publishUsers(ctx)
	return nil
}

// RunDemoResets resets the demo every interval until ctx is canceled.
func (s *Service) RunDemoResets(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := s.resetOnce(ctx); err != nil {
				s.d.Logger.ErrorContext(ctx, "demo reset failed", "error", err)
				continue
			}
			s.d.Logger.InfoContext(ctx, "demo data reset")
		}
	}
}

// resetOnce runs one reset to completion even if shutdown starts meanwhile,
// so the demo is never left half-empty.
func (s *Service) resetOnce(ctx context.Context) error {
	bg, cancel := context.WithTimeout(context.WithoutCancel(ctx), backgroundTimeout)
	defer cancel()
	return s.ResetDemo(bg)
}
