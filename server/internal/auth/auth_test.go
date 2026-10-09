package auth_test

import (
	"testing"
	"time"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/auth"
)

func TestPasswordHashing(t *testing.T) {
	if auth.NewHasher().Cost != 12 {
		t.Fatal("production bcrypt cost must be 12 (TRD Section 9)")
	}
	hasher := &auth.Hasher{Cost: 4}
	h, err := hasher.Hash("secret123")
	if err != nil {
		t.Fatal(err)
	}
	if !auth.CheckPassword(h, "secret123") || auth.CheckPassword(h, "secret124") {
		t.Fatal("password check mismatch")
	}
	if _, err := hasher.Hash(string(make([]byte, 80))); err == nil {
		t.Fatal("bcrypt should reject >72 byte passwords")
	}
}

func TestOpaqueToken(t *testing.T) {
	raw, hash, err := auth.NewOpaqueToken()
	if err != nil || raw == "" || hash != auth.HashToken(raw) || len(hash) != 64 {
		t.Fatalf("raw=%q hash=%q err=%v", raw, hash, err)
	}
	raw2, _, _ := auth.NewOpaqueToken()
	if raw == raw2 {
		t.Fatal("tokens must be random")
	}
}

func TestJWTRoundTrip(t *testing.T) {
	iss := auth.NewIssuer("0123456789abcdef0123456789abcdef", time.Hour, time.Now)
	if iss.TTL() != time.Hour {
		t.Fatal("ttl")
	}
	now := time.Now()
	tok, exp, err := iss.Issue("sess", "user", "coordinator", now)
	if err != nil || !exp.After(now) {
		t.Fatalf("issue: %v", err)
	}
	c, err := iss.Parse(tok)
	if err != nil || c.SessionID != "sess" || c.Subject != "user" || c.Role != "coordinator" {
		t.Fatalf("parse: %+v %v", c, err)
	}
	other := auth.NewIssuer("ffffffffffffffffffffffffffffffff", time.Hour, time.Now)
	if _, err := other.Parse(tok); err == nil {
		t.Fatal("wrong secret must fail")
	}
	old, _, _ := iss.Issue("s", "u", "r", now.Add(-2*time.Hour))
	if _, err := iss.Parse(old); err == nil {
		t.Fatal("expired token must fail")
	}
}

func TestLimiter(t *testing.T) {
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	l := auth.NewLimiter(func() time.Time { return now })
	for i := range auth.MaxFailures - 1 {
		if l.Fail("a") {
			t.Fatalf("locked too early at %d", i)
		}
	}
	if ok, _ := l.Allow("a"); !ok {
		t.Fatal("should still be allowed")
	}
	if !l.Fail("a") {
		t.Fatal("5th failure should lock")
	}
	if ok, wait := l.Allow("a"); ok || wait != auth.LockoutPeriod {
		t.Fatalf("expected lockout, ok=%v wait=%v", ok, wait)
	}
	now = now.Add(auth.LockoutPeriod + time.Second)
	if ok, _ := l.Allow("a"); !ok {
		t.Fatal("lockout should expire")
	}
	l.Fail("b")
	now = now.Add(auth.FailureWindow + time.Second)
	for range auth.MaxFailures - 1 {
		l.Fail("b")
	}
	if ok, _ := l.Allow("b"); !ok {
		t.Fatal("old failures outside the window must not count")
	}
	l.Reset("b")
	if ok, _ := l.Allow("b"); !ok {
		t.Fatal("reset")
	}
}
