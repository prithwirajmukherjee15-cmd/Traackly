package realtime_test

import (
	"encoding/json"
	"testing"

	"go.mongodb.org/mongo-driver/v2/bson"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/domain"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/realtime"
)

func TestHubDeliversOncePerSubscriber(t *testing.T) {
	h := realtime.NewHub()
	id := bson.NewObjectID()
	both := h.Subscribe(realtime.ChanAuthorizer, realtime.ChanDepartment(domain.DeptQA))
	other := h.Subscribe(realtime.ChanCoordinator(id))
	if err := h.Publish(realtime.Event{Type: realtime.EventRequestChanged, RequestID: "r1"},
		realtime.ChanAuthorizer, realtime.ChanDepartment(domain.DeptQA)); err != nil {
		t.Fatal(err)
	}
	if len(both.C) != 1 || len(other.C) != 0 {
		t.Fatalf("both=%d other=%d", len(both.C), len(other.C))
	}
	var ev realtime.Event
	if err := json.Unmarshal(<-both.C, &ev); err != nil || ev.RequestID != "r1" {
		t.Fatalf("event %+v %v", ev, err)
	}
	h.Unsubscribe(both)
	_ = h.Publish(realtime.Event{Type: "x"}, realtime.ChanAuthorizer)
	if len(both.C) != 0 {
		t.Fatal("unsubscribed must not receive")
	}
	if realtime.ChanUser(id) != "user:"+id.Hex() {
		t.Fatal("ChanUser")
	}
}

func TestHubDropsWhenFull(t *testing.T) {
	h := realtime.NewHub()
	s := h.Subscribe(realtime.ChanLogistics)
	for range 100 {
		_ = h.Publish(realtime.Event{Type: "x"}, realtime.ChanLogistics)
	}
	if len(s.C) != cap(s.C) {
		t.Fatalf("expected full buffer, got %d", len(s.C))
	}
}
