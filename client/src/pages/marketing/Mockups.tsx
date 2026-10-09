import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CalendarCheck,
  CheckCheck,
  Flame,
  Lock,
  MessageSquare,
} from 'lucide-react';
import { STATE_META } from '../../lib/states';
import type { RequestState } from '../../lib/types';

// Illustrative product mock-ups built from Traackly's own UI vocabulary (no stock imagery).

export interface MockRow {
  name: string;
  dept: string;
  state: RequestState;
  owner: string;
  urgent?: boolean;
}

const OWNER_TONE = [
  'bg-state-raised',
  'bg-state-authorization',
  'bg-state-progress',
  'bg-state-completed',
  'bg-brand',
];

function Dot({ name }: { name: string }) {
  const tone = OWNER_TONE[name.charCodeAt(0) % OWNER_TONE.length];
  return (
    <span
      className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white ${tone}`}
    >
      {name
        .split(' ')
        .map((p) => p[0])
        .join('')}
    </span>
  );
}

/** A small board: coloured group header, rows with full-colour status cells. Rows animate in. */
export function MiniBoard({
  title,
  tone,
  rows,
  animate = true,
}: {
  title: string;
  tone: RequestState;
  rows: MockRow[];
  animate?: boolean;
}) {
  const meta = STATE_META[tone];
  return (
    <div className="w-full">
      <p className={`mb-2 flex items-center gap-1.5 font-sans text-[13px] font-semibold ${meta.text}`}>
        <span className={`h-3 w-1 rounded-full ${meta.strip}`} aria-hidden />
        {title}
      </p>
      <div className="overflow-hidden rounded-lg border border-line bg-white text-[12px]">
        <div className="grid grid-cols-[6px_1fr_70px_96px_34px] border-b border-line text-ink-muted">
          <span className={meta.strip} />
          <span className="px-3 py-1.5">Request</span>
          <span className="border-l border-line py-1.5 text-center">Dept</span>
          <span className="border-l border-line py-1.5 text-center">Status</span>
          <span className="border-l border-line" />
        </div>
        {rows.map((r, i) => (
          <div
            key={r.name}
            className={`grid h-9 grid-cols-[6px_1fr_70px_96px_34px] border-b border-line last:border-b-0 ${
              animate ? 'animate-row-in' : ''
            } ${r.state === 'updated' ? 'bg-warn-soft/70' : ''}`}
            style={animate ? { animationDelay: `${150 + i * 120}ms` } : undefined}
          >
            <span className={r.state === 'updated' ? 'bg-state-updated' : meta.strip} />
            <span className="flex items-center gap-1.5 truncate px-3 font-medium text-ink">
              {r.urgent && <Flame size={12} className="shrink-0 text-danger" aria-hidden />}
              <span className="truncate">{r.name}</span>
            </span>
            <span className="flex items-center justify-center border-l border-line text-ink-muted">
              {r.dept}
            </span>
            <span
              className={`flex items-center justify-center gap-1 border-l border-line font-semibold ${STATE_META[r.state].cell}`}
            >
              {r.state === 'updated' && <AlertTriangle size={11} aria-hidden />}
              {STATE_META[r.state].label}
            </span>
            <span className="flex items-center justify-center border-l border-line">
              <Dot name={r.owner} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A floating "card" frame used for the parallax collage. */
export function FloatCard({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl bg-panel-cool p-3 shadow-[0_20px_50px_-20px_rgb(var(--shadow)/0.25)] ${className}`}
    >
      <p className="mb-2 px-1 text-[13px] font-medium text-ink">{title}</p>
      <div className="rounded-xl bg-white p-3">{children}</div>
    </div>
  );
}

export function ChangeDiffMock() {
  return (
    <div className="space-y-2 text-[12px]">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Requirement details</p>
      <p className="rounded bg-danger-soft px-2 py-1 text-danger line-through">Brush holders BH-40, 40mm</p>
      <p className="flex items-center gap-1 text-ink-faint">
        <ArrowRight size={12} /> edited by Founder&apos;s Office
      </p>
      <p className="rounded bg-success-soft px-2 py-1 font-medium text-success">Brush holders BH-42, 42mm</p>
    </div>
  );
}

export function KioskMock({ acknowledged = false }: { acknowledged?: boolean }) {
  return (
    <div className="rounded-xl bg-kiosk-bg p-3 text-kiosk-ink">
      <div
        className={`rounded-lg p-3 ${acknowledged ? 'border-2 border-kiosk-line' : 'border-[3px] border-state-updated'} bg-kiosk-card`}
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm font-semibold tracking-wider">TRK-3A6DE8</span>
          {acknowledged ? (
            <span className="rounded-full bg-state-completed px-2 py-0.5 text-[10px] font-bold text-ink">
              READY
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-state-updated px-2 py-0.5 text-[10px] font-bold text-warn-ink">
              <AlertTriangle size={10} /> CHANGED
            </span>
          )}
        </div>
        <p className="mt-1.5 text-[13px] font-semibold">Railway workshop</p>
        <p className="text-[11px] text-kiosk-muted">Brush holders BH-42, 42mm · Qty 120</p>
      </div>
      <div
        className={`mt-2 flex h-9 items-center justify-center gap-1.5 rounded-lg text-[12px] font-semibold ${
          acknowledged ? 'bg-state-completed text-ink' : 'bg-danger text-white'
        }`}
      >
        {acknowledged ? (
          <>
            <CheckCheck size={14} /> Mark done
          </>
        ) : (
          'Acknowledge change'
        )}
      </div>
    </div>
  );
}

export function NotificationMock() {
  return (
    <div className="flex gap-2.5 text-[12px]">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Bell size={15} />
      </span>
      <div>
        <p className="font-semibold text-ink">Change to TRK-3A6DE8 — acknowledgment required</p>
        <p className="mt-0.5 text-ink-muted">Logistics and the Production floor were notified.</p>
      </div>
    </div>
  );
}

export function TimelineMock() {
  return (
    <div className="space-y-2 text-[12px]">
      <div className="flex items-center gap-2">
        <CalendarCheck size={15} className="text-success" />
        <span className="whitespace-nowrap font-medium">Due 14 Oct</span>
        <span className="text-ink-muted">· set by Logistics</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
        <div className="h-full w-2/3 rounded-full bg-state-progress" />
      </div>
    </div>
  );
}

export function UpdatesMock() {
  return (
    <div className="space-y-2 text-[12px]">
      <div className="flex items-start gap-2">
        <Dot name="Meera Iyer" />
        <div className="rounded-lg bg-surface-sunken px-2.5 py-1.5">
          <p className="font-semibold">Meera Iyer</p>
          <p className="text-ink-muted">Raised for Indian Railways — urgent.</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 whitespace-nowrap pl-8 text-ink-faint">
        <MessageSquare size={12} /> 3 updates · <Lock size={12} /> history can&apos;t be edited
      </div>
    </div>
  );
}
