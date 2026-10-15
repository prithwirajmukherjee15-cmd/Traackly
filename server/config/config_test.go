package config_test

import (
	"errors"
	"testing"
	"time"

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
	t.Setenv("SEED_AUTHORIZER_EMAIL", " Founder@Example.com ")
	t.Setenv("SEED_AUTHORIZER_PASSWORD", "founder123")
	s, err := config.LoadSeed()
	if err != nil || s.AuthorizerEmail != "founder@example.com" || s.AuthorizerName == "" {
		t.Fatalf("seed %+v %v", s, err)
	}
}

func TestLoadDemoSettings(t *testing.T) {
	t.Setenv("JWT_SECRET", "0123456789abcdef0123456789abcdef")
	t.Setenv("APP_BASE_URL", "")
	t.Setenv("RENDER_EXTERNAL_URL", "https://traackly-demo.onrender.com/")
	t.Setenv("DEMO_MODE", "true")
	t.Setenv("DEMO_RESET_INTERVAL", "")
	c, err := config.Load()
	if err != nil {
		t.Fatal(err)
	}
	if !c.DemoMode || c.DemoResetInterval != 6*time.Hour || c.AppBaseURL != "https://traackly-demo.onrender.com" {
		t.Fatalf("unexpected demo config %+v", c)
	}
	t.Setenv("DEMO_RESET_INTERVAL", "90m")
	if c, err := config.Load(); err != nil || c.DemoResetInterval != 90*time.Minute {
		t.Fatalf("custom interval: %+v %v", c, err)
	}
	for _, bad := range []string{"soon", "-1h"} {
		t.Setenv("DEMO_RESET_INTERVAL", bad)
		if _, err := config.Load(); !errors.Is(err, config.ErrInvalidConfig) {
			t.Fatalf("DEMO_RESET_INTERVAL=%q should fail, got %v", bad, err)
		}
	}
}
