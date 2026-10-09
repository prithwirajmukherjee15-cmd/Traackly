package store

// Document field names and operators used in more than one query.
const (
	fState          = "state"
	fStatus         = "status"
	fTokenHash      = "tokenHash"
	fRevoked        = "revoked"
	fDepartment     = "department"
	fEmail          = "email"
	fRole           = "role"
	fResetExpiresAt = "resetExpiresAt"
	fInviteExpires  = "inviteExpiresAt"
	fResetTokenHash = "resetTokenHash"
	fInviteToken    = "inviteTokenHash"
	opGt            = "$gt"
)
