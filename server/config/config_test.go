package config_test

import (
	"errors"
	"testing"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/config"
)

func TestLoadDefaultsAndValidation(t *testing.T) {
	t.Setenv("JWT_SECRET", "0123456789abcdef0123456789abcdef")
	t.Setenv("APP_BASE_URL", "https://traackly.example/")
	t.Setenv("COOKIE_SECURE", "false")
	t.Setenv("EXPOSE_DEV_LINKS", "notabool")
	c, err := config.Load()
	if err != nil {
		t.Fatal(err)
	}
	if c.Port != "8080" || c.AppBaseURL != "https://traackly.example" || c.CookieSecure || c.ExposeDevLinks || c.LogLevel != "INFO" {
		t.Fatalf("unexpected config %+v", c)
	}

	t.Setenv("LOG_LEVEL", "TRACE")
	if _, err := config.Load(); !errors.Is(err, config.ErrInvalidConfig) {
		t.Fatalf("bad log level should fail, got %v", err)
	}
	t.Setenv("LOG_LEVEL", "DEBUG")
	t.Setenv("JWT_SECRET", "short")
	if _, err := config.Load(); !errors.Is(err, config.ErrInvalidConfig) || err.Error() == "" {
		t.Fatalf("short secret should fail, got %v", err)
	}
}

func TestLoadSeed(t *testing.T) {
	t.Setenv("SEED_AUTHORIZER_EMAIL", "")
	if _, err := config.LoadSeed(); !errors.Is(err, config.ErrInvalidConfig) {
		t.Fatalf("missing email should fail, got %v", err)
	}
	t.Setenv("SEED_AUTHORIZER_EMAIL", " Founder@NCBP.in ")
	t.Setenv("SEED_AUTHORIZER_PASSWORD", "founder123")
	s, err := config.LoadSeed()
	if err != nil || s.AuthorizerEmail != "founder@ncbp.in" || s.AuthorizerName == "" {
		t.Fatalf("seed %+v %v", s, err)
	}
}
