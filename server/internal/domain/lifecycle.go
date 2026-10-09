package domain

import (
	"strings"
	"time"
	"unicode/utf8"

	"go.mongodb.org/mongo-driver/v2/bson"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/apperrors"
)

// Protected field names as they appear in changelog entries and the API.
const (
	FieldClientName         = "clientName"
	FieldRequirementDetails = "requirementDetails"
	FieldTargetDepartment   = "targetDepartment"
	FieldPriority           = "priority"
)

// EditResult describes what an edit did.
type EditResult struct {
	// Entries are the changelog entries appended by this edit (empty for pre-authorization edits).
	Entries []ChangeEntry
	// Changed is true when at least one field value changed.
	Changed bool
	// Flagged is true when the edit moved the request into the updated state.
	Flagged bool
	// PreviousDepartment is set when the edit re-routed the request.
	PreviousDepartment Department
}

// Approve moves a raised request through authorization into in progress in one step.
func Approve(r *Request, actor bson.ObjectID, now time.Time) error {
	if r.State != StateRaised {
		return apperrors.NewConflict("This request was already reviewed in another session")
	}
	r.transition(StateAuthorization, &actor, "", now)
	r.transition(StateInProgress, &actor, "", now)
	return nil
}

// Decline ends a raised request's lifecycle with a mandatory reason.
func Decline(r *Request, reason string, actor bson.ObjectID, now time.Time) error {
	if r.State != StateRaised {
		return apperrors.NewConflict("This request was already reviewed in another session")
	}
	reason = strings.TrimSpace(reason)
	if reason == "" || utf8.RuneCountInString(reason) > DeclineReasonMax {
		return apperrors.NewValidation("Enter a reason", map[string]string{"declineReason": "Enter a reason"})
	}
	r.DeclineReason = &reason
	r.transition(StateDeclined, &actor, "", now)
	return nil
}

// ApplyEdit applies new protected-field values to a request.
//
// This is Traackly's core mechanic (PRD Story 3). Editing a raised request just
// updates it. Editing a request that has passed authorization additionally:
//  1. appends one changelog entry per changed field (append-only),
//  2. moves the request to the updated state, and
//  3. requires every downstream owner who has already received the request to
//     acknowledge the change before execution can proceed.
func ApplyEdit(r *Request, f Fields, actor bson.ObjectID, now time.Time) (EditResult, error) {
	if r.State.IsTerminal() {
		return EditResult{}, apperrors.NewConflict("Completed or declined requests can't be edited")
	}
	f = f.Normalize()
	if err := f.Validate(); err != nil {
		return EditResult{}, err
	}
	entries := diffFields(r.Fields(), f, actor, now)
	res := EditResult{Changed: len(entries) > 0}
	if !res.Changed {
		return res, nil
	}
	if f.TargetDepartment != r.TargetDepartment {
		res.PreviousDepartment = r.TargetDepartment
	}
	r.ClientName, r.RequirementDetails = f.ClientName, f.RequirementDetails
	r.TargetDepartment, r.Priority = f.TargetDepartment, f.Priority
	if !r.State.IsPostAuthorization() {
		return res, nil
	}
	r.Changelog = append(r.Changelog, entries...)
	res.Entries = entries
	// Logistics always re-confirms the timeline; the floor only acknowledges once the job has reached it.
	r.addPendingAck(AckLogistics)
	if r.Timeline != nil {
		r.addPendingAck(AckFloor)
	}
	r.transition(StateUpdated, &actor, "", now)
	res.Flagged = true
	return res, nil
}

func diffFields(before, after Fields, actor bson.ObjectID, now time.Time) []ChangeEntry {
	pairs := []struct{ name, old, new string }{
		{FieldClientName, before.ClientName, after.ClientName},
		{FieldRequirementDetails, before.RequirementDetails, after.RequirementDetails},
		{FieldTargetDepartment, string(before.TargetDepartment), string(after.TargetDepartment)},
		{FieldPriority, string(before.Priority), string(after.Priority)},
	}
	entries := make([]ChangeEntry, 0, len(pairs))
	for _, p := range pairs {
		if p.old != p.new {
			entries = append(entries, ChangeEntry{
				Field: p.name, OldValue: p.old, NewValue: p.new, ChangedBy: actor, ChangedAt: now,
			})
		}
	}
	return entries
}

// settleIfAcknowledged returns an updated request to in progress once no acknowledgments remain.
func (r *Request) settleIfAcknowledged(actor *bson.ObjectID, label string, now time.Time) {
	if r.State == StateUpdated && len(r.PendingAcks) == 0 {
		r.transition(StateInProgress, actor, label, now)
	}
}
