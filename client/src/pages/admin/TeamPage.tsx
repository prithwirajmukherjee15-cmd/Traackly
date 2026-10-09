import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Copy, MonitorSmartphone, RotateCw, ShieldOff, UserPlus } from 'lucide-react';
import { PageHeader } from '../../components/layout/AppShell';
import { Button } from '../../components/ui/Button';
import { Avatar, Banner, Card, Spinner } from '../../components/ui/Feedback';
import { Select, TextInput } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { api, ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDate } from '../../lib/format';
import { useStations, useUsers } from '../../lib/queries';
import { DEPARTMENTS, deptLabel, ROLE_LABEL } from '../../lib/states';
import { useToast } from '../../lib/toast';
import type { Department, User, UserStatus } from '../../lib/types';
import { fieldErrors, inviteSchema } from '../../lib/validation';

const STATUS_PILL: Record<UserStatus, string> = {
  invited: 'bg-state-raised text-ink',
  active: 'bg-state-completed text-ink',
  deactivated: 'bg-surface-sunken text-ink-muted',
};

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex gap-2">
      <input
        readOnly
        value={value}
        aria-label="Link"
        className="h-10 min-w-0 flex-1 rounded border border-line-strong bg-surface-sunken px-3 font-mono text-[12px]"
      />
      <Button
        variant="secondary"
        icon={<Copy size={14} />}
        onClick={() => void navigator.clipboard?.writeText(value).then(() => setCopied(true))}
      >
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  );
}

