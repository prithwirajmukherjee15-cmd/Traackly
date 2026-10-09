import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, WifiOff, XCircle } from 'lucide-react';
import { initials } from '../../lib/format';

type Tone = 'info' | 'success' | 'warning' | 'danger';

const BANNER: Record<Tone, { cls: string; Icon: typeof Info }> = {
  info: { cls: 'bg-brand-soft text-ink', Icon: Info },
  success: { cls: 'bg-success-soft text-ink', Icon: CheckCircle2 },
  warning: { cls: 'bg-warn-soft text-warn-ink', Icon: AlertTriangle },
  danger: { cls: 'bg-danger-soft text-danger', Icon: XCircle },
};

export function Banner({
  tone = 'info',
  children,
  action,
}: {
  tone?: Tone;
  children: ReactNode;
  action?: ReactNode;
}) {
  const { cls, Icon } = BANNER[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-lg px-4 py-3 text-sm ${cls}`}
    >
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden />
      <div className="flex-1 font-medium">{children}</div>
      {action}
    </div>
  );
}

/** Non-blocking strip shown while the WebSocket is down (App Flow S-10 ERROR). */
export function ReconnectBanner() {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-warn-soft px-4 py-1.5 text-[13px] font-semibold text-warn-ink"
    >
      <WifiOff size={14} aria-hidden />
      Live updates paused — reconnecting…
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        {icon}
      </div>
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {body && <p className="mt-1.5 max-w-sm text-ink-muted">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-16 text-ink-muted">
      <Loader2 className="animate-spin" size={20} aria-hidden />
      <span className="text-sm">{label}…</span>
    </div>
  );
}

const AVATAR_TONES = [
  'bg-state-raised',
  'bg-state-authorization',
  'bg-state-progress',
  'bg-state-completed',
  'bg-brand',
];

export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const tone = AVATAR_TONES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length];
  return (
    <span
      title={name}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-ink-inverse ${tone}`}
    >
      {initials(name)}
    </span>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-line bg-surface ${className}`}>{children}</section>;
}
