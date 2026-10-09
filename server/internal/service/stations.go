package service

import (
	"context"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/apperrors"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/auth"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/domain"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/store"
)

const (
	msgUnknownDept    = "Unknown department"
	msgStationInvalid = "This station link is no longer valid \u2014 ask your Authorizer to re-provision it"
	msgTooManyStation = "Too many attempts \u2014 try again in 60 seconds."
)

// ProvisionResult is a freshly issued station credential. The raw token is shown once.
type ProvisionResult struct {
	Token string
	URL   string
}

// ProvisionStation issues the department's station token, replacing any previous one.
func (s *Service) ProvisionStation(ctx context.Context, a *Actor, dept domain.Department) (*ProvisionResult, error) {
	if !dept.Valid() {
		return nil, apperrors.NewNotFound(msgUnknownDept)
	}
	raw, hash, err := auth.NewOpaqueToken()
	if err != nil {
		return nil, err
	}
	if err := s.d.Store.ProvisionStation(ctx, dept, hash, a.UserID); err != nil {
		return nil, err
	}
	// The token travels in the URL fragment so it never reaches server or proxy logs.
	return &ProvisionResult{Token: raw, URL: s.d.BaseURL + "/kiosk/connect#" + raw}, nil
}

// RevokeStation cuts off a department's kiosk device immediately.
func (s *Service) RevokeStation(ctx context.Context, dept domain.Department) error {
	if !dept.Valid() {
		return apperrors.NewNotFound(msgUnknownDept)
	}
	return s.d.Store.RevokeStation(ctx, dept)
}

// ListStations returns every station credential record.
func (s *Service) ListStations(ctx context.Context) ([]domain.StationToken, error) {
	return s.d.Store.ListStations(ctx)
}

// StationLogin validates a raw station token presented by a kiosk, rate-limited per client address.
func (s *Service) StationLogin(ctx context.Context, raw, clientKey string) (*Actor, error) {
	key := "station:" + clientKey
	if ok, _ := s.d.Limiter.Allow(key); !ok {
		return nil, apperrors.NewRateLimited(msgTooManyStation)
	}
	a, err := s.AuthenticateStation(ctx, raw)
	if err != nil {
		if apperrors.HasCode(err, apperrors.CodeUnauthorized) {
			s.d.Limiter.Fail(key)
		}
		return nil, err
	}
	s.d.Limiter.Reset(key)
	return a, nil
}

// AuthenticateStation resolves a station token to a department-scoped kiosk actor.
func (s *Service) AuthenticateStation(ctx context.Context, raw string) (*Actor, error) {
	if raw == "" {
		return nil, apperrors.NewUnauthorized(msgStationInvalid)
	}
	st, err := s.d.Store.StationByHash(ctx, auth.HashToken(raw))
	if store.IsNotFound(err) {
		return nil, apperrors.NewUnauthorized(msgStationInvalid)
	}
	if err != nil {
		return nil, err
	}
	return &Actor{Station: true, Department: st.Department, Name: st.Department.DisplayName() + " station"}, nil
}