/** S-00: invite form (modal). Accounts are invite-only. */
function InviteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const empty = { name: '', email: '', role: '', department: '' };
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [devLink, setDevLink] = useState('');

  const close = () => {
    setForm(empty);
    setErrors({});
    setDevLink('');
    onClose();
  };
  const set = (k: keyof typeof empty, v: string) => (
    setForm({ ...form, [k]: v }),
    setErrors({ ...errors, [k]: '' })
  );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const local = fieldErrors(inviteSchema.safeParse(form));
    setErrors(local);
    if (Object.keys(local).length || busy) return;
    setBusy(true);
    try {
      const r = await api.invite({
        ...form,
        department: form.role === 'floor_supervisor' ? form.department : '',
      });
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      toast(`Invite sent to ${r.user.email}`);
      if (r.devLink) setDevLink(r.devLink);
      else close();
    } catch (err) {
      setErrors(
        err instanceof ApiError
          ? { ...err.fields, form: Object.keys(err.fields).length ? '' : err.message }
          : { form: 'Something went wrong.' },
      );
    } finally {
      setBusy(false);
    }
  };

  if (devLink) {
    return (
      <Modal open={open} title="Invite sent" onClose={close} footer={<Button onClick={close}>Done</Button>}>
        <p className="mb-3 text-sm text-ink-muted">
          Email delivery isn't configured in this environment, so here's the single-use setup link (valid 7
          days):
        </p>
        <CopyField value={devLink} />
      </Modal>
    );
  }
  return (
    <Modal
      open={open}
      title="Invite a teammate"
      onClose={close}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="invite-form" loading={busy}>
            Send invite
          </Button>
        </>
      }
    >
      <form id="invite-form" onSubmit={submit} className="space-y-4" noValidate>
        {errors.form && <Banner tone="danger">{errors.form}</Banner>}
        <TextInput
          label="Full name"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          error={errors.name}
        />
        <TextInput
          label="Email address"
          type="email"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          error={errors.email}
        />
        <Select
          label="Role"
          value={form.role}
          onChange={(e) => set('role', e.target.value)}
          error={errors.role}
        >
          <option value="">Choose a role</option>
          {Object.entries(ROLE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        {form.role === 'floor_supervisor' && (
          <Select
            label="Department"
            value={form.department}
            onChange={(e) => set('department', e.target.value)}
            error={errors.department}
          >
            <option value="">Choose a department</option>
            {DEPARTMENTS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </Select>
        )}
      </form>
    </Modal>
  );
}

function StationsCard() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: stations = [] } = useStations();
  const [issued, setIssued] = useState<{ dept: Department; url: string } | null>(null);
  const [busy, setBusy] = useState('');

  const act = async (dept: Department, fn: () => Promise<void>) => {
    setBusy(dept);
    try {
      await fn();
      await queryClient.invalidateQueries({ queryKey: ['stations'] });
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Something went wrong.', 'danger');
    } finally {
      setBusy('');
    }
  };

  return (
    <Card className="mx-6 mb-10 p-5 lg:mx-8">
      <div className="mb-4 flex items-center gap-2">
        <MonitorSmartphone size={20} className="text-brand" aria-hidden />
        <h2 className="font-display text-base font-semibold">Kiosk stations</h2>
      </div>
      <p className="mb-4 text-sm text-ink-muted">
        Each department has one shared kiosk credential. Floor staff never log in individually.
        Re-provisioning or revoking cuts off the old device immediately.
      </p>
      <div className="grid gap-3 md:grid-cols-3">
        {DEPARTMENTS.map((d) => {
          const st = stations.find((s) => s.department === d.id);
          const active = st && !st.revoked;
          return (
            <div key={d.id} className="rounded-lg border border-line p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{d.label}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${active ? 'bg-success-soft text-success' : 'bg-surface-sunken text-ink-muted'}`}
                >
                  {active ? 'Provisioned' : st ? 'Revoked' : 'Not set up'}
                </span>
              </div>
              {st && <p className="mt-1 text-[12px] text-ink-muted">Since {formatDate(st.provisionedAt)}</p>}
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant={active ? 'secondary' : 'primary'}
                  loading={busy === d.id}
                  onClick={() =>
                    act(d.id, async () =>
                      setIssued({ dept: d.id, url: (await api.provisionStation(d.id)).url }),
                    )
                  }
                >
                  {active ? 'Re-provision' : 'Provision'}
                </Button>
                {active && (
                  <Button
                    size="sm"
                    variant="tertiary"
                    onClick={() =>
                      act(
                        d.id,
                        async () => (await api.revokeStation(d.id), toast(`${d.label} kiosk revoked`)),
                      )
                    }
                  >
                    Revoke
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <Modal
        open={issued !== null}
        title={`${deptLabel(issued?.dept)} kiosk link`}
        onClose={() => setIssued(null)}
        footer={<Button onClick={() => setIssued(null)}>Done</Button>}
        width="max-w-lg"
      >
        <p className="mb-3 text-sm text-ink-muted">
          Open this link once on the department's kiosk device (full-screen browser). It's shown only now —
          store it like a password.
        </p>
        {issued && <CopyField value={issued.url} />}
      </Modal>
    </Card>
  );
}

/** S-91: everyone in the organization, with invite, resend and deactivate actions. */
export function TeamPage() {
  const { user: me } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: users, isLoading } = useUsers();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [target, setTarget] = useState<User | null>(null);
  const [busy, setBusy] = useState('');
  const [resentLink, setResentLink] = useState('');

  const resend = async (u: User) => {
    setBusy(u.id);
    try {
      const r = await api.resendInvite(u.id);
      toast(`Invite re-sent to ${u.email} — the previous link no longer works`, 'info');
      if (r.devLink) setResentLink(r.devLink);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Something went wrong.', 'danger');
    } finally {
      setBusy('');
    }
  };

  const deactivate = async () => {
    if (!target) return;
    setBusy(target.id);
    try {
      await api.deactivate(target.id);
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      toast(`${target.name} was deactivated`);
      setTarget(null);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Something went wrong.', 'danger');
    } finally {
      setBusy('');
    }
  };

  return (
    <>
      <PageHeader
        title="Manage team"
        subtitle="Invite people, see who's active, and remove access instantly."
        action={
          <Button icon={<UserPlus size={16} />} onClick={() => setInviteOpen(true)}>
            Invite user
          </Button>
        }
      />
      {isLoading ? (
        <Spinner label="Loading team" />
      ) : (
        <div className="mx-6 mb-8 overflow-x-auto rounded-lg border border-line lg:mx-8">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line text-[13px] text-ink-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium">Department</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((u) => (
                <tr key={u.id} className="border-b border-line last:border-b-0 hover:bg-surface-hover">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 font-medium">
                      <Avatar name={u.name} /> {u.name}
                      {u.id === me?.id && (
                        <span className="text-[12px] font-normal text-ink-muted">(you)</span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{u.email}</td>
                  <td className="px-4 py-3">{ROLE_LABEL[u.role]}</td>
                  <td className="px-4 py-3">{deptLabel(u.department)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[12px] font-semibold capitalize ${STATUS_PILL[u.status]}`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.status === 'invited' && (
                      <Button
                        size="sm"
                        variant="tertiary"
                        icon={<RotateCw size={14} />}
                        loading={busy === u.id}
                        onClick={() => resend(u)}
                      >
                        Resend invite
                      </Button>
                    )}
                    {u.status === 'active' && u.id !== me?.id && (
                      <Button
                        size="sm"
                        variant="tertiary"
                        icon={<ShieldOff size={14} />}
                        onClick={() => setTarget(u)}
                      >
                        Deactivate
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <StationsCard />
      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <Modal
        open={resentLink !== ''}
        title="New invite link"
        onClose={() => setResentLink('')}
        footer={<Button onClick={() => setResentLink('')}>Done</Button>}
      >
        <p className="mb-3 text-sm text-ink-muted">
          Email delivery isn't configured here, so share this fresh 7-day link directly:
        </p>
        <CopyField value={resentLink} />
      </Modal>
      <Modal
        open={target !== null}
        title={`Deactivate ${target?.name ?? ''}?`}
        onClose={() => setTarget(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deactivate} loading={busy === target?.id}>
              Deactivate
            </Button>
          </>
        }
      >
        <p className="text-ink-muted">
          They will immediately lose access. Their requests and history stay intact.
        </p>
      </Modal>
    </>
  );
}
