// Package notify sends transactional email through a pluggable Mailer.
package notify

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/apperrors"
)

const (
	// ResendEndpoint is the Resend email API URL.
	ResendEndpoint = "https://api.resend.com/emails"
	httpTimeout    = 10 * time.Second
	maxErrorDetail = 512
)

// Message is one outbound email.
type Message struct {
	To      string
	Subject string
	Text    string
}

// Mailer delivers messages.
type Mailer interface {
	Send(ctx context.Context, m Message) error
}

// LogMailer writes messages to the structured log instead of sending them (local development).
type LogMailer struct {
	Logger *slog.Logger
}

// Send logs the message.
func (l *LogMailer) Send(ctx context.Context, m Message) error {
	l.Logger.InfoContext(ctx, "email (log mailer)", "to", m.To, "subject", m.Subject, "body", m.Text)
	return nil
}

// ResendMailer sends email via the Resend HTTP API.
type ResendMailer struct {
	APIKey   string
	From     string
	Endpoint string
	Client   *http.Client
}

// NewResendMailer builds a ResendMailer with sane defaults.
func NewResendMailer(apiKey, from string) *ResendMailer {
	return &ResendMailer{APIKey: apiKey, From: from, Endpoint: ResendEndpoint, Client: &http.Client{Timeout: httpTimeout}}
}

type resendPayload struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	Text    string   `json:"text"`
}

// Send posts the message to Resend.
func (r *ResendMailer) Send(ctx context.Context, m Message) error {
	body, err := json.Marshal(resendPayload{From: r.From, To: []string{m.To}, Subject: m.Subject, Text: m.Text})
	if err != nil {
		return fmt.Errorf("encode email: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, r.Endpoint, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("build email request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+r.APIKey)
	req.Header.Set("Content-Type", "application/json")
	resp, err := r.Client.Do(req)
	if err != nil {
		return fmt.Errorf("send email: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode >= http.StatusMultipleChoices {
		detail, _ := io.ReadAll(io.LimitReader(resp.Body, maxErrorDetail))
		return apperrors.NewExternal(fmt.Sprintf("resend returned %d: %s", resp.StatusCode, detail))
	}
	return nil
}
