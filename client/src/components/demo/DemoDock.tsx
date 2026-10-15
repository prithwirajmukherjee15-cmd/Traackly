import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Lightbulb, Repeat, X } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { DEMO_ROLES, DEMO_STORY, useDemoMode } from '../../lib/demo';
import { DemoRolePicker } from './DemoRolePicker';

/**
 * Floating control on the public demo only: on the homepage it invites visitors in,
 * and inside the app it lets them switch roles in one click.
 */
export function DemoDock() {
  const demo = useDemoMode();
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  if (!demo || pathname === '/login') return null;

  if (!user) {
    if (pathname !== '/') return null;
    return (
      <Link
        to="/login"
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white shadow-pop transition-colors hover:bg-brand-hover"
      >
        Try the live demo, no sign-up
        <ArrowRight size={16} aria-hidden />
      </Link>
    );
  }

  return (
    // Bottom-left: the right side holds item panels whose Save buttons must stay reachable.
    <div className="fixed bottom-5 left-5 z-50 flex flex-col items-start gap-2">
      {open && (
        <div
          role="dialog"
          aria-label="Switch demo role"
          className="w-[340px] max-w-[calc(100vw-40px)] animate-menu-in rounded-panel border border-line bg-surface p-4 text-ink shadow-pop"
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">Switch role</p>
              <p className="text-[12px] text-ink-muted">Sample data. It resets on its own every few hours.</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-ink-muted hover:bg-surface-hover"
              aria-label="Close"
            >
              <X size={16} aria-hidden />
            </button>
          </div>
          <DemoRolePicker compact onDone={() => setOpen(false)} />
          <p className="mt-3 flex gap-2 rounded-md bg-warn-soft p-2.5 text-[12px] leading-snug text-warn-ink">
            <Lightbulb size={14} className="mt-0.5 shrink-0" aria-hidden />
            {DEMO_STORY}
          </p>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2.5 text-[13px] font-medium text-white shadow-pop hover:bg-ink"
      >
        <Repeat size={14} aria-hidden />
        Demo · {DEMO_ROLES.find((r) => r.role === user.role)?.title} · Switch role
      </button>
    </div>
  );
}
