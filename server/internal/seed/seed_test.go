package seed_test

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"os"
	"testing"
	"time"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/auth"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/domain"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/seed"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/store"
)

func TestDemoSeedIsIdempotent(t *testing.T) {
	uri := os.Getenv("TRAACKLY_TEST_MONGODB_URI")
	if uri == "" {
		t.Skip("TRAACKLY_TEST_MONGODB_URI not set")
	}
	ctx := context.Background()
	b := make([]byte, 6)
	_, _ = rand.Read(b)
	client, db, err := store.Connect(ctx, uri, "traackly_seed_"+hex.EncodeToString(b))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Drop(ctx); _ = client.Disconnect(ctx) })
	st := store.New(db, time.Now)
	h := &auth.Hasher{Cost: 4}
	if err := st.EnsureIndexes(ctx); err != nil {
		t.Fatal(err)
	}
	authz, err := seed.EnsureAccount(ctx, st, h, &seed.Account{Name: "Founder", Email: "f@ncbp.in", Password: "founder123", Role: domain.RoleAuthorizer})
	if err != nil {
		t.Fatal(err)
	}
	again, err := seed.EnsureAccount(ctx, st, h, &seed.Account{Email: "f@ncbp.in"})
	if err != nil || again.ID != authz.ID {
		t.Fatal("EnsureAccount must return the existing user")
	}
	for range 2 {
		if err := seed.Demo(ctx, st, h, authz); err != nil {
			t.Fatal(err)
		}
	}
	all, err := st.ListRequests(ctx, &store.RequestQuery{})
	if err != nil || len(all) != 7 {
		t.Fatalf("want 7 demo requests once, got %d (%v)", len(all), err)
	}
	states := map[domain.State]int{}
	for i := range all {
		states[all[i].State]++
	}
	if states[domain.StateUpdated] != 1 || states[domain.StateCompleted] != 1 || states[domain.StateDeclined] != 1 || states[domain.StateRaised] != 2 {
		t.Fatalf("states %v", states)
	}
	floor, err := st.ActiveUsers(ctx, domain.RoleFloorSupervisor, domain.DeptProduction)
	if err != nil || len(floor) != 1 {
		t.Fatalf("floor users %d", len(floor))
	}
	if _, err := seed.EnsureAccount(ctx, st, h, &seed.Account{Email: "x@ncbp.in", Password: string(make([]byte, 80))}); err == nil {
		t.Fatal("over-long password must fail")
	}
	_ = client.Disconnect(ctx)
	if _, err := seed.EnsureAccount(ctx, st, h, &seed.Account{Email: "y@ncbp.in"}); err == nil {
		t.Fatal("disconnected store must fail")
	}
}
