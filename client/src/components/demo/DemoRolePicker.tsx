import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ClipboardList,
  Factory,
  Loader2,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import { ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { DEMO_ROLES } from '../../lib/demo';
import { ROLE_HOME } from '../../lib/states';
import type { Role } from '../../lib/types';
import { Banner } from '../ui/Feedback';

const ROLE_ICON: Record<Role, LucideIcon> = {
  coordinator: ClipboardList,
  authorizer: ShieldCheck,
  logistics: Truck,
  floor_supervisor: Factory,
};

/** One-click entry to the public demo: pick a role, land on that role's screen. */
export function DemoRolePicker({ compact = false, onDone }: { compact?: boolean; onDone?: () => void }) {
  const { demoLogin, user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<Role | null>(null);
  const [error, setError] = useState('');

  const choose = async (role: Role) => {
    setBusy(role);
    setError('');
    try {
      const u = await demoLogin(role);
      onDone?.();
      navigate(ROLE_HOME[u.role], { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-2">
      {error && <Banner tone="danger">{error}</Banner>}
      {DEMO_ROLES.map((r) => {
        const Icon = ROLE_ICON[r.role];
        const current = user?.role === r.role;
        return (
          <button
            key={r.role}
            type="button"
            disabled={busy !== null || current}
            onClick={() => choose(r.role)}
            className={`group flex w-full items-center gap-3 rounded-lg border text-left transition-colors ${
              compact ? 'px-3 py-2' : 'px-4 py-3'
            } ${
              current
                ? 'border-brand bg-brand-soft'
                : 'border-line bg-surface hover:border-brand hover:bg-brand-soft disabled:opacity-60'
            }`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
              <Icon size={18} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink">
                {r.title}
                <span className="ml-1.5 font-normal text-ink-muted">· {r.person}</span>
              </span>
              {!compact && <span className="block text-[13px] leading-snug text-ink-muted">{r.sees}</span>}
            </span>
            {current ? (
              <span className="text-[12px] font-medium text-brand">You're here</span>
            ) : busy === r.role ? (
              <Loader2 size={16} className="animate-spin text-brand" aria-hidden />
            ) : (
              <ArrowRight
                size={16}
                className="text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-brand"
                aria-hidden
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
