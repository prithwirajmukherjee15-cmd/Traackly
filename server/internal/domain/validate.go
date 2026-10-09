package domain

import (
	"strings"
	"unicode"
	"unicode/utf8"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/apperrors"
)

// Field length limits from the backend schema document.
const (
	ClientNameMin      = 2
	ClientNameMax      = 200
	RequirementMax     = 5000
	UserNameMin        = 2
	UserNameMax        = 100
	PasswordMin        = 8
	DeclineReasonMax   = 2000
	ActorLabelMax      = 60
	requiredFieldsText = "Some fields need attention"
)

// Normalize trims whitespace and applies the default priority.
func (f Fields) Normalize() Fields {
	f.ClientName = strings.TrimSpace(f.ClientName)
	f.RequirementDetails = strings.TrimSpace(f.RequirementDetails)
	if f.Priority == "" {
		f.Priority = PriorityNormal
	}
	return f
}

// Validate checks every protected field and returns a validation error listing each problem.
func (f Fields) Validate() error {
	errs := map[string]string{}
	nameLen := utf8.RuneCountInString(f.ClientName)
	switch {
	case nameLen == 0:
		errs["clientName"] = "Client name is required"
	case nameLen < ClientNameMin || nameLen > ClientNameMax:
		errs["clientName"] = "Client name must be 2\u2013200 characters"
	}
	detailsLen := utf8.RuneCountInString(f.RequirementDetails)
	switch {
	case detailsLen == 0:
		errs["requirementDetails"] = "Requirement details are required"
	case detailsLen > RequirementMax:
		errs["requirementDetails"] = "Requirement details must be 5000 characters or fewer"
	}
	if !f.TargetDepartment.Valid() {
		errs["targetDepartment"] = "Choose a target department"
	}
	if !f.Priority.Valid() {
		errs["priority"] = "Priority must be normal or urgent"
	}
	if len(errs) > 0 {
		return apperrors.NewValidation(requiredFieldsText, errs)
	}
	return nil
}

// ValidatePassword enforces the activation/reset password policy: 8+ characters, at least one number.
func ValidatePassword(password, confirm string) error {
	errs := map[string]string{}
	hasDigit := strings.IndexFunc(password, unicode.IsDigit) >= 0
	if utf8.RuneCountInString(password) < PasswordMin || !hasDigit {
		errs["password"] = "Use at least 8 characters, including a number"
	}
	if password != confirm {
		errs["confirmPassword"] = "Passwords don't match"
	}
	if len(errs) > 0 {
		return apperrors.NewValidation(requiredFieldsText, errs)
	}
	return nil
}

// ValidateUserName checks a display name's length.
func ValidateUserName(name string) error {
	n := utf8.RuneCountInString(strings.TrimSpace(name))
	if n < UserNameMin || n > UserNameMax {
		return apperrors.NewValidation(requiredFieldsText, map[string]string{"name": "Name must be 2\u2013100 characters"})
	}
	return nil
}

// NormalizeEmail lowercases and trims an email address and checks its basic shape.
func NormalizeEmail(email string) (string, error) {
	e := strings.ToLower(strings.TrimSpace(email))
	at := strings.LastIndex(e, "@")
	valid := at > 0 && at < len(e)-1 && strings.Contains(e[at:], ".") &&
		!strings.ContainsAny(e, " \t\n") && !strings.HasSuffix(e, ".")
	if !valid {
		return "", apperrors.NewValidation(requiredFieldsText, map[string]string{"email": "Enter a valid email address"})
	}
	return e, nil
}
