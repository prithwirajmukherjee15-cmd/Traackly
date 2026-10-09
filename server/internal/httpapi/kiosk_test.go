package httpapi_test

import (
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/domain"
)

type kioskMe struct {
	Department, DisplayName, Mode, Name string
}

// scheduledJob creates a request routed to dept and scheduled by Logistics.
func scheduledJob(t *testing.T, e *env, dept string) reqDTO {
	t.Helper()
	coord, _ := e.user("Meera Iyer", domain.RoleCoordinator, "")
	logi, _ := e.user("Arjun Rao", domain.RoleLogistics, "")
	body := railwayOrder()
	body["targetDepartment"] = dept
	r := coord.post("/api/requests", body).Request
	e.login(authzEmail, authzPass).post("/api/requests/"+r.ID+"/approve", map[string]any{})
	return logi.post("/api/requests/"+r.ID+"/timeline", map[string]any{"estimate": e.future(4)}).Request
}

func TestStationProvisioningAndRevocation(t *testing.T) {
	e := newEnv(t)
	authz := e.login(authzEmail, authzPass)
	authz.fail(http.MethodPost, "/api/stations/paint", nil, http.StatusNotFound)
	authz.fail(http.MethodDelete, "/api/stations/paint", nil, http.StatusNotFound)
	var prov struct{ Token string }
	authz.call(http.MethodPost, "/api/stations/qa", nil, &prov)

	kiosk := e.anon()
	kiosk.fail(http.MethodGet, "/api/kiosk/me", nil, http.StatusUnauthorized)
	kiosk.fail(http.MethodPost, "/api/kiosk/session", map[string]string{"token": ""}, http.StatusUnauthorized)
	kiosk.fail(http.MethodPost, "/api/kiosk/session", "x", http.StatusBadRequest)
	var me kioskMe
	if code := kiosk.call(http.MethodPost, "/api/kiosk/session", map[string]string{"token": prov.Token}, &me); code != http.StatusOK || me.Mode != "station" || me.Department != "qa" {
		t.Fatalf("station login %d %+v", code, me)
	}
	if code := kiosk.call(http.MethodGet, "/api/kiosk/me", nil, &me); code != http.StatusOK || me.DisplayName != "QA" {
		t.Fatalf("kiosk me %d", code)
	}
	// Station credentials never unlock staff routes.
	kiosk.fail(http.MethodGet, "/api/requests", nil, http.StatusUnauthorized)
	kiosk.fail(http.MethodGet, "/api/departments/production/queue", nil, http.StatusNotFound)

	var stations struct {
		Stations []struct {
			Department string
			Revoked    bool
		} `json:"stations"`
	}
	authz.call(http.MethodGet, "/api/stations", nil, &stations)
	if len(stations.Stations) != 1 || stations.Stations[0].Revoked {
		t.Fatalf("stations %+v", stations)
	}
	if code := authz.call(http.MethodDelete, "/api/stations/qa", nil, nil); code != http.StatusOK {
		t.Fatal("revoke")
	}
	kiosk.fail(http.MethodGet, "/api/kiosk/me", nil, http.StatusUnauthorized)
	if code := kiosk.call(http.MethodDelete, "/api/kiosk/session", nil, nil); code != http.StatusOK {
		t.Fatal("station logout")
	}
}

func TestStationLoginRateLimit(t *testing.T) {
	e := newEnv(t)
	kiosk := e.anon()
	for range 4 {
		kiosk.fail(http.MethodPost, "/api/kiosk/session", map[string]string{"token": "guess"}, http.StatusUnauthorized)
	}
	kiosk.fail(http.MethodPost, "/api/kiosk/session", map[string]string{"token": "guess"}, http.StatusUnauthorized)
	kiosk.fail(http.MethodPost, "/api/kiosk/session", map[string]string{"token": "guess"}, http.StatusTooManyRequests)
}

func TestFloorSupervisorLoginKiosk(t *testing.T) {
	e := newEnv(t)
	job := scheduledJob(t, e, "supply")
	sup, _ := e.user("Sunil Patil", domain.RoleFloorSupervisor, domain.DeptSupply)
	prod, _ := e.user("Prod Sup", domain.RoleFloorSupervisor, domain.DeptProduction)
	coord := e.login("meera.iyer@ncbp.in", "password1")

	var me kioskMe
	if code := sup.call(http.MethodGet, "/api/kiosk/me", nil, &me); code != http.StatusOK || me.Mode != "supervisor" || me.Name != "Sunil Patil" {
		t.Fatalf("me %d %+v", code, me)
	}
	coord.fail(http.MethodGet, "/api/kiosk/me", nil, http.StatusForbidden)
	sup.fail(http.MethodGet, "/api/requests", nil, http.StatusForbidden)
	if q := sup.list("/api/departments/supply/queue"); len(q) != 1 {
		t.Fatalf("queue %d", len(q))
	}
	prod.fail(http.MethodGet, "/api/kiosk/jobs/"+job.ID, nil, http.StatusNotFound)
	prod.fail(http.MethodPost, "/api/kiosk/jobs/"+job.ID+"/start", map[string]string{}, http.StatusNotFound)
	sup.fail(http.MethodGet, "/api/kiosk/jobs/xyz", nil, http.StatusNotFound)
	sup.fail(http.MethodPost, "/api/kiosk/jobs/xyz/start", map[string]string{}, http.StatusNotFound)

	// Edit before acknowledgement: start is blocked; acknowledgment by a logged-in supervisor is attributed to them.
	edit := railwayOrder()
	edit["targetDepartment"] = "supply"
	edit["priority"] = "normal"
	e.login(authzEmail, authzPass).call(http.MethodPatch, "/api/requests/"+job.ID, edit, nil)
	sup.fail(http.MethodPost, "/api/kiosk/jobs/"+job.ID+"/start", map[string]string{}, http.StatusConflict)
	acked := sup.post("/api/requests/"+job.ID+"/acknowledge", map[string]string{}).Request
	if acked.Acknowledged == nil || acked.Acknowledged.By != "Sunil Patil" {
		t.Fatalf("ack %+v", acked.Acknowledged)
	}
	if code := sup.call(http.MethodPost, "/api/auth/logout", nil, nil); code != http.StatusOK {
		t.Fatal("supervisor logout")
	}
	sup.fail(http.MethodGet, "/api/kiosk/me", nil, http.StatusUnauthorized)
}

func TestSPAStaticServing(t *testing.T) {
	e := newEnv(t)
	get := func(path string) (int, string, string) {
		resp, err := http.Get(e.srv.URL + path)
		if err != nil {
			t.Fatal(err)
		}
		defer func() { _ = resp.Body.Close() }()
		b, _ := io.ReadAll(resp.Body)
		return resp.StatusCode, string(b), resp.Header.Get("Cache-Control")
	}
	if code, body, _ := get("/requests/abc"); code != http.StatusOK || !strings.Contains(body, "traackly") {
		t.Fatalf("spa fallback %d %q", code, body)
	}
	if code, body, cc := get("/assets/app.js"); code != http.StatusOK || !strings.Contains(body, "console") || !strings.Contains(cc, "immutable") {
		t.Fatalf("asset %d %q %q", code, body, cc)
	}
	if code, _, _ := get("/../../etc/passwd"); code != http.StatusOK {
		t.Fatal("traversal must fall back to index")
	}
	if code, _, _ := get("/api/unknown"); code != http.StatusNotFound {
		t.Fatal("api 404")
	}
}
