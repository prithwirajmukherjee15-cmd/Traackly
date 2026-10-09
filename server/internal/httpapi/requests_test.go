package httpapi_test

import (
	"net/http"
	"strings"
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/domain"
)

func bsonHex() string { return bson.NewObjectID().Hex() }

func TestCreateRequestValidationAndOwnership(t *testing.T) {
	e := newEnv(t)
	coord, u := e.user("Meera Iyer", domain.RoleCoordinator, "")
	other, _ := e.user("Other Coord", domain.RoleCoordinator, "")

	ae := coord.fail(http.MethodPost, "/api/requests", map[string]string{"clientName": " "}, http.StatusUnprocessableEntity)
	if ae.Error.Fields["clientName"] != "Client name is required" || ae.Error.Fields["targetDepartment"] == "" {
		t.Fatalf("fields %+v", ae.Error.Fields)
	}
	coord.fail(http.MethodPost, "/api/requests", map[string]any{"clientName": "x", "unknown": 1}, http.StatusBadRequest)

	r := coord.post("/api/requests", railwayOrder()).Request
	if r.State != "raised" || r.RaisedBy.Name != "Meera Iyer" || !strings.HasPrefix(r.JobCode, "TRK-") {
		t.Fatalf("created %+v", r)
	}
	if got := coord.list("/api/requests"); len(got) != 1 {
		t.Fatalf("own list %d", len(got))
	}
	if got := coord.list("/api/requests?state=completed"); len(got) != 0 {
		t.Fatal("state filter")
	}
	if got := coord.list("/api/coordinators/" + u.ID.Hex() + "/requests"); len(got) != 1 {
		t.Fatal("coordinator alias route")
	}
	coord.fail(http.MethodGet, "/api/coordinators/"+bsonHex()+"/requests", nil, http.StatusNotFound)
	coord.fail(http.MethodGet, "/api/coordinators/bad/requests", nil, http.StatusNotFound)
	if got := other.list("/api/requests"); len(got) != 0 {
		t.Fatal("coordinators only see their own requests")
	}
	if ae := other.fail(http.MethodGet, "/api/requests/"+r.ID, nil, http.StatusNotFound); ae.Error.Message != "Request not found" {
		t.Fatalf("msg %q", ae.Error.Message)
	}
	coord.fail(http.MethodGet, "/api/requests/"+bsonHex(), nil, http.StatusNotFound)
	coord.fail(http.MethodGet, "/api/requests/xyz", nil, http.StatusNotFound)
	coord.fail(http.MethodPatch, "/api/requests/"+r.ID, railwayOrder(), http.StatusForbidden)
}

func TestAuthorizerQueueApproveWithEditsAndDecline(t *testing.T) {
	e := newEnv(t)
	coord, _ := e.user("Meera Iyer", domain.RoleCoordinator, "")
	logi, _ := e.user("Arjun Rao", domain.RoleLogistics, "")
	authz := e.login(authzEmail, authzPass)
	a := coord.post("/api/requests", railwayOrder()).Request
	b := coord.post("/api/requests", railwayOrder()).Request

	if got := authz.list("/api/requests?view=pending"); len(got) != 2 {
		t.Fatalf("pending %d", len(got))
	}
	if got := logi.list("/api/requests"); len(got) != 0 {
		t.Fatal("logistics must not see raised requests")
	}
	logi.fail(http.MethodGet, "/api/requests/"+a.ID, nil, http.StatusNotFound)

	// Pre-approval edits change fields but write no changelog.
	edit := railwayOrder()
	edit["clientName"] = "Indian Railways (Central)"
	approved := authz.post("/api/requests/"+a.ID+"/approve", map[string]any{"fields": edit, "expectedUpdatedAt": a.UpdatedAt}).Request
	if approved.ClientName != "Indian Railways (Central)" || len(approved.Changelog) != 0 || approved.State != "in_progress" {
		t.Fatalf("approved %+v", approved)
	}
	authz.fail(http.MethodPost, "/api/requests/"+a.ID+"/approve", map[string]any{}, http.StatusConflict)
	authz.fail(http.MethodPost, "/api/requests/"+bsonHex()+"/approve", map[string]any{}, http.StatusNotFound)
	authz.fail(http.MethodPost, "/api/requests/"+a.ID+"/approve", "x", http.StatusBadRequest)

	if ae := authz.fail(http.MethodPost, "/api/requests/"+b.ID+"/decline", map[string]string{"reason": ""}, http.StatusUnprocessableEntity); ae.Error.Message != "Enter a reason" {
		t.Fatalf("msg %q", ae.Error.Message)
	}
	authz.fail(http.MethodPost, "/api/requests/xyz/decline", map[string]string{"reason": "x"}, http.StatusNotFound)
	declined := authz.post("/api/requests/"+b.ID+"/decline", map[string]string{"reason": "Out of capacity"}).Request
	if declined.State != "declined" || *declined.DeclineReason != "Out of capacity" {
		t.Fatalf("declined %+v", declined)
	}
	if len(e.mail.to("meera.iyer@ncbp.in")) != 1 {
		t.Fatal("coordinator must be emailed the decline")
	}
	if got := coord.request("/api/requests/" + b.ID); *got.DeclineReason != "Out of capacity" {
		t.Fatal("coordinator sees reason")
	}
	authz.fail(http.MethodPatch, "/api/requests/"+b.ID, railwayOrder(), http.StatusConflict)
	if got := authz.list("/api/requests?view=authorized"); len(got) != 1 {
		t.Fatalf("authorized %d", len(got))
	}
	if got := authz.list("/api/requests"); len(got) != 2 {
		t.Fatalf("all %d", len(got))
	}
	if got := authz.request("/api/requests/" + b.ID); got.StatusHistory[len(got.StatusHistory)-1].Actor != "Founder's Office" {
		t.Fatalf("history %+v", got.StatusHistory)
	}
}

