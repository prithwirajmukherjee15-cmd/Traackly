package httpapi_test

import (
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/domain"
)

type userEnvelope struct {
	User struct {
		ID         string  `json:"id"`
		Name       string  `json:"name"`
		Email      string  `json:"email"`
		Role       string  `json:"role"`
		Department *string `json:"department"`
		Status     string  `json:"status"`
	} `json:"user"`
	DevLink string `json:"devLink"`
}

func token(link string) string { return link[strings.LastIndex(link, "/")+1:] }

func TestLoginMeLogoutRefresh(t *testing.T) {
	e := newEnv(t)
	anon := e.anon()
	if ae := anon.fail(http.MethodPost, "/api/auth/login", map[string]string{"email": authzEmail, "password": "nope"}, http.StatusUnauthorized); ae.Error.Message != "Incorrect email or password" {
		t.Fatalf("msg %q", ae.Error.Message)
	}
	anon.fail(http.MethodPost, "/api/auth/login", map[string]string{"email": "not-an-email", "password": "x"}, http.StatusUnauthorized)
	anon.fail(http.MethodPost, "/api/auth/login", map[string]string{"email": "ghost@ncbp.in", "password": "x"}, http.StatusUnauthorized)
	anon.fail(http.MethodGet, "/api/auth/me", nil, http.StatusUnauthorized)

	c := e.login(authzEmail, authzPass)
	var me userEnvelope
	if code := c.call(http.MethodGet, "/api/auth/me", nil, &me); code != http.StatusOK || me.User.Role != "authorizer" {
		t.Fatalf("me %d %+v", code, me)
	}
	if code := c.call(http.MethodPost, "/api/auth/refresh", nil, &me); code != http.StatusOK {
		t.Fatalf("refresh %d", code)
	}
	if code := c.call(http.MethodGet, "/api/auth/me", nil, nil); code != http.StatusOK {
		t.Fatal("refreshed session must work")
	}
	if code := c.call(http.MethodPost, "/api/auth/logout", nil, nil); code != http.StatusOK {
		t.Fatal("logout")
	}
	c.fail(http.MethodGet, "/api/auth/me", nil, http.StatusUnauthorized)

	// A tampered cookie is rejected and cleared.
	bad := e.anon()
	req, _ := http.NewRequest(http.MethodGet, e.srv.URL+"/api/auth/me", nil)
	req.AddCookie(&http.Cookie{Name: "traackly_session", Value: "garbage"})
	resp, err := bad.hc.Do(req)
	if err != nil || resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("tampered: %v %v", resp.StatusCode, err)
	}
	_ = resp.Body.Close()
}

func TestSessionExpiresWithClock(t *testing.T) {
	e := newEnv(t)
	c := e.login(authzEmail, authzPass)
	e.clock.Advance(13 * time.Hour)
	c.fail(http.MethodGet, "/api/auth/me", nil, http.StatusUnauthorized)
}

func TestLoginLockout(t *testing.T) {
	e := newEnv(t)
	anon := e.anon()
	body := map[string]string{"email": authzEmail, "password": "wrong"}
	for range 4 {
		anon.fail(http.MethodPost, "/api/auth/login", body, http.StatusUnauthorized)
	}
	ae := anon.fail(http.MethodPost, "/api/auth/login", body, http.StatusTooManyRequests)
	if !strings.Contains(ae.Error.Message, "60 seconds") {
		t.Fatalf("msg %q", ae.Error.Message)
	}
	anon.fail(http.MethodPost, "/api/auth/login", map[string]string{"email": authzEmail, "password": authzPass}, http.StatusTooManyRequests)
	e.clock.Advance(61 * time.Second)
	e.login(authzEmail, authzPass)
}

