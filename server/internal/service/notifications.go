package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/domain"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/notify"
)

// NextOwners describes who must acknowledge a flagged request, for the S-21 success toast.
func NextOwners(r *domain.Request) string {
	owners := []string{}
	if r.AwaitingAck(domain.AckLogistics) {
		owners = append(owners, "Logistics")
	}
	if r.AwaitingAck(domain.AckFloor) {
		owners = append(owners, "the "+r.TargetDepartment.DisplayName()+" floor")
	}
	if len(owners) == 0 {
		return "the next owner"
	}
	return strings.Join(owners, " and ")
}

func (s *Service) users(ctx context.Context, role domain.Role, dept domain.Department) []domain.User {
	u, err := s.d.Store.ActiveUsers(ctx, role, dept)
	if err != nil {
		s.d.Logger.ErrorContext(ctx, "list recipients failed", "error", err)
		return nil
	}
	return u
}

func (s *Service) notifyAuthorized(ctx context.Context, r *domain.Request) {
	msg := notify.Message{
		Subject: fmt.Sprintf("[Traackly] New authorized request %s \u2014 %s needs a timeline", r.JobCode(), r.ClientName),
		Text: fmt.Sprintf("%s for %s (%s) was authorized and needs a timeline estimate.\n\nOpen: %s/logistics/requests/%s",
			r.JobCode(), r.ClientName, r.TargetDepartment.DisplayName(), s.d.BaseURL, r.ID.Hex()),
	}
	s.deliver(ctx, &delivery{req: r, trigger: domain.TriggerRequestAuthorized, to: s.users(ctx, domain.RoleLogistics, ""), msg: msg})
}

func (s *Service) notifyDeclined(ctx context.Context, r *domain.Request) {
	coord, err := s.d.Store.UserByID(ctx, r.RaisedBy)
	if err != nil {
		s.d.Logger.ErrorContext(ctx, "load coordinator failed", "error", err)
		return
	}
	reason := ""
	if r.DeclineReason != nil {
		reason = *r.DeclineReason
	}
	msg := notify.Message{
		Subject: fmt.Sprintf("[Traackly] Request for %s was declined", r.ClientName),
		Text:    fmt.Sprintf("Reason: %s\n\nOpen: %s/requests/%s", reason, s.d.BaseURL, r.ID.Hex()),
	}
	s.deliver(ctx, &delivery{req: r, trigger: domain.TriggerRequestDeclined, to: []domain.User{*coord}, msg: msg})
}

func (s *Service) notifyUpdated(ctx context.Context, r *domain.Request, entries []domain.ChangeEntry) {
	var b strings.Builder
	for i := range entries {
		fmt.Fprintf(&b, "\u2022 %s: %q \u2192 %q\n", entries[i].Field, entries[i].OldValue, entries[i].NewValue)
	}
	msg := notify.Message{
		Subject: fmt.Sprintf("[Traackly] Change to %s (%s) \u2014 acknowledgment required", r.JobCode(), r.ClientName),
		Text: fmt.Sprintf("This request changed after authorization. Review and acknowledge before work proceeds.\n\n%s\nOpen: %s",
			b.String(), s.d.BaseURL+"/logistics/requests/"+r.ID.Hex()),
	}
	to := s.users(ctx, domain.RoleLogistics, "")
	if r.AwaitingAck(domain.AckFloor) {
		to = append(to, s.users(ctx, domain.RoleFloorSupervisor, r.TargetDepartment)...)
	}
	s.deliver(ctx, &delivery{req: r, trigger: domain.TriggerRequestUpdated, to: to, msg: msg})
}
