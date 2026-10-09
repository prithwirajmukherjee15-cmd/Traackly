package httpapi_test

import (
	"net/http"
	"strings"
	"testing"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/domain"
)

const (
	cUsers    = "users"
	cSessions = "sessions"
	cRequests = "requests"
	cStations = "station_tokens"
	cNotif    = "notifications"
	cDepts    = "departments"
)

// expect500 asserts the endpoint fails closed with a generic message.
func expect500(t *testing.T, c *client, method, path string, body any) {
	t.Helper()
	ae := c.fail(method, path, body, http.StatusInternalServerError)
	if ae.Error.Code != "internal" || strings.Contains(ae.Error.Message, "failpoint") {
		t.Fatalf("%s %s leaked or wrong error: %+v", method, path, ae)
	}
}

// TestDependencyFailures injects MongoDB command failures and checks every path fails closed.
func TestDependencyFailures(t *testing.T) {
	pwd := map[string]string{"password": "password9", "confirmPassword": "password9"}
	cases := []struct {
		name string
		run  func(e *env)
	}{
		{"login user lookup", func(e *env) {
			t := e.t
			e.failpoint(cUsers, 0, "find")
			expect500(t, e.anon(), http.MethodPost, "/api/auth/login", map[string]string{"email": authzEmail, "password": authzPass})
		}},
		{"login session insert", func(e *env) {
			t := e.t
			e.failpoint(cSessions, 0, "insert")
			expect500(t, e.anon(), http.MethodPost, "/api/auth/login", map[string]string{"email": authzEmail, "password": authzPass})
		}},
		{"session lookup", func(e *env) {
			t := e.t
			c := e.login(authzEmail, authzPass)
			e.failpoint(cSessions, 0, "find")
			expect500(t, c, http.MethodGet, "/api/auth/me", nil)
		}},
		{"session user lookup", func(e *env) {
			t := e.t
			c := e.login(authzEmail, authzPass)
			e.failpoint(cUsers, 0, "find")
			expect500(t, c, http.MethodGet, "/api/auth/me", nil)
		}},
		{"logout revoke", func(e *env) {
			t := e.t
			c := e.login(authzEmail, authzPass)
			e.failpoint(cSessions, 0, "update")
			expect500(t, c, http.MethodPost, "/api/auth/logout", nil)
		}},
		{"refresh insert", func(e *env) {
			t := e.t
			c := e.login(authzEmail, authzPass)
			e.failpoint(cSessions, 0, "insert")
			expect500(t, c, http.MethodPost, "/api/auth/refresh", nil)
		}},
		{"refresh revoke", func(e *env) {
			t := e.t
			c := e.login(authzEmail, authzPass)
			e.failpoint(cSessions, 0, "update")
			expect500(t, c, http.MethodPost, "/api/auth/refresh", nil)
		}},
		{"me after middleware", func(e *env) {
			t := e.t
			c := e.login(authzEmail, authzPass)
			e.failpoint(cUsers, 1, "find")
			expect500(t, c, http.MethodGet, "/api/auth/me", nil)
		}},
		{"departments", func(e *env) {
			t := e.t
			c := e.login(authzEmail, authzPass)
			e.failpoint(cDepts, 0, "find")
			expect500(t, c, http.MethodGet, "/api/departments", nil)
		}},
		{"list users", func(e *env) {
			t := e.t
			c := e.login(authzEmail, authzPass)
			e.failpoint(cUsers, 1, "find")
			expect500(t, c, http.MethodGet, "/api/users", nil)
		}},
		{"list stations", func(e *env) {
			t := e.t
			c := e.login(authzEmail, authzPass)
			e.failpoint(cStations, 0, "find")
			expect500(t, c, http.MethodGet, "/api/stations", nil)
		}},
		{"provision station", func(e *env) {
			t := e.t
			c := e.login(authzEmail, authzPass)
			e.failpoint(cStations, 0, "update")
			expect500(t, c, http.MethodPost, "/api/stations/qa", nil)
			expect500(t, c, http.MethodDelete, "/api/stations/qa", nil)
		}},
		{"station auth lookup", func(e *env) {
			t := e.t
			e.failpoint(cStations, 0, "find")
			expect500(t, e.anon(), http.MethodPost, "/api/kiosk/session", map[string]string{"token": "abc"})
		}},
		{"invite insert", func(e *env) {
			t := e.t
			c := e.login(authzEmail, authzPass)
			e.failpoint(cUsers, 0, "insert")
			expect500(t, c, http.MethodPost, "/api/users/invite", map[string]string{"name": "New Person", "email": "n@ncbp.in", "role": "coordinator"})
		}},
		{"invite token update", func(e *env) {
			t := e.t
			c := e.login(authzEmail, authzPass)
			e.failpoint(cUsers, 0, "update")
			expect500(t, c, http.MethodPost, "/api/users/invite", map[string]string{"name": "New Person", "email": "n@ncbp.in", "role": "coordinator"})
		}},
		{"resend lookup", func(e *env) {
			t := e.t
			c := e.login(authzEmail, authzPass)
			e.failpoint(cUsers, 1, "find")
			expect500(t, c, http.MethodPost, "/api/users/"+bsonHex()+"/resend-invite", nil)
		}},
		{"activate lookup", func(e *env) {
			t := e.t
			e.failpoint(cUsers, 0, "find")
			expect500(t, e.anon(), http.MethodPost, "/api/users/activate/tok", pwd)
		}},
		{"activate update", func(e *env) {
			t := e.t
			var out userEnvelope
			e.login(authzEmail, authzPass).call(http.MethodPost, "/api/users/invite", map[string]string{"name": "New Person", "email": "n@ncbp.in", "role": "coordinator"}, &out)
			e.failpoint(cUsers, 0, "update")
			expect500(t, e.anon(), http.MethodPost, "/api/users/activate/"+token(out.DevLink), pwd)
		}},
		{"forgot lookup", func(e *env) {
			t := e.t
			e.failpoint(cUsers, 0, "find")
			expect500(t, e.anon(), http.MethodPost, "/api/auth/forgot-password", map[string]string{"email": authzEmail})
		}},
		{"forgot token update", func(e *env) {
			t := e.t
			e.failpoint(cUsers, 0, "update")
			expect500(t, e.anon(), http.MethodPost, "/api/auth/forgot-password", map[string]string{"email": authzEmail})
		}},
		{"reset lookup", func(e *env) {
			t := e.t
			e.failpoint(cUsers, 0, "find")
			expect500(t, e.anon(), http.MethodPost, "/api/auth/reset-password/tok", pwd)
		}},
		{"deactivate lookup", func(e *env) {
			t := e.t
			c := e.login(authzEmail, authzPass)
			e.failpoint(cUsers, 1, "find")
			expect500(t, c, http.MethodPatch, "/api/users/"+bsonHex(), map[string]string{"status": "deactivated"})
		}},
		{"deactivate count", func(e *env) {
			t := e.t
			_, other := e.user("Other Authz", domain.RoleAuthorizer, "")
			c := e.login(authzEmail, authzPass)
			e.failpoint(cUsers, 0, "aggregate")
			expect500(t, c, http.MethodPatch, "/api/users/"+other.ID.Hex(), map[string]string{"status": "deactivated"})
		}},
		{"deactivate status update", func(e *env) {
			t := e.t
			_, other := e.user("Meera Iyer", domain.RoleCoordinator, "")
			c := e.login(authzEmail, authzPass)
			e.failpoint(cUsers, 0, "update")
			expect500(t, c, http.MethodPatch, "/api/users/"+other.ID.Hex(), map[string]string{"status": "deactivated"})
		}},
		{"deactivate revoke sessions", func(e *env) {
			t := e.t
			_, other := e.user("Meera Iyer", domain.RoleCoordinator, "")
			c := e.login(authzEmail, authzPass)
			e.failpoint(cSessions, 0, "update")
			expect500(t, c, http.MethodPatch, "/api/users/"+other.ID.Hex(), map[string]string{"status": "deactivated"})
		}},
		{"create request", func(e *env) {
			t := e.t
			c, _ := e.user("Meera Iyer", domain.RoleCoordinator, "")
			e.failpoint(cRequests, 0, "insert")
			expect500(t, c, http.MethodPost, "/api/requests", railwayOrder())
		}},
		{"list requests", func(e *env) {
			t := e.t
			c, _ := e.user("Meera Iyer", domain.RoleCoordinator, "")
			e.failpoint(cRequests, 0, "find")
			expect500(t, c, http.MethodGet, "/api/requests", nil)
		}},
		{"list requests names", func(e *env) {
			t := e.t
			c, _ := e.user("Meera Iyer", domain.RoleCoordinator, "")
			c.post("/api/requests", railwayOrder())
			e.failpoint(cUsers, 1, "find")
			expect500(t, c, http.MethodGet, "/api/requests", nil)
		}},
		{"get request names", func(e *env) {
			t := e.t
			c, _ := e.user("Meera Iyer", domain.RoleCoordinator, "")
			r := c.post("/api/requests", railwayOrder()).Request
			e.failpoint(cUsers, 1, "find")
			expect500(t, c, http.MethodGet, "/api/requests/"+r.ID, nil)
		}},
		{"get request", func(e *env) {
			t := e.t
			c, _ := e.user("Meera Iyer", domain.RoleCoordinator, "")
			e.failpoint(cRequests, 0, "find")
			expect500(t, c, http.MethodGet, "/api/requests/"+bsonHex(), nil)
		}},
		{"approve update", func(e *env) {
			t := e.t
			c, _ := e.user("Meera Iyer", domain.RoleCoordinator, "")
			r := c.post("/api/requests", railwayOrder()).Request
			a := e.login(authzEmail, authzPass)
			e.failpoint(cRequests, 0, "update")
			expect500(t, a, http.MethodPost, "/api/requests/"+r.ID+"/approve", map[string]any{})
		}},
		{"notification insert and mark", func(e *env) {
			c, _ := e.user("Meera Iyer", domain.RoleCoordinator, "")
			_, _ = e.user("Arjun Rao", domain.RoleLogistics, "")
			r := c.post("/api/requests", railwayOrder()).Request
			a := e.login(authzEmail, authzPass)
			e.failpoint(cNotif, 0, "insert")
			a.post("/api/requests/"+r.ID+"/approve", map[string]any{})
			e.clearFailpoint()
			r2 := c.post("/api/requests", railwayOrder()).Request
			e.failpoint(cNotif, 0, "update")
			a.post("/api/requests/"+r2.ID+"/decline", map[string]string{"reason": "No"})
		}},
		{"recipient lookup", func(e *env) {
			t := e.t
			c, _ := e.user("Meera Iyer", domain.RoleCoordinator, "")
			r := c.post("/api/requests", railwayOrder()).Request
			a := e.login(authzEmail, authzPass)
			// Recipient lookup fails (logged, not fatal); the response's name lookup then fails closed.
			e.failpoint(cUsers, 1, "find")
			expect500(t, a, http.MethodPost, "/api/requests/"+r.ID+"/approve", map[string]any{})
			e.clearFailpoint()
			r2 := c.post("/api/requests", railwayOrder()).Request
			e.failpoint(cUsers, 1, "find")
			expect500(t, a, http.MethodPost, "/api/requests/"+r2.ID+"/decline", map[string]string{"reason": "No"})
		}},
		{"kiosk queue", func(e *env) {
			t := e.t
			sup, _ := e.user("Sunil Patil", domain.RoleFloorSupervisor, domain.DeptQA)
			e.failpoint(cRequests, 0, "find")
			expect500(t, sup, http.MethodGet, "/api/departments/qa/queue", nil)
		}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) { tc.run(newEnv(t)) })
	}
}