func TestOptimisticConcurrency(t *testing.T) {
	e := newEnv(t)
	coord, _ := e.user("Meera Iyer", domain.RoleCoordinator, "")
	_, _ = e.user("Second Authz", domain.RoleAuthorizer, "")
	s1 := e.login(authzEmail, authzPass)
	s2 := e.login("second.authz@ncbp.in", "password1")
	r := coord.post("/api/requests", railwayOrder()).Request

	edit := railwayOrder()
	edit["priority"] = "normal"
	edit["expectedUpdatedAt"] = r.UpdatedAt
	if code := s1.call(http.MethodPatch, "/api/requests/"+r.ID, edit, nil); code != http.StatusOK {
		t.Fatalf("first edit %d", code)
	}
	ae := s2.fail(http.MethodPost, "/api/requests/"+r.ID+"/approve", map[string]any{"expectedUpdatedAt": r.UpdatedAt}, http.StatusConflict)
	if !strings.Contains(ae.Error.Message, "another session") {
		t.Fatalf("msg %q", ae.Error.Message)
	}
	s2.fail(http.MethodPatch, "/api/requests/"+r.ID, edit, http.StatusConflict)
	s2.fail(http.MethodPatch, "/api/requests/xyz", edit, http.StatusNotFound)
}

func TestLogisticsQueueAndTimeline(t *testing.T) {
	e := newEnv(t)
	coord, _ := e.user("Meera Iyer", domain.RoleCoordinator, "")
	logi, _ := e.user("Arjun Rao", domain.RoleLogistics, "")
	authz := e.login(authzEmail, authzPass)
	r := coord.post("/api/requests", railwayOrder()).Request
	authz.post("/api/requests/"+r.ID+"/approve", map[string]any{})

	if got := logi.list("/api/requests"); len(got) != 1 {
		t.Fatalf("queue %d", len(got))
	}
	ae := logi.fail(http.MethodPost, "/api/requests/"+r.ID+"/timeline", map[string]any{"estimate": e.future(-1)}, http.StatusUnprocessableEntity)
	if ae.Error.Fields["estimate"] == "" {
		t.Fatalf("fields %+v", ae.Error.Fields)
	}
	logi.fail(http.MethodPost, "/api/requests/"+r.ID+"/timeline", map[string]any{}, http.StatusUnprocessableEntity)
	logi.fail(http.MethodPost, "/api/requests/xyz/timeline", map[string]any{"estimate": e.future(2)}, http.StatusNotFound)
	var out reqEnvelope
	if code := logi.call(http.MethodPatch, "/api/requests/"+r.ID+"/timeline", map[string]any{"estimate": e.future(3)}, &out); code != http.StatusOK {
		t.Fatalf("timeline %d", code)
	}
	if out.Request.Timeline == nil || out.Request.Timeline.SetBy.Name != "Arjun Rao" {
		t.Fatalf("timeline %+v", out.Request.Timeline)
	}
	if got := logi.list("/api/requests"); len(got) != 0 {
		t.Fatal("scheduled request leaves the queue")
	}
	if got := logi.list("/api/requests?view=scheduled"); len(got) != 1 {
		t.Fatal("scheduled view")
	}

	// A post-authorization edit puts it back in the Logistics queue, flagged.
	edit := railwayOrder()
	edit["targetDepartment"] = "qa"
	var edited reqEnvelope
	authz.call(http.MethodPatch, "/api/requests/"+r.ID, edit, &edited)
	if edited.NextOwners != "Logistics and the QA floor" {
		t.Fatalf("next owners %q", edited.NextOwners)
	}
	queue := logi.list("/api/requests")
	if len(queue) != 1 || queue[0].State != "updated" {
		t.Fatalf("flagged queue %+v", queue)
	}

	// No-op edit reports no next owners.
	var noop reqEnvelope
	authz.call(http.MethodPatch, "/api/requests/"+r.ID, edit, &noop)
	if noop.NextOwners != "" {
		t.Fatalf("noop next owners %q", noop.NextOwners)
	}

	// Two edit events plus the clock running past the window marks it at risk.
	edit["priority"] = "normal"
	e.clock.Advance(time.Second)
	authz.call(http.MethodPatch, "/api/requests/"+r.ID, edit, nil)
	e.clock.Advance(25 * time.Hour)
	risk := e.login(authzEmail, authzPass).request("/api/requests/" + r.ID).Risk
	if !risk.AtRisk || len(risk.Reasons) != 2 {
		t.Fatalf("risk %+v", risk)
	}
	e.login("arjun.rao@ncbp.in", "password1").fail(http.MethodPost, "/api/requests", railwayOrder(), http.StatusForbidden)
}

func TestNotificationFailureIsLogged(t *testing.T) {
	e := newEnv(t)
	coord, _ := e.user("Meera Iyer", domain.RoleCoordinator, "")
	_, _ = e.user("Arjun Rao", domain.RoleLogistics, "")
	authz := e.login(authzEmail, authzPass)
	r := coord.post("/api/requests", railwayOrder()).Request
	e.mail.fail = true
	authz.post("/api/requests/"+r.ID+"/approve", map[string]any{})
	id, _ := bson.ObjectIDFromHex(r.ID)
	ns, err := e.st.NotificationsForRequest(t.Context(), id)
	if err != nil || len(ns) != 1 || ns[0].Status != domain.NotifyFailed || ns[0].FailureReason == nil {
		t.Fatalf("notifications %+v %v", ns, err)
	}
}
