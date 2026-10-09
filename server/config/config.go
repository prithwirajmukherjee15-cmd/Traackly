// Package config loads and validates application configuration.
//
// It is the only package allowed to read environment variables.
package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

const (
	minSecretLen      = 32
	defaultSessionTTL = 12 * time.Hour
	minPasswordLen    = 8
)

// configError is a constant error type so sentinels need no package-level var.
type configError string

// Error implements the error interface.
func (e configError) Error() string { return string(e) }

// ErrInvalidConfig is returned when validation fails.
const ErrInvalidConfig = configError("invalid config")

// Config holds validated application configuration.
type Config struct {
	Port           string
	MongoURI       string
	MongoDB        string
	JWTSecret      string
	AppBaseURL     string
	CookieSecure   bool
	StaticDir      string
	ResendAPIKey   string
	EmailFrom      string
	ExposeDevLinks bool
	LogLevel       string
	SessionTTL     time.Duration
}

// Seed holds the bootstrap-authorizer settings used by the seed command.
type Seed struct {
	AuthorizerName     string
	AuthorizerEmail    string
	AuthorizerPassword string
}

// Load reads and validates configuration from environment variables.
func Load() (*Config, error) {
	c := &Config{
		Port:           getEnvDefault("PORT", "8080"),
		MongoURI:       getEnvDefault("MONGODB_URI", "mongodb://127.0.0.1:27017"),
		MongoDB:        getEnvDefault("MONGODB_DB", "traackly"),
		JWTSecret:      os.Getenv("JWT_SECRET"),
		AppBaseURL:     strings.TrimRight(getEnvDefault("APP_BASE_URL", "http://localhost:5173"), "/"),
		CookieSecure:   getEnvBool("COOKIE_SECURE", true),
		StaticDir:      os.Getenv("STATIC_DIR"),
		ResendAPIKey:   os.Getenv("RESEND_API_KEY"),
		EmailFrom:      getEnvDefault("EMAIL_FROM", "Traackly <notifications@traackly.app>"),
		ExposeDevLinks: getEnvBool("EXPOSE_DEV_LINKS", false),
		LogLevel:       getEnvDefault("LOG_LEVEL", "INFO"),
		SessionTTL:     defaultSessionTTL,
	}
	if err := c.validate(); err != nil {
		return nil, err
	}
	return c, nil
}

// LoadSeed reads the bootstrap-authorizer settings.
func LoadSeed() (*Seed, error) {
	s := &Seed{
		AuthorizerName:     getEnvDefault("SEED_AUTHORIZER_NAME", "Founder's Office"),
		AuthorizerEmail:    strings.ToLower(strings.TrimSpace(os.Getenv("SEED_AUTHORIZER_EMAIL"))),
		AuthorizerPassword: os.Getenv("SEED_AUTHORIZER_PASSWORD"),
	}
	if s.AuthorizerEmail == "" || len(s.AuthorizerPassword) < minPasswordLen {
		return nil, fmt.Errorf("%w: SEED_AUTHORIZER_EMAIL and SEED_AUTHORIZER_PASSWORD (8+ chars) are required",
			ErrInvalidConfig)
	}
	return s, nil
}

func getEnvDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvBool(key string, fallback bool) bool {
	v, err := strconv.ParseBool(os.Getenv(key))
	if err != nil {
		return fallback
	}
	return v
}

func (c *Config) validate() error {
	allowed := map[string]bool{"DEBUG": true, "INFO": true, "WARNING": true, "ERROR": true}
	if !allowed[c.LogLevel] {
		return fmt.Errorf("%w: LOG_LEVEL %q not in DEBUG/INFO/WARNING/ERROR", ErrInvalidConfig, c.LogLevel)
	}
	if len(c.JWTSecret) < minSecretLen {
		return fmt.Errorf("%w: JWT_SECRET must be at least 32 characters", ErrInvalidConfig)
	}
	return nil
}
