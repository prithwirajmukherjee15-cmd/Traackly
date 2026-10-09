package notify_test

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/notify"
)

func TestLogMailer(t *testing.T) {
	var buf bytes.Buffer
	m := &notify.LogMailer{Logger: slog.New(slog.NewTextHandler(&buf, nil))}
	if err := m.Send(context.Background(), notify.Message{To: "a@b.in", Subject: "Hi", Text: "body"}); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(buf.String(), "a@b.in") {
		t.Fatalf("log missing recipient: %s", buf.String())
	}
}

func TestResendMailer(t *testing.T) {
	var got map[string]any
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer key" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		_ = json.NewDecoder(r.Body).Decode(&got)
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()
	m := notify.NewResendMailer("key", "Traackly <n@t.app>")
	m.Endpoint = srv.URL
	if err := m.Send(context.Background(), notify.Message{To: "a@b.in", Subject: "S", Text: "T"}); err != nil {
		t.Fatal(err)
	}
	if got["subject"] != "S" || got["from"] != "Traackly <n@t.app>" {
		t.Fatalf("payload %v", got)
	}
	m.APIKey = "wrong"
	if err := m.Send(context.Background(), notify.Message{To: "a@b.in"}); err == nil {
		t.Fatal("non-2xx must error")
	}
	m.Endpoint = "http://127.0.0.1:1"
	if err := m.Send(context.Background(), notify.Message{To: "a@b.in"}); err == nil {
		t.Fatal("connection failure must error")
	}
	m.Endpoint = "://bad"
	if err := m.Send(context.Background(), notify.Message{To: "a@b.in"}); err == nil {
		t.Fatal("bad url must error")
	}
}
