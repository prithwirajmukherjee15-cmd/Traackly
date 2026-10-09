import { LogOut } from 'lucide-react';
import { PageHeader } from '../components/layout/AppShell';
import { Button } from '../components/ui/Button';
import { Avatar, Card } from '../components/ui/Feedback';
import { useAuth } from '../lib/auth';
import { deptLabel, ROLE_LABEL } from '../lib/states';

/** S-90: minimal account view. No preferences in the MVP. */
export function ProfilePage() {
  const { user, logout } = useAuth();
  if (!user) return null;
  const rows: [string, string][] = [
    ['Name', user.name],
    ['Email', user.email],
    ['Role', ROLE_LABEL[user.role]],
    ...(user.department ? ([['Department', deptLabel(user.department)]] as [string, string][]) : []),
  ];
  return (
    <>
      <PageHeader title="Profile" />
      <div className="max-w-xl px-6 lg:px-8">
        <Card className="p-6">
          <div className="mb-5 flex items-center gap-4">
            <Avatar name={user.name} size={56} />
            <div>
              <p className="font-display text-lg font-semibold">{user.name}</p>
              <p className="text-ink-muted">{ROLE_LABEL[user.role]}</p>
            </div>
          </div>
          <dl className="divide-y divide-line border-y border-line">
            {rows.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[120px_1fr] py-2.5 text-sm">
                <dt className="text-ink-muted">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <Button
            variant="secondary"
            className="mt-6"
            icon={<LogOut size={16} />}
            onClick={() => void logout()}
          >
            Log out
          </Button>
        </Card>
      </div>
    </>
  );
}
