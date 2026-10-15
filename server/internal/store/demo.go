package store

import (
	"context"
	"fmt"

	"go.mongodb.org/mongo-driver/v2/bson"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/domain"
)

// ResetDemoData returns the public demo deployment to an empty state before it is re-seeded.
//
// It removes every request, notification and station token, deletes every user whose email
// is not in keep (with their sessions), and reactivates the kept users. Production never calls
// it: the append-only guarantees apply to real data, and the demo's data is disposable by design.
func (s *Store) ResetDemoData(ctx context.Context, keep []string) error {
	for _, name := range []string{CollRequests, CollNotifications, CollStationTokens} {
		if _, err := s.coll(name).DeleteMany(ctx, bson.M{}); err != nil {
			return fmt.Errorf("reset %s: %w", name, err)
		}
	}
	var gone []struct {
		ID bson.ObjectID `bson:"_id"`
	}
	if err := s.findAll(ctx, &findQuery{coll: CollUsers, filter: bson.M{fEmail: bson.M{"$nin": keep}}}, &gone); err != nil {
		return err
	}
	ids := make([]bson.ObjectID, 0, len(gone))
	for _, u := range gone {
		ids = append(ids, u.ID)
	}
	if _, err := s.coll(CollSessions).DeleteMany(ctx, bson.M{fUserID: bson.M{opIn: ids}}); err != nil {
		return fmt.Errorf("reset sessions: %w", err)
	}
	if _, err := s.coll(CollUsers).DeleteMany(ctx, bson.M{fieldID: bson.M{opIn: ids}}); err != nil {
		return fmt.Errorf("reset users: %w", err)
	}
	_, err := s.coll(CollUsers).UpdateMany(ctx, bson.M{fEmail: bson.M{opIn: keep}},
		bson.M{opSet: bson.M{fStatus: domain.UserActive, fieldUpdatedAt: s.Now()}})
	if err != nil {
		return fmt.Errorf("reactivate demo users: %w", err)
	}
	return nil
}
