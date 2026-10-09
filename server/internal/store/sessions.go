package store

import (
	"context"
	"fmt"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo/options"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/domain"
)

// InsertSession stores a session record for an issued JWT.
func (s *Store) InsertSession(ctx context.Context, sess *domain.Session) error {
	if _, err := s.coll(CollSessions).InsertOne(ctx, sess); err != nil {
		return fmt.Errorf("store session: %w", err)
	}
	return nil
}

// SessionByHash loads a session (revoked or not) by token hash.
func (s *Store) SessionByHash(ctx context.Context, hash string) (*domain.Session, error) {
	sess := &domain.Session{}
	if err := s.findOne(ctx, CollSessions, bson.M{fTokenHash: hash}, sess); err != nil {
		return nil, err
	}
	return sess, nil
}

// RevokeSession revokes one session.
func (s *Store) RevokeSession(ctx context.Context, hash, reason string) error {
	_, err := s.coll(CollSessions).UpdateOne(ctx, bson.M{fTokenHash: hash},
		bson.M{opSet: bson.M{fRevoked: true, "revokedReason": reason}})
	if err != nil {
		return fmt.Errorf("revoke session: %w", err)
	}
	return nil
}

// RevokeUserSessions revokes every active session for a user in one update.
func (s *Store) RevokeUserSessions(ctx context.Context, userID bson.ObjectID, reason string) error {
	_, err := s.coll(CollSessions).UpdateMany(ctx, bson.M{"userId": userID, fRevoked: false},
		bson.M{opSet: bson.M{fRevoked: true, "revokedReason": reason}})
	if err != nil {
		return fmt.Errorf("revoke user sessions: %w", err)
	}
	return nil
}

// ProvisionStation sets the department's single station token, replacing any previous token.
func (s *Store) ProvisionStation(ctx context.Context, dept domain.Department, hash string, by bson.ObjectID) error {
	_, err := s.coll(CollStationTokens).UpdateOne(ctx, bson.M{fDepartment: dept}, bson.M{
		opSet: bson.M{
			fTokenHash: hash, "provisionedBy": by, "provisionedAt": s.Now(), fRevoked: false, "pinHash": nil,
		},
		"$setOnInsert": bson.M{fieldID: bson.NewObjectID()},
	}, options.UpdateOne().SetUpsert(true))
	if err != nil {
		return fmt.Errorf("provision station: %w", err)
	}
	return nil
}

// StationByHash loads a non-revoked station token by hash.
func (s *Store) StationByHash(ctx context.Context, hash string) (*domain.StationToken, error) {
	st := &domain.StationToken{}
	if err := s.findOne(ctx, CollStationTokens, bson.M{fTokenHash: hash, fRevoked: false}, st); err != nil {
		return nil, err
	}
	return st, nil
}

// RevokeStation revokes a department's station token.
func (s *Store) RevokeStation(ctx context.Context, dept domain.Department) error {
	_, err := s.coll(CollStationTokens).UpdateOne(ctx, bson.M{fDepartment: dept}, bson.M{opSet: bson.M{fRevoked: true}})
	if err != nil {
		return fmt.Errorf("revoke station: %w", err)
	}
	return nil
}

// ListStations returns every station token record.
func (s *Store) ListStations(ctx context.Context) ([]domain.StationToken, error) {
	out := []domain.StationToken{}
	if err := s.findAll(ctx, &findQuery{coll: CollStationTokens, filter: bson.M{}, opts: options.Find()}, &out); err != nil {
		return nil, err
	}
	return out, nil
}