func TestInputEdgeCases(t *testing.T) {
	e := newEnv(t)
	anon := e.anon()
	anon.fail(http.MethodPost, "/api/auth/forgot-password", "x", http.StatusBadRequest)
	anon.fail(http.MethodPost, "/api/auth/reset-password/t", "x", http.StatusBadRequest)
	anon.fail(http.MethodPost, "/api/users/activate/t", "x", http.StatusBadRequest)
	authz := e.login(authzEmail, authzPass)
	authz.fail(http.MethodPost, "/api/users/invite", "x", http.StatusBadRequest)
	authz.fail(http.MethodPost, "/api/users/bad/resend-invite", nil, http.StatusNotFound)
	authz.fail(http.MethodPost, "/api/requests/"+bsonHex()+"/decline", "x", http.StatusBadRequest)

	// bcrypt rejects passwords over 72 bytes after policy validation passes.
	long := strings.Repeat("a", 80) + "1"
	var out userEnvelope
	authz.call(http.MethodPost, "/api/users/invite", map[string]string{"name": "Long Pass", "email": "lp@ncbp.in", "role": "logistics"}, &out)
	expect500(t, anon, http.MethodPost, "/api/users/activate/"+token(out.DevLink), map[string]string{"password": long, "confirmPassword": long})
	expect500(t, anon, http.MethodPost, "/api/auth/reset-password/x", map[string]string{"password": long, "confirmPassword": long})

	// A kiosk route with an invalid staff cookie is rejected.
	req, _ := http.NewRequest(http.MethodGet, e.srv.URL+"/api/kiosk/me", nil)
	req.AddCookie(&http.Cookie{Name: "traackly_session", Value: "garbage"})
	resp, err := http.DefaultClient.Do(req)
	if err != nil || resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("kiosk with bad session: %v", err)
	}
	_ = resp.Body.Close()

	// The WebSocket endpoint requires a credential, and a non-upgrade request fails cleanly.
	anon.fail(http.MethodGet, "/api/ws", nil, http.StatusUnauthorized)
	if code := authz.call(http.MethodGet, "/api/ws", nil, nil); code != http.StatusBadRequest && code != http.StatusUpgradeRequired {
		t.Fatalf("plain GET on ws: %d", code)
	}

	// Station login honors the proxy-appended client address.
	req, _ = http.NewRequest(http.MethodPost, e.srv.URL+"/api/kiosk/session", strings.NewReader(`{"token":"x"}`))
	req.Header.Set("X-Forwarded-For", "203.0.113.9, 10.0.0.1")
	resp, err = http.DefaultClient.Do(req)
	if err != nil || resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("xff station login: %v", err)
	}
	_ = resp.Body.Close()
}

func TestRealtimeChannelsPerRole(t *testing.T) {
	e := newEnv(t)
	coord, _ := e.user("Meera Iyer", domain.RoleCoordinator, "")
	logi, _ := e.user("Arjun Rao", domain.RoleLogistics, "")
	sup, _ := e.user("Sunil Patil", domain.RoleFloorSupervisor, domain.DeptProduction)
	authz := e.login(authzEmail, authzPass)
	authzEvents, logiEvents, supEvents := dialEvents(t, authz), dialEvents(t, logi), dialEvents(t, sup)

	r := coord.post("/api/requests", railwayOrder()).Request
	waitEvent(t, authzEvents, r.ID)
	authz.post("/api/requests/"+r.ID+"/approve", map[string]any{})
	waitEvent(t, logiEvents, r.ID)
	logi.post("/api/requests/"+r.ID+"/timeline", map[string]any{"estimate": e.future(3)})
	waitEvent(t, supEvents, r.ID)
}
