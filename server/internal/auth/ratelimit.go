package auth

import (
	"sync"
	"time"
)

// Login lockout policy from App Flow S-02.
const (
	MaxFailures   = 5
	FailureWindow = 10 * time.Minute
	LockoutPeriod = 60 * time.Second
)

// Limiter locks a key (an email, or an IP) out after repeated failures within a window.
type Limiter struct {
	mu       sync.Mutex
	failures map[string][]time.Time
	locked   map[string]time.Time
	now      func() time.Time
}

// NewLimiter builds a Limiter using the given clock.
func NewLimiter(now func() time.Time) *Limiter {
	return &Limiter{failures: map[string][]time.Time{}, locked: map[string]time.Time{}, now: now}
}

// Allow reports whether key may attempt now, and how long to wait if not.
func (l *Limiter) Allow(key string) (bool, time.Duration) {
	l.mu.Lock()
	defer l.mu.Unlock()
	until, ok := l.locked[key]
	if !ok {
		return true, 0
	}
	if wait := until.Sub(l.now()); wait > 0 {
		return false, wait
	}
	delete(l.locked, key)
	delete(l.failures, key)
	return true, 0
}

// Fail records a failed attempt and reports whether the key is now locked out.
func (l *Limiter) Fail(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := l.now()
	recent := l.failures[key][:0]
	for _, ts := range l.failures[key] {
		if now.Sub(ts) < FailureWindow {
			recent = append(recent, ts)
		}
	}
	recent = append(recent, now)
	l.failures[key] = recent
	if len(recent) >= MaxFailures {
		l.locked[key] = now.Add(LockoutPeriod)
		return true
	}
	return false
}

// Reset clears a key's failure history after a success.
func (l *Limiter) Reset(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.failures, key)
	delete(l.locked, key)
}
