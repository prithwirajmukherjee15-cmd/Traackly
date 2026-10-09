import type { ReactNode } from 'react';
import { Logo } from '../../components/layout/Logo';
import { STATE_META } from '../../lib/states';
import type { RequestState } from '../../lib/types';

const PREVIEW: { client: string; state: RequestState }[] = [
  { client: 'Railway workshop — brush holders', state: 'updated' },
  { client: 'Kirloskar — slip rings', state: 'in_progress' },
  { client: 'BHEL — carbon brushes', state: 'raised' },
  { client: 'L&T Hazira — ring assembly', state: 'completed' },
];

/** Split layout: form on the left, a live-board preview that explains the product on the right. */
export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full bg-surface">
      <div className="flex w-full flex-col px-6 py-8 sm:px-12 lg:w-[520px] lg:shrink-0">
        <Logo />
        <div className="flex flex-1 flex-col justify-center py-10">
          <div className="mx-auto w-full max-w-[380px]">
            <h1 className="font-display text-[28px] font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-2 text-ink-muted">{subtitle}</p>}
            <div className="mt-8">{children}</div>
          </div>
        </div>
        <p className="text-[12px] text-ink-faint">
          Traackly — every change acknowledged before work proceeds.
        </p>
      </div>
      <aside
        className="relative hidden flex-1 overflow-hidden bg-canvas lg:flex lg:items-center lg:justify-center"
        aria-hidden
      >
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-state-raised/25" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-state-completed/20" />
        <div className="relative w-[440px] rounded-panel bg-surface p-6 shadow-pop">
          <p className="mb-1 font-display text-lg font-semibold">Requests in flight</p>
          <p className="mb-4 text-[13px] text-ink-muted">
            One source of truth from order desk to shop floor.
          </p>
          <div className="overflow-hidden rounded-lg border border-line">
            {PREVIEW.map((p) => (
              <div key={p.client} className="flex h-12 items-center border-b border-line last:border-b-0">
                <span className={`h-full w-1.5 ${STATE_META[p.state].strip}`} />
                <span className="flex-1 truncate px-3 text-sm font-medium">{p.client}</span>
                <span
                  className={`flex h-full w-32 items-center justify-center text-[13px] font-semibold ${STATE_META[p.state].cell}`}
                >
                  {STATE_META[p.state].label}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg bg-warn-soft px-4 py-3 text-[13px] text-warn-ink">
            <span className="font-semibold">Spec changed after approval.</span> Production must acknowledge
            before the job can be marked done.
          </div>
        </div>
      </aside>
    </div>
  );
}
