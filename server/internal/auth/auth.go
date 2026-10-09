// Package auth provides password hashing, opaque token generation, JWT issuance
// and the login rate limiter.
package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/apperrors"
)

const (
	// BcryptCost is the bcrypt cost factor required by TRD Section 9.
	BcryptCost  = 12
	tokenBytes  = 32
	issuerClaim = "traackly"
)

// Hasher hashes passwords with a fixed bcrypt cost.
type Hasher struct {
	Cost int
}

// NewHasher returns the production hasher at the TRD-mandated cost.
func NewHasher() *Hasher { return &Hasher{Cost: BcryptCost} }

// Hash returns a bcrypt hash of password.
func (h *Hasher) Hash(password string) (string, error) {
	out, err := bcrypt.GenerateFromPassword([]byte(password), h.Cost)
	if err != nil {
		return "", fmt.Errorf("hash password: %w", err)
	}
	return string(out), nil
}

// CheckPassword reports whether password matches hash. The cost is read from the hash itself.
func CheckPassword(hash, password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

// NewOpaqueToken returns a random URL-safe token and its SHA-256 hash for storage.
func NewOpaqueToken() (raw, hash string, err error) {
	b := make([]byte, tokenBytes)
	if _, err := rand.Read(b); err != nil {
		return "", "", fmt.Errorf("generate token: %w", err)
	}
	raw = base64.RawURLEncoding.EncodeToString(b)
	return raw, HashToken(raw), nil
}

// HashToken returns the hex SHA-256 of a raw token. Only hashes are ever stored.
func HashToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}

// Claims are the JWT claims. The token references a session; it does not carry the user.
type Claims struct {
	SessionID string `json:"sid"`
	Role      string `json:"role"`
	jwt.RegisteredClaims
}

// Issuer signs and verifies session JWTs.
type Issuer struct {
	secret []byte
	ttl    time.Duration
	clock  func() time.Time
}

// NewIssuer builds an Issuer with an HMAC secret, token lifetime and clock.
func NewIssuer(secret string, ttl time.Duration, clock func() time.Time) *Issuer {
	return &Issuer{secret: []byte(secret), ttl: ttl, clock: clock}
}

// TTL returns the token lifetime.
func (i *Issuer) TTL() time.Duration { return i.ttl }

// Issue signs a token for a session, returning the token and its expiry.
func (i *Issuer) Issue(sessionID, userID, role string, now time.Time) (string, time.Time, error) {
	exp := now.Add(i.ttl)
	claims := Claims{
		SessionID: sessionID,
		Role:      role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			Issuer:    issuerClaim,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(exp),
		},
	}
	signed, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(i.secret)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("sign jwt: %w", err)
	}
	return signed, exp, nil
}

// Parse verifies a token's signature, algorithm, issuer and expiry.
func (i *Issuer) Parse(token string) (*Claims, error) {
	claims := &Claims{}
	_, err := jwt.ParseWithClaims(token, claims, func(*jwt.Token) (any, error) { return i.secret, nil },
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer(issuerClaim),
		jwt.WithExpirationRequired(),
		jwt.WithTimeFunc(i.clock),
	)
	if err != nil {
		return nil, apperrors.NewUnauthorized("Your session has expired \u2014 log in again")
	}
	return claims, nil
}