func TestInviteActivateLoginFlow(t *testing.T) {
	e := newEnv(t)
	authz := e.login(authzEmail, authzPass)
	inv := map[string]string{"name": "Ravi Kumar", "email": "Ravi@NCBP.in", "role": "floor_supervisor", "department": "qa"}
	var out userEnvelope
	if code := authz.call(http.MethodPost, "/api/users/invite", inv, &out); code != http.StatusCreated {
		t.Fatalf("invite %d", code)
	}
	if out.User.Status != "invited" || out.User.Email != "ravi@ncbp.in" || *out.User.Department != "qa" {
		t.Fatalf("invited %+v", out.User)
	}
	if len(e.mail.to("ravi@ncbp.in")) != 1 || !strings.HasPrefix(out.DevLink, testBaseURL+"/activate/") {
		t.Fatalf("invite email/link missing: %q", out.DevLink)
	}
	if ae := authz.fail(http.MethodPost, "/api/users/invite", inv, http.StatusUnprocessableEntity); ae.Error.Fields["email"] == "" {
		t.Fatalf("duplicate should flag email: %+v", ae)
	}
	authz.fail(http.MethodPost, "/api/users/invite", map[string]string{"name": "X", "email": "bad"}, http.StatusUnprocessableEntity)

	// Resending invalidates the first token.
	var resent struct{ DevLink string }
	if code := authz.call(http.MethodPost, "/api/users/"+out.User.ID+"/resend-invite", nil, &resent); code != http.StatusOK {
		t.Fatalf("resend %d", code)
	}
	anon := e.anon()
	anon.fail(http.MethodGet, "/api/users/activate/"+token(out.DevLink), nil, http.StatusNotFound)
	tok := token(resent.DevLink)
	var info struct{ Name, Email string }
	if code := anon.call(http.MethodGet, "/api/users/activate/"+tok, nil, &info); code != http.StatusOK || info.Name != "Ravi Kumar" {
		t.Fatalf("info %d %+v", code, info)
	}
	ae := anon.fail(http.MethodPost, "/api/users/activate/"+tok, map[string]string{"password": "short", "confirmPassword": "other"}, http.StatusUnprocessableEntity)
	if ae.Error.Fields["password"] == "" || ae.Error.Fields["confirmPassword"] == "" {
		t.Fatalf("fields %+v", ae.Error.Fields)
	}
	if code := anon.call(http.MethodPost, "/api/users/activate/"+tok, map[string]string{"password": "floor1234", "confirmPassword": "floor1234"}, nil); code != http.StatusOK {
		t.Fatalf("activate %d", code)
	}
	anon.fail(http.MethodPost, "/api/users/activate/"+tok, map[string]string{"password": "floor1234", "confirmPassword": "floor1234"}, http.StatusNotFound)
	authz.fail(http.MethodPost, "/api/users/"+out.User.ID+"/resend-invite", nil, http.StatusConflict)
	e.login("ravi@ncbp.in", "floor1234")
}

func TestInviteExpires(t *testing.T) {
	e := newEnv(t)
	authz := e.login(authzEmail, authzPass)
	var out userEnvelope
	authz.call(http.MethodPost, "/api/users/invite", map[string]string{"name": "Late User", "email": "late@ncbp.in", "role": "coordinator"}, &out)
	e.clock.Advance(domain.InviteTTL + time.Minute)
	e.anon().fail(http.MethodPost, "/api/users/activate/"+token(out.DevLink), map[string]string{"password": "abcdefg1", "confirmPassword": "abcdefg1"}, http.StatusNotFound)
}

func TestForgotAndResetPassword(t *testing.T) {
	e := newEnv(t)
	anon := e.anon()
	anon.fail(http.MethodPost, "/api/auth/forgot-password", map[string]string{"email": "bad"}, http.StatusUnprocessableEntity)
	var ghost struct{ DevLink string }
	if code := anon.call(http.MethodPost, "/api/auth/forgot-password", map[string]string{"email": "ghost@ncbp.in"}, &ghost); code != http.StatusOK || ghost.DevLink != "" {
		t.Fatal("unknown email must look identical and send nothing")
	}
	old := e.login(authzEmail, authzPass)
	var res struct{ DevLink string }
	anon.call(http.MethodPost, "/api/auth/forgot-password", map[string]string{"email": authzEmail}, &res)
	if res.DevLink == "" || len(e.mail.to(authzEmail)) != 1 {
		t.Fatal("reset link not issued")
	}
	tok := token(res.DevLink)
	anon.fail(http.MethodPost, "/api/auth/reset-password/"+tok, map[string]string{"password": "x", "confirmPassword": "x"}, http.StatusUnprocessableEntity)
	anon.fail(http.MethodPost, "/api/auth/reset-password/nope", map[string]string{"password": "newpass99", "confirmPassword": "newpass99"}, http.StatusNotFound)
	if code := anon.call(http.MethodPost, "/api/auth/reset-password/"+tok, map[string]string{"password": "newpass99", "confirmPassword": "newpass99"}, nil); code != http.StatusOK {
		t.Fatalf("reset %d", code)
	}
	old.fail(http.MethodGet, "/api/auth/me", nil, http.StatusUnauthorized)
	e.login(authzEmail, "newpass99")

	anon.call(http.MethodPost, "/api/auth/forgot-password", map[string]string{"email": authzEmail}, &res)
	e.clock.Advance(domain.ResetTTL + time.Minute)
	ae := anon.fail(http.MethodPost, "/api/auth/reset-password/"+token(res.DevLink), map[string]string{"password": "newpass77", "confirmPassword": "newpass77"}, http.StatusNotFound)
	if !strings.Contains(ae.Error.Message, "expired") {
		t.Fatalf("msg %q", ae.Error.Message)
	}
}

