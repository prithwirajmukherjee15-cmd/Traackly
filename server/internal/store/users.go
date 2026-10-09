package store

import (
	"context"
	"fmt"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/apperrors"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/domain"
)

const msgDuplicateEmail = "This email has already been invited or has an account"

// InsertUser stores a new user, rejecting duplicate emails via the unique index.
func (s *Store) InsertUser(ctx context.Context, u *domain.User) error {
	_, err := s.coll(CollUsers).InsertOne(ctx, u)
	if mongo.IsDuplicateKeyError(err) {
		return apperrors.NewValidation(msgDuplicateEmail, map[string]string{fEmail: msgDuplicateEmail})
	}
	if err != nil {
		return fmt.Errorf("store user: %w", err)
	}
	return nil
}

// UserByID loads a user.
func (s *Store) UserByID(ctx context.Context, id bson.ObjectID) (*domain.User, error) {
	u := &domain.User{}
	if err := s.findOne(ctx, CollUsers, bson.M{fieldID: id}, u); err != nil {
		return nil, err
	}
	return u, nil
}

// UserByEmail loads a user by normalized email.
func (s *Store) UserByEmail(ctx context.Context, email string) (*domain.User, error) {
	u := &domain.User{}
	if err := s.findOne(ctx, CollUsers, bson.M{fEmail: email}, u); err != nil {
		return nil, err
	}
	return u, nil
}

// UserByInviteToken loads an invited user by a still-valid invite token hash.
func (s *Store) UserByInviteToken(ctx context.Context, hash string) (*domain.User, error) {
	u := &domain.User{}
	f := bson.M{fInviteToken: hash, fStatus: domain.UserInvited, fInviteExpires: bson.M{opGt: s.Now()}}
	if err := s.findOne(ctx, CollUsers, f, u); err != nil {
		return nil, err
	}
	return u, nil
}

// ListUsers returns every user, newest first.
func (s *Store) ListUsers(ctx context.Context) ([]domain.User, error) {
	out := []domain.User{}
	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: 1}})
	if err := s.findAll(ctx, &findQuery{coll: CollUsers, filter: bson.M{}, opts: opts}, &out); err != nil {
		return nil, err
	}
	return out, nil
}

// ActiveUsers lists active users with role, optionally restricted to a department.
func (s *Store) ActiveUsers(ctx context.Context, role domain.Role, dept domain.Department) ([]domain.User, error) {
	f := bson.M{fRole: role, fStatus: domain.UserActive}
	if dept != "" {
		f[fDepartment] = dept
	}
	out := []domain.User{}
	if err := s.findAll(ctx, &findQuery{coll: CollUsers, filter: f, opts: options.Find()}, &out); err != nil {
		return nil, err
	}
	return out, nil
}

// CountActive counts active users with role.
func (s *Store) CountActive(ctx context.Context, role domain.Role) (int64, error) {
	n, err := s.coll(CollUsers).CountDocuments(ctx, bson.M{fRole: role, fStatus: domain.UserActive})
	if err != nil {
		return 0, fmt.Errorf("count users: %w", err)
	}
	return n, nil
}

// UserNames resolves display names for ids, including deactivated users.
func (s *Store) UserNames(ctx context.Context, ids []bson.ObjectID) (map[bson.ObjectID]string, error) {
	names := map[bson.ObjectID]string{}
	if len(ids) == 0 {
		return names, nil
	}
	users := []domain.User{}
	opts := options.Find().SetProjection(bson.M{"name": 1})
	if err := s.findAll(ctx, &findQuery{coll: CollUsers, filter: bson.M{fieldID: bson.M{opIn: ids}}, opts: opts}, &users); err != nil {
		return nil, err
	}
	for i := range users {
		names[users[i].ID] = users[i].Name
	}
	return names, nil
}

// updateUser applies set to the first user matching filter and reports whether one matched.
func (s *Store) updateUser(ctx context.Context, filter, set bson.M) (bool, error) {
	set[fieldUpdatedAt] = s.Now()
	res, err := s.coll(CollUsers).UpdateOne(ctx, filter, bson.M{opSet: set})
	if err != nil {
		return false, fmt.Errorf("save user: %w", err)
	}
	return res.MatchedCount > 0, nil
}

// SetInviteToken stores a fresh invite token hash, replacing any previous one.
func (s *Store) SetInviteToken(ctx context.Context, id bson.ObjectID, hash string) error {
	now := s.Now()
	_, err := s.updateUser(ctx, bson.M{fieldID: id, fStatus: domain.UserInvited}, bson.M{
		fInviteToken: hash, fInviteExpires: now.Add(domain.InviteTTL), "invitedAt": now,
	})
	return err
}

// ActivateUser consumes an invite token (single use) and sets the password.
func (s *Store) ActivateUser(ctx context.Context, tokenHash, passwordHash string) (bool, error) {
	now := s.Now()
	filter := bson.M{fInviteToken: tokenHash, fStatus: domain.UserInvited, fInviteExpires: bson.M{opGt: now}}
	return s.updateUser(ctx, filter, bson.M{
		"passwordHash": passwordHash, fStatus: domain.UserActive, "activatedAt": now,
		fInviteToken: nil, fInviteExpires: nil,
	})
}

// SetResetToken stores a password-reset token hash for an active user.
func (s *Store) SetResetToken(ctx context.Context, id bson.ObjectID, hash string) error {
	_, err := s.updateUser(ctx, bson.M{fieldID: id, fStatus: domain.UserActive}, bson.M{
		fResetTokenHash: hash, fResetExpiresAt: s.Now().Add(domain.ResetTTL),
	})
	return err
}

// ResetPassword consumes a reset token and sets a new password, returning the user id.
func (s *Store) ResetPassword(ctx context.Context, tokenHash, passwordHash string) (bson.ObjectID, bool, error) {
	u := &domain.User{}
	f := bson.M{fResetTokenHash: tokenHash, fStatus: domain.UserActive, fResetExpiresAt: bson.M{opGt: s.Now()}}
	if err := s.findOne(ctx, CollUsers, f, u); err != nil {
		if IsNotFound(err) {
			return bson.ObjectID{}, false, nil
		}
		return bson.ObjectID{}, false, err
	}
	ok, err := s.updateUser(ctx, f, bson.M{"passwordHash": passwordHash, fResetTokenHash: nil, fResetExpiresAt: nil})
	return u.ID, ok, err
}

// SetUserStatus changes a user's status.
func (s *Store) SetUserStatus(ctx context.Context, id bson.ObjectID, status domain.UserStatus) error {
	_, err := s.updateUser(ctx, bson.M{fieldID: id}, bson.M{fStatus: status})
	return err
}
