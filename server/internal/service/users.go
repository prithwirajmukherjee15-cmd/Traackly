package service

import (
	"context"
	"fmt"

	"go.mongodb.org/mongo-driver/v2/bson"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/apperrors"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/auth"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/domain"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/notify"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/realtime"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/store"
)

const (
	msgInviteInvalid = "This invite link has expired or was already used \u2014 ask your Authorizer to resend it"
	msgResetInvalid  = "This link has expired \u2014 request a new one"
)

// Invite creates an invited user and emails a single-use setup link (S-00).
// The returned link is non-empty only when dev links are exposed.
func (s *Service) Invite(ctx context.Context, a *Actor, in domain.Invite) (*domain.User, string, error) {
	u, err := domain.NewInvitedUser(in, a.UserID, s.d.Store.Now())
	if err != nil {
		return nil, "", err
	}
	if err := s.d.Store.InsertUser(ctx, u); err != nil {
		return nil, "", err
	}
	link, err := s.issueInvite(ctx, u, a.Name)
	if err != nil {
		return nil, "", err
	}
	s.publishUsers(ctx)
	return u, link, nil
}

// ResendInvite issues a fresh 7-day token, invalidating the previous one.
func (s *Service) ResendInvite(ctx context.Context, a *Actor, id bson.ObjectID) (string, error) {
	u, err := s.d.Store.UserByID(ctx, id)
	if err != nil {
		return "", err
	}
	if u.Status != domain.UserInvited {
		return "", apperrors.NewConflict("Only pending invites can be resent")
	}
	return s.issueInvite(ctx, u, a.Name)
}

func (s *Service) issueInvite(ctx context.Context, u *domain.User, inviter string) (string, error) {
	raw, hash, err := auth.NewOpaqueToken()
	if err != nil {
		return "", err
	}
	if err := s.d.Store.SetInviteToken(ctx, u.ID, hash); err != nil {
		return "", err
	}
	link := s.d.BaseURL + "/activate/" + raw
	s.sendMail(ctx, notify.Message{
		To:      u.Email,
		Subject: "[Traackly] You've been invited to Traackly",
		Text:    fmt.Sprintf("%s invited you to Traackly. Set your password within 7 days:\n\n%s", inviter, link),
	})
	return s.devLink(link), nil
}

// InviteInfo resolves the invited user's name and email for the S-01 pre-fill.
func (s *Service) InviteInfo(ctx context.Context, raw string) (*domain.User, error) {
	u, err := s.d.Store.UserByInviteToken(ctx, auth.HashToken(raw))
	if store.IsNotFound(err) {
		return nil, apperrors.NewNotFound(msgInviteInvalid)
	}
	return u, err
}

// Activate consumes an invite token and sets the password (S-01). It returns the user's email.
func (s *Service) Activate(ctx context.Context, raw, password, confirm string) (string, error) {
	u, err := s.InviteInfo(ctx, raw)
	if err != nil {
		return "", err
	}
	if err := domain.ValidatePassword(password, confirm); err != nil {
		return "", err
	}
	hash, err := s.d.Hasher.Hash(password)
	if err != nil {
		return "", err
	}
	ok, err := s.d.Store.ActivateUser(ctx, auth.HashToken(raw), hash)
	if err != nil {
		return "", err
	}
	if !ok {
		return "", apperrors.NewNotFound(msgInviteInvalid)
	}
	s.publishUsers(ctx)
	return u.Email, nil
}

// ForgotPassword emails a 1-hour reset link if the account exists. It never reveals whether it does.
func (s *Service) ForgotPassword(ctx context.Context, email string) (string, error) {
	email, err := domain.NormalizeEmail(email)
	if err != nil {
		return "", err
	}
	u, err := s.d.Store.UserByEmail(ctx, email)
	if err != nil || u.Status != domain.UserActive {
		if err != nil && !store.IsNotFound(err) {
			return "", err
		}
		return "", nil
	}
	raw, hash, err := auth.NewOpaqueToken()
	if err != nil {
		return "", err
	}
	if err := s.d.Store.SetResetToken(ctx, u.ID, hash); err != nil {
		return "", err
	}
	link := s.d.BaseURL + "/reset-password/" + raw
	s.sendMail(ctx, notify.Message{
		To: u.Email, Subject: "[Traackly] Reset your password",
		Text: "Use this link within 1 hour to choose a new password:\n\n" + link,
	})
	return s.devLink(link), nil
}

// ResetPassword consumes a reset token, sets the password and signs out every existing session.
func (s *Service) ResetPassword(ctx context.Context, raw, password, confirm string) error {
	if err := domain.ValidatePassword(password, confirm); err != nil {
		return err
	}
	hash, err := s.d.Hasher.Hash(password)
	if err != nil {
		return err
	}
	id, ok, err := s.d.Store.ResetPassword(ctx, auth.HashToken(raw), hash)
	if err != nil {
		return err
	}
	if !ok {
		return apperrors.NewNotFound(msgResetInvalid)
	}
	return s.d.Store.RevokeUserSessions(ctx, id, domain.RevokedLogout)
}

// ListUsers returns every user (S-91).
func (s *Service) ListUsers(ctx context.Context) ([]domain.User, error) {
	return s.d.Store.ListUsers(ctx)
}

// Deactivate revokes a user's access immediately, keeping at least one active Authorizer.
func (s *Service) Deactivate(ctx context.Context, id bson.ObjectID) error {
	u, err := s.d.Store.UserByID(ctx, id)
	if err != nil {
		return err
	}
	if u.Status != domain.UserActive {
		return apperrors.NewConflict("Only active users can be deactivated")
	}
	if u.Role == domain.RoleAuthorizer {
		n, err := s.d.Store.CountActive(ctx, domain.RoleAuthorizer)
		if err != nil {
			return err
		}
		if n <= 1 {
			return apperrors.NewConflict("Couldn't deactivate \u2014 this is the only active Authorizer")
		}
	}
	if err := s.d.Store.SetUserStatus(ctx, id, domain.UserDeactivated); err != nil {
		return err
	}
	if err := s.d.Store.RevokeUserSessions(ctx, id, domain.RevokedDeactivated); err != nil {
		return err
	}
	if err := s.d.Hub.Publish(realtime.Event{Type: realtime.EventSessionRevoked}, realtime.ChanUser(id)); err != nil {
		s.d.Logger.ErrorContext(ctx, "publish revoke failed", "error", err)
	}
	s.publishUsers(ctx)
	return nil
}

func (s *Service) publishUsers(ctx context.Context) {
	if err := s.d.Hub.Publish(realtime.Event{Type: realtime.EventUsersChanged}, realtime.ChanAuthorizer); err != nil {
		s.d.Logger.ErrorContext(ctx, "publish users failed", "error", err)
	}
}
