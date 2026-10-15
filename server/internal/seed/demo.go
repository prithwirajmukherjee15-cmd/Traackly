package seed

import (
	"context"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/auth"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/domain"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/store"
)

// DemoAuthorizerEmail is the Authorizer account of the public demo deployment.
const DemoAuthorizerEmail = "founder@traackly.demo"

// staffDemoAccounts are the demo's non-Authorizer accounts, one per role.
func staffDemoAccounts() []Account {
	return []Account{
		{Name: "Meera Iyer", Email: "coordinator@traackly.demo", Password: DemoPassword, Role: domain.RoleCoordinator},
		{Name: "Arjun Rao", Email: "logistics@traackly.demo", Password: DemoPassword, Role: domain.RoleLogistics},
		{
			Name: "Sunil Patil", Email: "floor@traackly.demo", Password: DemoPassword,
			Role: domain.RoleFloorSupervisor, Department: domain.DeptProduction,
		},
	}
}

func demoAuthorizer() Account {
	return Account{Name: "Founder's Office", Email: DemoAuthorizerEmail, Password: DemoPassword, Role: domain.RoleAuthorizer}
}

// DemoEmail returns the demo account's email for role.
func DemoEmail(role domain.Role) (string, bool) {
	for _, a := range append(staffDemoAccounts(), demoAuthorizer()) {
		if a.Role == role {
			return a.Email, true
		}
	}
	return "", false
}

// IsDemoAccount reports whether email belongs to one of the demo's built-in accounts.
func IsDemoAccount(email string) bool {
	for _, a := range append(staffDemoAccounts(), demoAuthorizer()) {
		if a.Email == email {
			return true
		}
	}
	return false
}

// ResetDemo wipes the demo deployment's data and seeds it again: the built-in accounts,
// plus requests in every lifecycle state, including the unacknowledged railway-order change.
func ResetDemo(ctx context.Context, st *store.Store, h *auth.Hasher) error {
	all := append(staffDemoAccounts(), demoAuthorizer())
	keep := make([]string, 0, len(all))
	for _, a := range all {
		keep = append(keep, a.Email)
	}
	if err := st.ResetDemoData(ctx, keep); err != nil {
		return err
	}
	if err := st.SeedDepartments(ctx); err != nil {
		return err
	}
	acc := demoAuthorizer()
	authz, err := EnsureAccount(ctx, st, h, &acc)
	if err != nil {
		return err
	}
	return Demo(ctx, st, h, authz)
}
