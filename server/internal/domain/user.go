package domain

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/apperrors"
)

// Token lifetimes from the App Flow document.
const (
	InviteTTL = 7 * 24 * time.Hour
	ResetTTL  = time.Hour
)

// User is a person with system access. Accounts are invite-only.
type User struct {
	ID              bson.ObjectID  `bson:"_id"`
	Name            string         `bson:"name"`
	Email           string         `bson:"email"`
	PasswordHash    *string        `bson:"passwordHash"`
	Role            Role           `bson:"role"`
	Department      *Department    `bson:"department"`
	Status          UserStatus     `bson:"status"`
	InvitedBy       *bson.ObjectID `bson:"invitedBy"`
	InvitedAt       *time.Time     `bson:"invitedAt"`
	ActivatedAt     *time.Time     `bson:"activatedAt"`
	InviteTokenHash *string        `bson:"inviteTokenHash"`
	InviteExpiresAt *time.Time     `bson:"inviteExpiresAt"`
	ResetTokenHash  *string        `bson:"resetTokenHash"`
	ResetExpiresAt  *time.Time     `bson:"resetExpiresAt"`
	CreatedAt       time.Time      `bson:"createdAt"`
	UpdatedAt       time.Time      `bson:"updatedAt"`
}

// Invite is the input for creating a new invited user.
type Invite struct {
	Name       string
	Email      string
	Role       Role
	Department Department
}

// NewInvitedUser validates an invite and builds the pending user document.
func NewInvitedUser(in Invite, invitedBy bson.ObjectID, now time.Time) (*User, error) {
	email, err := NormalizeEmail(in.Email)
	if err != nil {
		return nil, err
	}
	if err := ValidateUserName(in.Name); err != nil {
		return nil, err
	}
	if !in.Role.Valid() {
		return nil, apperrors.NewValidation(requiredFieldsText, map[string]string{"role": "Choose a role"})
	}
	var dept *Department
	if in.Role == RoleFloorSupervisor {
		if !in.Department.Valid() {
			return nil, apperrors.NewValidation(requiredFieldsText,
				map[string]string{"department": "Floor supervisors need a department"})
		}
		d := in.Department
		dept = &d
	}
	return &User{
		ID: bson.NewObjectID(), Name: in.Name, Email: email, Role: in.Role, Department: dept,
		Status: UserInvited, InvitedBy: &invitedBy, InvitedAt: &now, CreatedAt: now, UpdatedAt: now,
	}, nil
}

// Session is the server-side record behind each issued JWT, enabling real-time revocation.
type Session struct {
	ID            bson.ObjectID `bson:"_id"`
	UserID        bson.ObjectID `bson:"userId"`
	TokenHash     string        `bson:"tokenHash"`
	IssuedAt      time.Time     `bson:"issuedAt"`
	ExpiresAt     time.Time     `bson:"expiresAt"`
	UserAgent     string        `bson:"userAgent"`
	Revoked       bool          `bson:"revoked"`
	RevokedReason string        `bson:"revokedReason,omitempty"`
}

// Session revocation reasons.
const (
	RevokedLogout      = "logout"
	RevokedRefresh     = "refresh"
	RevokedDeactivated = "deactivated"
)

// StationToken authenticates a department-stationed kiosk device, not a person.
type StationToken struct {
	ID            bson.ObjectID `bson:"_id"`
	Department    Department    `bson:"department"`
	TokenHash     string        `bson:"tokenHash"`
	ProvisionedBy bson.ObjectID `bson:"provisionedBy"`
	ProvisionedAt time.Time     `bson:"provisionedAt"`
	Revoked       bool          `bson:"revoked"`
	PinHash       *string       `bson:"pinHash"`
}

// Notification delivery statuses.
const (
	NotifyPending = "pending"
	NotifySent    = "sent"
	NotifyFailed  = "failed"
)

// Notification is a delivery-log record for an outbound notification.
type Notification struct {
	ID            bson.ObjectID `bson:"_id"`
	RequestID     bson.ObjectID `bson:"requestId"`
	RecipientID   bson.ObjectID `bson:"recipientId"`
	Channel       string        `bson:"channel"`
	Status        string        `bson:"status"`
	TriggerEvent  TriggerEvent  `bson:"triggerEvent"`
	SentAt        *time.Time    `bson:"sentAt"`
	FailureReason *string       `bson:"failureReason"`
	CreatedAt     time.Time     `bson:"createdAt"`
}

// DepartmentDoc is the departments reference collection document.
type DepartmentDoc struct {
	ID           Department `bson:"_id"`
	DisplayName  string     `bson:"displayName"`
	StationCount int        `bson:"stationCount"`
}
