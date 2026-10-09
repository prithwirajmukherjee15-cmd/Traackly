package service

import (
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/apperrors"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/auth"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/domain"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/store"
)

const (
	msgBadCredentials = "Incorrect email or password"
	msgSessionExpired = "Your session has expired \u2014 log in again"
	msgTooManyLogins  = "Too many attempts \u2014 try again in 60 seconds."
)

// LoginResult is an issued session.
type LoginResult struct {
	Token     string
	ExpiresAt time.Time
	User      *domain.User
}

// Login authenticates email/password with lockout after repeated failures (S-02).
func (s *Service) Login(ctx context.Context, email, password, userAgent string) (*LoginResult, error) {
	key := "login:" + email
	if ok, _ := s.d.Limiter.Allow(key); !ok {
		return nil, apperrors.NewRateLimited(msgTooManyLogins)
	}
	u, err := s.verifyCredentials(ctx, email, password)
	if err != nil {
		if apperrors.HasCode(err, apperrors.CodeUnauthorized) && s.d.Limiter.Fail(key) {
			return nil, apperrors.NewRateLimited(msgTooManyLogins)
		}
		return nil, err
	}
	s.d.Limiter.Reset(key)
	return s.startSession(ctx, u, userAgent)
}

func (s *Service) verifyCredentials(ctx context.Context, email, password string) (*domain.User, error) {
	norm, err := domain.NormalizeEmail(email)
	if err != nil {
		return nil, apperrors.NewUnauthorized(msgBadCredentials)
	}
	u, err := s.d.Store.UserByEmail(ctx, norm)
	if store.IsNotFound(err) {
		return nil, apperrors.NewUnauthorized(msgBadCredentials)
	}
	if err != nil {
		return nil, err
	}
	if u.Status != domain.UserActive || u.PasswordHash == nil || !auth.CheckPassword(*u.PasswordHash, password) {
		return nil, apperrors.NewUnauthorized(msgBadCredentials)
	}
	return u, nil
}

func (s *Service) startSession(ctx context.Context, u *domain.User, userAgent string) (*LoginResult, error) {
	now := s.d.Store.Now()
	sid := bson.NewObjectID()
	token, exp, err := s.d.Issuer.Issue(sid.Hex(), u.ID.Hex(), string(u.Role), now)
	if err != nil {
		return nil, err
	}
	sess := &domain.Session{
		ID: sid, UserID: u.ID, TokenHash: auth.HashToken(token), IssuedAt: now, ExpiresAt: exp, UserAgent: userAgent,
	}
	if err := s.d.Store.InsertSession(ctx, sess); err != nil {
		return nil, err
	}
	return &LoginResult{Token: token, ExpiresAt: exp, User: u}, nil
}

// Authenticate validates a session JWT against its server-side session on every request.
func (s *Service) Authenticate(ctx context.Context, token string) (*Actor, *domain.User, error) {
	claims, err := s.d.Issuer.Parse(token)
	if err != nil {
		return nil, nil, err
	}
	sess, err := s.liveSession(ctx, token, claims)
	if err != nil {
		return nil, nil, err
	}
	u, err := s.d.Store.UserByID(ctx, sess.UserID)
	if err != nil {
		return nil, nil, fmt.Errorf("load session user: %w", err)
	}
	if u.Status != domain.UserActive {
		return nil, nil, apperrors.NewAccessRemoved()
	}
	a := &Actor{UserID: u.ID, Name: u.Name, Role: u.Role}
	if u.Department != nil {
		a.Department = *u.Department
	}
	return a, u, nil
}

// liveSession loads the session behind token and checks it is unrevoked, unexpired and matches the JWT.
func (s *Service) liveSession(ctx context.Context, token string, claims *auth.Claims) (*domain.Session, error) {
	sess, err := s.d.Store.SessionByHash(ctx, auth.HashToken(token))
	if store.IsNotFound(err) {
		return nil, apperrors.NewUnauthorized(msgSessionExpired)
	}
	if err != nil {
		return nil, err
	}
	if sess.Revoked && sess.RevokedReason == domain.RevokedDeactivated {
		return nil, apperrors.NewAccessRemoved()
	}
	if sess.Revoked || sess.ID.Hex() != claims.SessionID || !sess.ExpiresAt.After(s.d.Store.Now()) {
		return nil, apperrors.NewUnauthorized(msgSessionExpired)
	}
	return sess, nil
}

// Refresh rotates a valid session into a new one.
func (s *Service) Refresh(ctx context.Context, token, userAgent string) (*LoginResult, error) {
	_, u, err := s.Authenticate(ctx, token)
	if err != nil {
		return nil, err
	}
	res, err := s.startSession(ctx, u, userAgent)
	if err != nil {
		return nil, err
	}
	if err := s.d.Store.RevokeSession(ctx, auth.HashToken(token), domain.RevokedRefresh); err != nil {
		return nil, err
	}
	return res, nil
}

// Logout revokes the session behind token.
func (s *Service) Logout(ctx context.Context, token string) error {
	return s.d.Store.RevokeSession(ctx, auth.HashToken(token), domain.RevokedLogout)
}