func TestDeactivationIsRealTime(t *testing.T) {
	e := newEnv(t)
	coord, u := e.user("Meera Iyer", domain.RoleCoordinator, "")
	events := dialEvents(t, coord)
	authz := e.login(authzEmail, authzPass)

	var list struct {
		Users []struct{ ID, Status string } `json:"users"`
	}
	if code := authz.call(http.MethodGet, "/api/users", nil, &list); code != http.StatusOK || len(list.Users) != 2 {
		t.Fatalf("users %d %+v", code, list)
	}
	authz.fail(http.MethodPatch, "/api/users/"+u.ID.Hex(), map[string]string{"status": "active"}, http.StatusBadRequest)
	if code := authz.call(http.MethodPatch, "/api/users/"+u.ID.Hex(), map[string]string{"status": "deactivated"}, nil); code != http.StatusOK {
		t.Fatalf("deactivate %d", code)
	}
	select {
	case ev := <-events:
		if ev != "session.revoked:" {
			t.Fatalf("event %q", ev)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("no session.revoked event")
	}
	ae := coord.fail(http.MethodGet, "/api/requests", nil, http.StatusUnauthorized)
	if ae.Error.Code != "access_removed" {
		t.Fatalf("code %q", ae.Error.Code)
	}
	authz.fail(http.MethodPatch, "/api/users/"+u.ID.Hex(), map[string]string{"status": "deactivated"}, http.StatusConflict)
	e.anon().fail(http.MethodPost, "/api/auth/login", map[string]string{"email": "meera.iyer@ncbp.in", "password": "password1"}, http.StatusUnauthorized)
}

func TestLastAuthorizerGuard(t *testing.T) {
	e := newEnv(t)
	authz := e.login(authzEmail, authzPass)
	ae := authz.fail(http.MethodPatch, "/api/users/"+e.authz.ID.Hex(), map[string]string{"status": "deactivated"}, http.StatusConflict)
	if !strings.Contains(ae.Error.Message, "only active Authorizer") {
		t.Fatalf("msg %q", ae.Error.Message)
	}
	_, second := e.user("Second Authz", domain.RoleAuthorizer, "")
	if code := authz.call(http.MethodPatch, "/api/users/"+second.ID.Hex(), map[string]string{"status": "deactivated"}, nil); code != http.StatusOK {
		t.Fatalf("deactivate second %d", code)
	}
	authz.fail(http.MethodPatch, "/api/users/"+bsonHex(), map[string]string{"status": "deactivated"}, http.StatusNotFound)
	authz.fail(http.MethodPatch, "/api/users/not-an-id", map[string]string{"status": "deactivated"}, http.StatusNotFound)
}

func TestMiscEndpoints(t *testing.T) {
	e := newEnv(t)
	anon := e.anon()
	var h struct{ Status string }
	if code := anon.call(http.MethodGet, "/api/health", nil, &h); code != http.StatusOK || h.Status != "ok" {
		t.Fatalf("health %d", code)
	}
	anon.fail(http.MethodGet, "/api/nope", nil, http.StatusNotFound)
	anon.fail(http.MethodPost, "/api/auth/login", "not-an-object", http.StatusBadRequest)
	c := e.login(authzEmail, authzPass)
	var depts struct {
		Departments []struct{ ID, DisplayName string } `json:"departments"`
	}
	if code := c.call(http.MethodGet, "/api/departments", nil, &depts); code != http.StatusOK || len(depts.Departments) != 3 {
		t.Fatalf("departments %d %+v", code, depts)
	}
	c.fail(http.MethodPost, "/api/requests", railwayOrder(), http.StatusForbidden)
}
