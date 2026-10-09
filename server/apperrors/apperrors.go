// Package apperrors defines typed errors with HTTP status codes and blame attribution.
package apperrors

import (
	"errors"
	"fmt"
	"net/http"
)

// Blame identifies who is responsible for an error.
type Blame string

const (
	// BlameClient indicates the caller caused the error.
	BlameClient Blame = "client"
	// BlameServer indicates an internal failure caused the error.
	BlameServer Blame = "server"
	// BlameExternal indicates a third-party service caused the error.
	BlameExternal Blame = "external"
)

// Machine-readable error codes returned to the client alongside the message.
const (
	CodeBadRequest    = "bad_request"
	CodeValidation    = "validation"
	CodeUnauthorized  = "unauthorized"
	CodeAccessRemoved = "access_removed"
	CodeForbidden     = "forbidden"
	CodeNotFound      = "not_found"
	CodeConflict      = "conflict"
	CodeBlocked       = "blocked"
	CodeRateLimited   = "rate_limited"
	CodeInternal      = "internal"
	CodeExternal      = "external"
)

// AppError is the base typed error.
type AppError struct {
	Message     string
	StatusCode  int
	Blame       Blame
	UserMessage string
	Code        string
	Fields      map[string]string
}

// Error implements the error interface.
func (e *AppError) Error() string { return fmt.Sprintf("%s: %s", e.Blame, e.Message) }

func newClientErr(status int, code, msg string) *AppError {
	return &AppError{Message: msg, StatusCode: status, Blame: BlameClient, UserMessage: msg, Code: code}
}

// NewClient returns a 400-class error caused by the caller.
func NewClient(msg string) *AppError {
	return newClientErr(http.StatusBadRequest, CodeBadRequest, msg)
}

// NewValidation returns a 422 error carrying per-field messages.
func NewValidation(msg string, fields map[string]string) *AppError {
	e := newClientErr(http.StatusUnprocessableEntity, CodeValidation, msg)
	e.Fields = fields
	return e
}

// NewUnauthorized returns a 401 error.
func NewUnauthorized(msg string) *AppError {
	return newClientErr(http.StatusUnauthorized, CodeUnauthorized, msg)
}

// NewAccessRemoved returns a 401 error for a user whose access was revoked mid-session.
func NewAccessRemoved() *AppError {
	return newClientErr(http.StatusUnauthorized, CodeAccessRemoved,
		"Your access has been removed \u2014 contact your administrator.")
}

// NewForbidden returns a 403 error.
func NewForbidden(msg string) *AppError {
	return newClientErr(http.StatusForbidden, CodeForbidden, msg)
}

// NewNotFound returns a 404 error.
func NewNotFound(msg string) *AppError {
	return newClientErr(http.StatusNotFound, CodeNotFound, msg)
}

// NewConflict returns a 409 error, used for stale writes and invalid transitions.
func NewConflict(msg string) *AppError {
	return newClientErr(http.StatusConflict, CodeConflict, msg)
}

// NewBlocked returns a 409 error raised when the acknowledgment gate refuses an action.
func NewBlocked(msg string) *AppError {
	return newClientErr(http.StatusConflict, CodeBlocked, msg)
}

// NewRateLimited returns a 429 error.
func NewRateLimited(msg string) *AppError {
	return newClientErr(http.StatusTooManyRequests, CodeRateLimited, msg)
}

// NewServer returns a 500-class error caused by an internal failure.
func NewServer(msg string) *AppError {
	return &AppError{
		Message: msg, StatusCode: http.StatusInternalServerError, Blame: BlameServer,
		UserMessage: "Something went wrong. Please try again.", Code: CodeInternal,
	}
}

// NewExternal returns a 502-class error caused by a third-party service.
func NewExternal(msg string) *AppError {
	return &AppError{
		Message: msg, StatusCode: http.StatusBadGateway, Blame: BlameExternal,
		UserMessage: "An upstream service failed. Please try again.", Code: CodeExternal,
	}
}

// As extracts an *AppError from err, if one is present in its chain.
func As(err error) (*AppError, bool) {
	return errors.AsType[*AppError](err)
}

// HasCode reports whether err is an *AppError with the given code.
func HasCode(err error, code string) bool {
	ae, ok := As(err)
	return ok && ae.Code == code
}
