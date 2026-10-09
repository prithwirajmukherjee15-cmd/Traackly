import { AlertTriangle } from 'lucide-react';
import { STATE_META } from '../../lib/states';
import type { RequestState } from '../../lib/types';

/** monday-style status: a full-color cell with a text label (never color alone). */
export function StatusCell({ state, className = '' }: { state: RequestState; className?: string }) {
  const meta = STATE_META[state];
  return (
    <span
      className={`flex h-full min-h-[36px] w-full items-center justify-center gap-1.5 px-2 text-[13px] font-semibold ${meta.cell} ${className}`}
    >
      {state === 'updated' && <AlertTriangle size={14} aria-hidden />}
      {meta.label}
    </span>
  );
}

/** Compact rounded status badge for headers and cards. */
export function StatusBadge({ state, size = 'md' }: { state: RequestState; size?: 'md' | 'lg' }) {
  const meta = STATE_META[state];
  const sizing = size === 'lg' ? 'h-9 px-4 text-base' : 'h-7 px-3 text-[13px]';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${sizing} ${meta.cell}`}>
      {state === 'updated' && <AlertTriangle size={size === 'lg' ? 18 : 14} aria-hidden />}
      {meta.label}
    </span>
  );
}
