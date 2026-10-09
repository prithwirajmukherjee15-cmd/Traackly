package store

import (
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo/options"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/apperrors"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/domain"
)

const (
	listLimit   = 500
	msgStale    = "This request was already updated by another session \u2014 showing the latest version"
	msgNotFound = "Request not found"
)

// RequestQuery filters a request listing. Zero-valued fields are ignored.
type RequestQuery struct {
	RaisedBy   *bson.ObjectID
	States     []domain.State
	Department domain.Department
	// OnFloor limits results to jobs that already have a timeline.
	OnFloor bool
	// LogisticsQueue limits results to requests missing a timeline or awaiting a Logistics revision.
	LogisticsQueue bool
}

func (q *RequestQuery) filter() bson.M {
	f := bson.M{}
	if q.RaisedBy != nil {
		f["raisedBy"] = *q.RaisedBy
	}
	if len(q.States) > 0 {
		f[fState] = bson.M{opIn: q.States}
	}
	if q.Department != "" {
		f["targetDepartment"] = q.Department
	}
	if q.OnFloor {
		f["timeline"] = bson.M{"$ne": nil}
	}
	if q.LogisticsQueue {
		f["$or"] = bson.A{bson.M{"timeline": nil}, bson.M{"pendingAcks": domain.AckLogistics}}
	}
	return f
}

// InsertRequest stores a new request.
func (s *Store) InsertRequest(ctx context.Context, r *domain.Request) error {
	if _, err := s.coll(CollRequests).InsertOne(ctx, r); err != nil {
		return fmt.Errorf("store request: %w", err)
	}
	return nil
}

// GetRequest loads a request by id.
func (s *Store) GetRequest(ctx context.Context, id bson.ObjectID) (*domain.Request, error) {
	r := &domain.Request{}
	if err := s.findOne(ctx, CollRequests, bson.M{fieldID: id}, r); err != nil {
		if IsNotFound(err) {
			return nil, apperrors.NewNotFound(msgNotFound)
		}
		return nil, err
	}
	return r, nil
}

// ListRequests returns requests matching q, most recently changed first.
func (s *Store) ListRequests(ctx context.Context, q *RequestQuery) ([]domain.Request, error) {
	out := []domain.Request{}
	opts := options.Find().SetSort(bson.D{{Key: fieldUpdatedAt, Value: -1}}).SetLimit(listLimit)
	if err := s.findAll(ctx, &findQuery{coll: CollRequests, filter: q.filter(), opts: opts}, &out); err != nil {
		return nil, err
	}
	return out, nil
}

// MutateFunc applies a domain operation to a loaded request.
type MutateFunc func(r *domain.Request, now time.Time) error

// MutateRequest is the single write path for existing requests.
//
// It loads the request, rejects the write if expected is set and stale, runs fn
// (a domain rule), then persists with an updatedAt compare-and-swap. Changelog
// and status-history entries are written with $push only, so history is
// append-only at the database operation level, not just by convention.
func (s *Store) MutateRequest(ctx context.Context, id bson.ObjectID, expected *time.Time, fn MutateFunc) (*domain.Request, error) {
	r, err := s.GetRequest(ctx, id)
	if err != nil {
		return nil, err
	}
	if expected != nil && !expected.UTC().Truncate(time.Millisecond).Equal(r.UpdatedAt) {
		return nil, apperrors.NewConflict(msgStale)
	}
	prevUpdated, prevLog, prevHist := r.UpdatedAt, len(r.Changelog), len(r.StatusHistory)
	now := s.Now()
	if !now.After(prevUpdated) {
		now = prevUpdated.Add(time.Millisecond)
	}
	if err := fn(r, now); err != nil {
		return nil, err
	}
	r.UpdatedAt = now
	update := bson.M{
		opSet: mutableFields(r),
		"$push": bson.M{
			"changelog":     bson.M{"$each": r.Changelog[prevLog:]},
			"statusHistory": bson.M{"$each": r.StatusHistory[prevHist:]},
		},
	}
	res, err := s.coll(CollRequests).UpdateOne(ctx, bson.M{fieldID: id, fieldUpdatedAt: prevUpdated}, update)
	if err != nil {
		return nil, fmt.Errorf("save request: %w", err)
	}
	if res.MatchedCount == 0 {
		return nil, apperrors.NewConflict(msgStale)
	}
	return r, nil
}

func mutableFields(r *domain.Request) bson.M {
	return bson.M{
		"clientName":          r.ClientName,
		"requirementDetails":  r.RequirementDetails,
		"targetDepartment":    r.TargetDepartment,
		"priority":            r.Priority,
		fState:                r.State,
		"declineReason":       r.DeclineReason,
		"timeline":            r.Timeline,
		"pendingAcks":         r.PendingAcks,
		"acknowledgedBy":      r.AcknowledgedBy,
		"acknowledgedByLabel": r.AcknowledgedByLabel,
		"acknowledgedAt":      r.AcknowledgedAt,
		"workStartedAt":       r.WorkStartedAt,
		"completedAt":         r.CompletedAt,
		fieldUpdatedAt:        r.UpdatedAt,
	}
}

// InsertNotification records a pending notification.
func (s *Store) InsertNotification(ctx context.Context, n *domain.Notification) error {
	if _, err := s.coll(CollNotifications).InsertOne(ctx, n); err != nil {
		return fmt.Errorf("store notification: %w", err)
	}
	return nil
}

// MarkNotification records a delivery outcome.
func (s *Store) MarkNotification(ctx context.Context, id bson.ObjectID, sendErr error) error {
	set := bson.M{fStatus: domain.NotifySent, "sentAt": s.Now()}
	if sendErr != nil {
		set = bson.M{fStatus: domain.NotifyFailed, "failureReason": sendErr.Error()}
	}
	if _, err := s.coll(CollNotifications).UpdateOne(ctx, bson.M{fieldID: id}, bson.M{opSet: set}); err != nil {
		return fmt.Errorf("mark notification: %w", err)
	}
	return nil
}

// NotificationsForRequest lists the delivery log for a request.
func (s *Store) NotificationsForRequest(ctx context.Context, id bson.ObjectID) ([]domain.Notification, error) {
	out := []domain.Notification{}
	if err := s.findAll(ctx, &findQuery{coll: CollNotifications, filter: bson.M{"requestId": id}, opts: options.Find()}, &out); err != nil {
		return nil, err
	}
	return out, nil
}
