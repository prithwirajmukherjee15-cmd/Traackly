package store_test

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"os"
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/apperrors"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/domain"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/store"
)

func newStore(t *testing.T) *store.Store {
	t.Helper()
	uri := os.Getenv("TRAACKLY_TEST_MONGODB_URI")
	if uri == "" {
		t.Skip("TRAACKLY_TEST_MONGODB_URI not set")
	}
	ctx := context.Background()
	b := make([]byte, 6)
	_, _ = rand.Read(b)
	client, db, err := store.Connect(ctx, uri, "traackly_store_"+hex.EncodeToString(b))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Drop(ctx); _ = client.Disconnect(ctx) })
	st := store.New(db, time.Now)
	if err := st.EnsureIndexes(ctx); err != nil {
		t.Fatal(err)
	}
	return st
}

// TestChangelogIsAppendOnly proves MutateRequest persists history with $push:
// an attempt to rewrite an existing changelog entry is not stored.
func TestChangelogIsAppendOnly(t *testing.T) {
	st := newStore(t)
	ctx := context.Background()
	authz := bson.NewObjectID()
	r, _ := domain.NewRequest(domain.Fields{ClientName: "BHEL", RequirementDetails: "Brushes", TargetDepartment: domain.DeptSupply}, bson.NewObjectID(), st.Now())
	if err := st.InsertRequest(ctx, r); err != nil {
		t.Fatal(err)
	}
	_, err := st.MutateRequest(ctx, r.ID, nil, func(r *domain.Request, now time.Time) error {
		if err := domain.Approve(r, authz, now); err != nil {
			return err
		}
		f := r.Fields()
		f.RequirementDetails = "Brushes v2"
		_, err := domain.ApplyEdit(r, f, authz, now)
		return err
	})
	if err != nil {
		t.Fatal(err)
	}
	_, err = st.MutateRequest(ctx, r.ID, nil, func(r *domain.Request, _ time.Time) error {
		r.Changelog[0].NewValue = "forged"
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	got, _ := st.GetRequest(ctx, r.ID)
	if len(got.Changelog) != 1 || got.Changelog[0].NewValue != "Brushes v2" {
		t.Fatalf("changelog was rewritten: %+v", got.Changelog)
	}
}

func TestMutateRequestStaleAndMissing(t *testing.T) {
	st := newStore(t)
	ctx := context.Background()
	if _, err := st.GetRequest(ctx, bson.NewObjectID()); !store.IsNotFound(err) {
		t.Fatalf("missing request: %v", err)
	}
	if _, err := st.MutateRequest(ctx, bson.NewObjectID(), nil, nil); !store.IsNotFound(err) {
		t.Fatalf("mutate missing: %v", err)
	}
	r, _ := domain.NewRequest(domain.Fields{ClientName: "BHEL", RequirementDetails: "Brushes", TargetDepartment: domain.DeptSupply}, bson.NewObjectID(), st.Now())
	_ = st.InsertRequest(ctx, r)
	stale := r.UpdatedAt.Add(-time.Second)
	_, err := st.MutateRequest(ctx, r.ID, &stale, func(*domain.Request, time.Time) error { return nil })
	if !apperrors.HasCode(err, apperrors.CodeConflict) {
		t.Fatalf("stale write must conflict: %v", err)
	}
	ok, err := st.ActivateUser(ctx, "nope", "hash")
	if ok || err != nil {
		t.Fatalf("activate unknown token: %v %v", ok, err)
	}
	if err := st.Ping(ctx); err != nil {
		t.Fatal(err)
	}
}

func TestConnectFailure(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if _, _, err := store.Connect(ctx, "not-a-uri", "x"); err == nil {
		t.Fatal("bad uri must fail")
	}
	if _, _, err := store.Connect(ctx, "mongodb://127.0.0.1:1/?serverSelectionTimeoutMS=200", "x"); err == nil {
		t.Fatal("unreachable server must fail")
	}
}
