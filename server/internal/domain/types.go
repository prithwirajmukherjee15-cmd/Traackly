// Package domain holds Traackly's core types and the deterministic request
// lifecycle rules, including the post-authorization edit/acknowledgment gate.
//
// Every state change to a Request goes through a function in this package, so
// the rules cannot be bypassed by an individual HTTP handler.
package domain

// State is a Request lifecycle state.
type State string

// Request lifecycle states.
const (
	StateRaised        State = "raised"
	StateAuthorization State = "authorization"
	StateInProgress    State = "in_progress"
	StateUpdated       State = "updated"
	StateCompleted     State = "completed"
	StateDeclined      State = "declined"
)

// IsPostAuthorization reports whether a request has passed authorization and is still open.
func (s State) IsPostAuthorization() bool {
	return s == StateAuthorization || s == StateInProgress || s == StateUpdated
}

// IsTerminal reports whether the state ends the lifecycle.
func (s State) IsTerminal() bool {
	return s == StateCompleted || s == StateDeclined
}

// Valid reports whether s is a known state.
func (s State) Valid() bool {
	switch s {
	case StateRaised, StateAuthorization, StateInProgress, StateUpdated, StateCompleted, StateDeclined:
		return true
	default:
		return false
	}
}

// Department is a department slug, also used as the departments collection key.
type Department string

// Departments available at MVP.
const (
	DeptProduction Department = "production"
	DeptSupply     Department = "supply"
	DeptQA         Department = "qa"
)

// AllDepartments lists every department in display order.
func AllDepartments() []Department {
	return []Department{DeptProduction, DeptSupply, DeptQA}
}

// Valid reports whether d is a known department.
func (d Department) Valid() bool {
	return d == DeptProduction || d == DeptSupply || d == DeptQA
}

// DisplayName returns the human-readable department label.
func (d Department) DisplayName() string {
	switch d {
	case DeptProduction:
		return "Production"
	case DeptSupply:
		return "Supply"
	case DeptQA:
		return "QA"
	default:
		return string(d)
	}
}

// Priority is a request priority.
type Priority string

// Request priorities.
const (
	PriorityNormal Priority = "normal"
	PriorityUrgent Priority = "urgent"
)

// Valid reports whether p is a known priority.
func (p Priority) Valid() bool { return p == PriorityNormal || p == PriorityUrgent }

// Role is a staff user's role.
type Role string

// Staff roles.
const (
	RoleCoordinator     Role = "coordinator"
	RoleAuthorizer      Role = "authorizer"
	RoleLogistics       Role = "logistics"
	RoleFloorSupervisor Role = "floor_supervisor"
)

// Valid reports whether r is a known role.
func (r Role) Valid() bool {
	switch r {
	case RoleCoordinator, RoleAuthorizer, RoleLogistics, RoleFloorSupervisor:
		return true
	default:
		return false
	}
}

// UserStatus is a user account status.
type UserStatus string

// User account statuses.
const (
	UserInvited     UserStatus = "invited"
	UserActive      UserStatus = "active"
	UserDeactivated UserStatus = "deactivated"
)

// AckStage names a downstream owner that must acknowledge a post-authorization edit.
type AckStage string

// Acknowledgment stages, in execution order.
const (
	// AckLogistics is cleared when Logistics saves (or re-saves) the timeline.
	AckLogistics AckStage = "logistics"
	// AckFloor is cleared when the department's floor supervisor acknowledges on the kiosk.
	AckFloor AckStage = "floor"
)

// TriggerEvent names why a notification was sent.
type TriggerEvent string

// Notification trigger events.
const (
	TriggerRequestUpdated    TriggerEvent = "request_updated"
	TriggerRequestAuthorized TriggerEvent = "request_authorized"
	TriggerRequestDeclined   TriggerEvent = "request_declined"
)
