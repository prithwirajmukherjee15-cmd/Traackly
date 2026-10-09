// Package store persists Traackly's six collections in MongoDB.
package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/apperrors"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/domain"
)

// Collection names.
const (
	CollUsers         = "users"
	CollSessions      = "sessions"
	CollStationTokens = "station_tokens"
	CollRequests      = "requests"
	CollNotifications = "notifications"
	CollDepartments   = "departments"
)

const (
	fieldID        = "_id"
	fieldUpdatedAt = "updatedAt"
	opSet          = "$set"
	opIn           = "$in"
	connectTimeout = 10 * time.Second
)

// Store wraps a MongoDB database.
type Store struct {
	db    *mongo.Database
	clock func() time.Time
}

// New builds a Store over db using clock for timestamps.
func New(db *mongo.Database, clock func() time.Time) *Store {
	return &Store{db: db, clock: clock}
}

// Connect opens a client and verifies connectivity.
func Connect(ctx context.Context, uri, dbName string) (*mongo.Client, *mongo.Database, error) {
	client, err := mongo.Connect(options.Client().ApplyURI(uri).SetServerSelectionTimeout(connectTimeout))
	if err != nil {
		return nil, nil, fmt.Errorf("connect mongo: %w", err)
	}
	if err := client.Ping(ctx, nil); err != nil {
		return nil, nil, fmt.Errorf("ping mongo: %w", err)
	}
	return client, client.Database(dbName), nil
}

// Now returns the current time at MongoDB's millisecond precision.
func (s *Store) Now() time.Time {
	return s.clock().UTC().Truncate(time.Millisecond)
}

// Ping checks database connectivity.
func (s *Store) Ping(ctx context.Context) error {
	if err := s.db.Client().Ping(ctx, nil); err != nil {
		return fmt.Errorf("ping: %w", err)
	}
	return nil
}

func (s *Store) coll(name string) *mongo.Collection { return s.db.Collection(name) }

func idx(keys bson.D, unique bool) mongo.IndexModel {
	o := options.Index()
	if unique {
		o.SetUnique(true)
	}
	return mongo.IndexModel{Keys: keys, Options: o}
}

// EnsureIndexes creates every index named in the Backend Schema document.
func (s *Store) EnsureIndexes(ctx context.Context) error {
	ttl := mongo.IndexModel{Keys: bson.D{{Key: "expiresAt", Value: 1}}, Options: options.Index().SetExpireAfterSeconds(0)}
	specs := map[string][]mongo.IndexModel{
		CollUsers: {
			idx(bson.D{{Key: fEmail, Value: 1}}, true),
			idx(bson.D{{Key: fRole, Value: 1}, {Key: fDepartment, Value: 1}}, false),
			idx(bson.D{{Key: fStatus, Value: 1}}, false),
		},
		CollSessions: {
			idx(bson.D{{Key: fTokenHash, Value: 1}}, true), ttl,
			idx(bson.D{{Key: "userId", Value: 1}, {Key: fRevoked, Value: 1}}, false),
		},
		CollStationTokens: {
			idx(bson.D{{Key: fDepartment, Value: 1}}, true),
			idx(bson.D{{Key: fTokenHash, Value: 1}}, true),
		},
		CollRequests: {
			idx(bson.D{{Key: "targetDepartment", Value: 1}, {Key: fState, Value: 1}}, false),
			idx(bson.D{{Key: "raisedBy", Value: 1}, {Key: fState, Value: 1}}, false),
			idx(bson.D{{Key: fState, Value: 1}}, false),
			idx(bson.D{{Key: fieldUpdatedAt, Value: -1}}, false),
		},
		CollNotifications: {
			idx(bson.D{{Key: "requestId", Value: 1}}, false),
			idx(bson.D{{Key: "sentAt", Value: -1}}, false),
		},
	}
	for name, models := range specs {
		if _, err := s.coll(name).Indexes().CreateMany(ctx, models); err != nil {
			return fmt.Errorf("create indexes on %s: %w", name, err)
		}
	}
	return nil
}

// SeedDepartments upserts the three MVP departments.
func (s *Store) SeedDepartments(ctx context.Context) error {
	for _, d := range domain.AllDepartments() {
		_, err := s.coll(CollDepartments).UpdateOne(ctx, bson.M{fieldID: d},
			bson.M{"$setOnInsert": bson.M{"displayName": d.DisplayName(), "stationCount": 1}},
			options.UpdateOne().SetUpsert(true))
		if err != nil {
			return fmt.Errorf("seed department %s: %w", d, err)
		}
	}
	return nil
}

// ListDepartments returns all departments.
func (s *Store) ListDepartments(ctx context.Context) ([]domain.DepartmentDoc, error) {
	out := []domain.DepartmentDoc{}
	if err := s.findAll(ctx, &findQuery{coll: CollDepartments, filter: bson.M{}, opts: options.Find().SetSort(bson.D{{Key: fieldID, Value: 1}})}, &out); err != nil {
		return nil, err
	}
	return out, nil
}

// findQuery is a collection, filter and find options.
type findQuery struct {
	coll   string
	filter any
	opts   *options.FindOptionsBuilder
}

func (s *Store) findAll(ctx context.Context, q *findQuery, out any) error {
	cur, err := s.coll(q.coll).Find(ctx, q.filter, q.opts)
	if err != nil {
		return fmt.Errorf("find %s: %w", q.coll, err)
	}
	if err := cur.All(ctx, out); err != nil {
		return fmt.Errorf("decode %s: %w", q.coll, err)
	}
	return nil
}

func (s *Store) findOne(ctx context.Context, coll string, filter any, out any) error {
	err := s.coll(coll).FindOne(ctx, filter).Decode(out)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return apperrors.NewNotFound("Not found")
	}
	if err != nil {
		return fmt.Errorf("find one %s: %w", coll, err)
	}
	return nil
}

// IsNotFound reports whether err is a store not-found error.
func IsNotFound(err error) bool {
	return apperrors.HasCode(err, apperrors.CodeNotFound)
}
