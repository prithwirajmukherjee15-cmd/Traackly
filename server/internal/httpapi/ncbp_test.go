package httpapi_test

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/domain"
)

// TestNCBPIncidentEndToEnd is the most important test in the codebase (Implementation Plan, Phase 4).
// It replays the PRD's railway-order incident through the real API: raise, authorize, schedule,
// edit after authorization, flag, block, acknowledge, unblock, and verifies the exact changelog.
func TestNCBPIncidentEndToEnd(t *testing.T) {
	e := newEnv(t)
	coord, _ := e.user("Meera Iyer", domain.RoleCoordinator, "")
	logi, _ := e.user("Arjun Rao", domain.RoleLogistics, "")
	authz := e.login(authzEmail, authzPass)

	// Provision the Production kiosk and connect it with no staff login involved.
	var prov struct{ Token, URL string }
	if code := authz.call(http.MethodPost, "/api/stations/production", nil, &prov); code != http.StatusCreated {
		t.Fatalf("provision: %d", code)
	}
	if !strings.HasPrefix(prov.URL, testBaseURL+"/kiosk/connect#") {
		t.Fatalf("url %q", prov.URL)
	}
	kiosk := e.anon()
	if code := kiosk.call(http.MethodPost, "/api/kiosk/session", map[string]string{"token": prov.Token}, nil); code != http.StatusOK {
		t.Fatalf("station login: %d", code)
	}
	events := dialEvents(t, kiosk)

	// Story 1-2: raise and authorize.
	created := coord.post("/api/requests", railwayOrder()).Request
	if created.State != "raised" {
		t.Fatalf("state %s", created.State)
	}
	approved := authz.post("/api/requests/"+created.ID+"/approve", map[string]any{"expectedUpdatedAt": created.UpdatedAt}).Request
	if approved.State != "in_progress" {
		t.Fatalf("approve state %s", approved.State)
	}
	if len(e.mail.to("arjun.rao@ncbp.in")) != 1 {
		t.Fatal("logistics must be notified on approval")
	}

	// Story 4: Logistics schedules it, which routes the job to the Production kiosk.
	logi.post("/api/requests/"+created.ID+"/timeline", map[string]any{"estimate": e.future(5)})
	waitEvent(t, events, created.ID)
	queue := kiosk.list("/api/departments/production/queue")
	if len(queue) != 1 || queue[0].ID != created.ID || queue[0].FloorBlocker != "" {
		t.Fatalf("queue %+v", queue)
	}
	kiosk.post("/api/kiosk/jobs/"+created.ID+"/start", map[string]string{})

	// Story 3: the Authorizer edits the spec after authorization.
	edit := railwayOrder()
	edit["requirementDetails"] = "Brush holders BH-42, 42mm"
	var edited reqEnvelope
	if code := authz.call(http.MethodPatch, "/api/requests/"+created.ID, edit, &edited); code != http.StatusOK {
		t.Fatalf("edit: %d", code)
	}
	if edited.Request.State != "updated" || edited.NextOwners != "Logistics and the Production floor" {
		t.Fatalf("edit result %+v / %q", edited.Request.State, edited.NextOwners)
	}
	waitEvent(t, events, created.ID)
	if len(e.mail.to("arjun.rao@ncbp.in")) != 2 {
		t.Fatal("logistics must be notified of the change")
	}

	// Story 6: the kiosk shows the flag and refuses to finish on the stale spec.
	job := kiosk.request("/api/kiosk/jobs/" + created.ID)
	if job.State != "updated" || job.FloorBlocker != domain.MsgAcknowledgeFirst {
		t.Fatalf("job %+v", job)
	}
	last := job.Changelog[len(job.Changelog)-1]
	if last.Field != "requirementDetails" || last.OldValue != "Brush holders BH-40, 40mm" ||
		last.NewValue != "Brush holders BH-42, 42mm" || last.ChangedBy.Name != "Founder's Office" {
		t.Fatalf("changelog %+v", last)
	}
	blocked := kiosk.fail(http.MethodPost, "/api/kiosk/jobs/"+created.ID+"/complete", map[string]string{}, http.StatusConflict)
	if blocked.Error.Code != "blocked" || blocked.Error.Message != domain.MsgAcknowledgeFirst {
		t.Fatalf("blocked %+v", blocked)
	}

	// Floor acknowledges (with a name tap); Logistics must still revise the timeline.
	acked := kiosk.post("/api/requests/"+created.ID+"/acknowledge", map[string]string{"name": "Sunil"}).Request
	if acked.FloorBlocker != domain.MsgAwaitLogistics || acked.Acknowledged == nil || acked.Acknowledged.By != "Sunil" {
		t.Fatalf("after floor ack %+v", acked)
	}
	again := kiosk.post("/api/requests/"+created.ID+"/acknowledge", map[string]string{}).Request
	if again.State != "updated" {
		t.Fatal("repeat acknowledgment must be a silent no-op")
	}
	logi.post("/api/requests/"+created.ID+"/timeline", map[string]any{"estimate": e.future(7)})

	done := kiosk.post("/api/kiosk/jobs/"+created.ID+"/complete", map[string]string{"name": "Sunil"}).Request
	if done.State != "completed" {
		t.Fatalf("final state %s", done.State)
	}

	// Story 7: the coordinator sees the whole history.
	final := coord.request("/api/requests/" + created.ID)
	if final.State != "completed" || len(final.Changelog) != 1 {
		t.Fatalf("coordinator view %+v", final)
	}
	if len(kiosk.list("/api/departments/production/queue")) != 0 {
		t.Fatal("completed job must leave the kiosk queue")
	}
}

func dialEvents(t *testing.T, c *client) <-chan string {
	t.Helper()
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	conn, resp, err := websocket.Dial(ctx, "ws"+strings.TrimPrefix(c.e.srv.URL, "http")+"/api/ws", &websocket.DialOptions{HTTPClient: c.hc})
	if err != nil {
		t.Fatalf("ws dial: %v", err)
	}
	if resp.Body != nil {
		_ = resp.Body.Close()
	}
	t.Cleanup(func() { _ = conn.CloseNow() })
	out := make(chan string, 32)
	go func() {
		for {
			_, msg, err := conn.Read(ctx)
			if err != nil {
				return
			}
			var ev struct {
				Type      string `json:"type"`
				RequestID string `json:"requestId"`
			}
			_ = json.Unmarshal(msg, &ev)
			out <- ev.Type + ":" + ev.RequestID
		}
	}()
	return out
}

func waitEvent(t *testing.T, events <-chan string, requestID string) {
	t.Helper()
	timeout := time.After(2 * time.Second)
	for {
		select {
		case ev := <-events:
			if ev == "request.changed:"+requestID {
				return
			}
		case <-timeout:
			t.Fatalf("no request.changed event for %s within 2s", requestID)
		}
	}
}
