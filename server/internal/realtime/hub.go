// Package realtime fans request-change events out to connected WebSocket clients.
//
// Events carry only identifiers; clients refetch through the normal, permission-
// checked REST endpoints, so a channel subscription never leaks request content.
package realtime

import (
	"encoding/json"
	"fmt"
	"sync"

	"go.mongodb.org/mongo-driver/v2/bson"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/domain"
)

// Event types.
const (
	EventRequestChanged = "request.changed"
	EventSessionRevoked = "session.revoked"
	EventUsersChanged   = "users.changed"
)

const subscriberBuffer = 32

// Channel names (App Flow S-10/S-20/S-30/S-40).
const (
	ChanAuthorizer = "requests:authorizer"
	ChanLogistics  = "requests:logistics"
)

// ChanCoordinator is a coordinator's own-requests channel.
func ChanCoordinator(id bson.ObjectID) string { return "requests:coordinator:" + id.Hex() }

// ChanDepartment is a department kiosk channel.
func ChanDepartment(d domain.Department) string { return "requests:department:" + string(d) }

// ChanUser is a per-user control channel (e.g. forced logout on deactivation).
func ChanUser(id bson.ObjectID) string { return "user:" + id.Hex() }

// Event is the payload pushed to clients.
type Event struct {
	Type      string `json:"type"`
	RequestID string `json:"requestId,omitempty"`
}

// Subscription receives encoded events on C.
type Subscription struct {
	C        chan []byte
	channels []string
}

// Hub routes events to subscriptions by channel.
type Hub struct {
	mu   sync.RWMutex
	subs map[string]map[*Subscription]struct{}
}

// NewHub builds an empty hub.
func NewHub() *Hub {
	return &Hub{subs: map[string]map[*Subscription]struct{}{}}
}

// Subscribe registers a subscription to channels.
func (h *Hub) Subscribe(channels ...string) *Subscription {
	s := &Subscription{C: make(chan []byte, subscriberBuffer), channels: channels}
	h.mu.Lock()
	defer h.mu.Unlock()
	for _, c := range channels {
		if h.subs[c] == nil {
			h.subs[c] = map[*Subscription]struct{}{}
		}
		h.subs[c][s] = struct{}{}
	}
	return s
}

// Unsubscribe removes a subscription.
func (h *Hub) Unsubscribe(s *Subscription) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for _, c := range s.channels {
		delete(h.subs[c], s)
		if len(h.subs[c]) == 0 {
			delete(h.subs, c)
		}
	}
}

// Publish delivers ev once to every subscription on any of channels.
// Slow subscribers drop events rather than block publishers; clients refetch on reconnect.
func (h *Hub) Publish(ev Event, channels ...string) error {
	payload, err := json.Marshal(ev)
	if err != nil {
		return fmt.Errorf("encode event: %w", err)
	}
	h.mu.RLock()
	defer h.mu.RUnlock()
	seen := map[*Subscription]bool{}
	for _, c := range channels {
		for s := range h.subs[c] {
			if seen[s] {
				continue
			}
			seen[s] = true
			select {
			case s.C <- payload:
			default:
			}
		}
	}
	return nil
}
