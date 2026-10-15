package httpapi_test

import (
	"context"
	"net/http"
	"testing"
	"time"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/domain"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/seed"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/store"
)

func newDemoEnv(t *testing.T) *env {
	t.Helper()
	e := newEnvWith(t, true)
	if err := e.svc.ResetDemo(context.Background()); err != nil {
		t.Fatal(err)
	}
	return e
}

// demoLogin signs in as the demo account for role through the one-click endpoint.
func (e *env) demoLogin(role domain.Role) *client {
	e.t.Helper()
	c := e.anon()
	var out userEnvelope
	if code := c.call(http.MethodPost, "/api/demo/login", map[string]string{"role": string(role)}, &out); code != http.StatusOK {
		e.t.Fatalf("demo login %s: %d", role, code)
	}
	if out.User.Role != string(role) {
		e.t.Fatalf("demo login %s returned %+v", role, out.User)
	}
	return c
}

func TestDemoRoutesAreOffOutsideDemoMode(t *testing.T) {
	e := newEnv(t)
	e.anon().fail(http.MethodGet, "/api/demo", nil, http.StatusNotFound)
	e.anon().fail(http.MethodPost, "/api/demo/login", map[string]string{"role": "coordinator"}, http.StatusNotFound)
	if _, err := e.svc.DemoLogin(context.Background(), domain.RoleCoordinator, "test"); !store.IsNotFound(err) {
		t.Fatalf("DemoLogin outside demo mode should be not found, got %v", err)
	}
}

func TestDemoOneClickRoles(t *testing.T) {
	e := newDemoEnv(t)
	var info struct {
		Enabled bool `json:"enabled"`
	}
	if code := e.anon().call(http.MethodGet, "/api/demo", nil, &info); code != http.StatusOK || !info.Enabled {
		t.Fatalf("demo info: %d %+v", code, info)
	}

	coord := e.demoLogin(domain.RoleCoordinator)
	if got := coord.list("/api/requests"); len(got) != 7 {
		t.Fatalf("coordinator should see the 7 demo requests, got %d", len(got))
	}
	e.demoLogin(domain.RoleLogistics)
	authz := e.demoLogin(domain.RoleAuthorizer)

	floor := e.demoLogin(domain.RoleFloorSupervisor)
	var queue listEnvelope
	if code := floor.call(http.MethodGet, "/api/departments/production/queue", nil, &queue); code != http.StatusOK {
		t.Fatalf("floor kiosk queue: %d", code)
	}
	flagged := 0
	for _, r := range queue.Requests {
		if r.State == string(domain.StateUpdated) {
			flagged++
		}
	}
	if flagged != 1 {
		t.Fatalf("the railway order should be flagged on the kiosk, got %d flagged", flagged)
	}

	e.anon().fail(http.MethodPost, "/api/demo/login", map[string]string{"role": "admin"}, http.StatusUnprocessableEntity)
	e.anon().fail(http.MethodPost, "/api/demo/login", "not an object", http.StatusBadRequest)

	// Demo accounts can't be deactivated, so the next visitor can always try every role.
	var users struct {
		Users []struct {
			ID    string `json:"id"`
			Email string `json:"email"`
		} `json:"users"`
	}
	if code := authz.call(http.MethodGet, "/api/users", nil, &users); code != http.StatusOK {
		t.Fatalf("list users: %d", code)
	}
	for _, u := range users.Users {
		if seed.IsDemoAccount(u.Email) {
			authz.fail(http.MethodPatch, "/api/users/"+u.ID, map[string]string{"status": "deactivated"}, http.StatusForbidden)
		}
	}
}

func TestDemoResetRestoresSampleData(t *testing.T) {
	e := newDemoEnv(t)
	ctx := context.Background()
	authz := e.demoLogin(domain.RoleAuthorizer)
	var invited userEnvelope
	invite := map[string]string{"name": "Visitor", "email": "visitor@example.com", "role": "logistics"}
	if code := authz.call(http.MethodPost, "/api/users/invite", invite, &invited); code != http.StatusCreated && code != http.StatusOK {
		t.Fatalf("invite: %d", code)
	}
	coord := e.demoLogin(domain.RoleCoordinator)
	coord.post("/api/requests", railwayOrder())
	if got := coord.list("/api/requests"); len(got) != 8 {
		t.Fatalf("want 8 requests before reset, got %d", len(got))
	}

	// A deactivated demo account (for example from an older build) can't be used until the reset.
	email, _ := seed.DemoEmail(domain.RoleLogistics)
	logi, err := e.st.UserByEmail(ctx, email)
	if err != nil {
		t.Fatal(err)
	}
	if err := e.st.SetUserStatus(ctx, logi.ID, domain.UserDeactivated); err != nil {
		t.Fatal(err)
	}
	e.anon().fail(http.MethodPost, "/api/demo/login", map[string]string{"role": "logistics"}, http.StatusUnauthorized)

	runCtx, cancel := context.WithCancel(ctx)
	done := make(chan struct{})
	go func() {
		e.svc.RunDemoResets(runCtx, 20*time.Millisecond)
		close(done)
	}()
	deadline := time.Now().Add(10 * time.Second)
	for {
		all, err := e.st.ListRequests(ctx, &store.RequestQuery{})
		if err == nil && len(all) == 7 {
			if _, err := e.st.UserByEmail(ctx, "visitor@example.com"); store.IsNotFound(err) {
				break
			}
		}
		if time.Now().After(deadline) {
			t.Fatal("demo reset did not restore the sample data")
		}
		time.Sleep(20 * time.Millisecond)
	}
	cancel()
	<-done

	e.demoLogin(domain.RoleLogistics)
	if got := coord.list("/api/requests"); len(got) != 7 {
		t.Fatalf("existing demo sessions survive a reset and see fresh data, got %d", len(got))
	}
}

func TestDemoResetFailures(t *testing.T) {
	for _, tc := range []struct{ coll, cmd string }{
		{cRequests, "delete"},
		{cUsers, "find"},
		{cSessions, "delete"},
		{cUsers, "delete"},
		{cUsers, "update"},
		{cDepts, "update"},
	} {
		t.Run(tc.coll+"/"+tc.cmd, func(t *testing.T) {
			e := newDemoEnv(t)
			e.failpoint(tc.coll, 0, tc.cmd)
			if err := e.svc.ResetDemo(context.Background()); err == nil {
				t.Fatalf("reset should fail when %s %s fails", tc.coll, tc.cmd)
			}
		})
	}
	e := newDemoEnv(t)
	e.failpoint(cUsers, 0, "find")
	e.anon().fail(http.MethodPost, "/api/demo/login", map[string]string{"role": "coordinator"}, http.StatusInternalServerError)

	// A failing periodic reset is logged and retried on the next tick rather than stopping the loop.
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()
	e.svc.RunDemoResets(ctx, 10*time.Millisecond)
}
