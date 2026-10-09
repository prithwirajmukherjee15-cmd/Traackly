import { AlertOctagon, Flame } from 'lucide-react';
import { deptLabel } from '../../lib/states';
import type { Department, Priority, TrackRequest } from '../../lib/types';

export function DeptTag({ dept }: { dept: Department }) {
  return (
    <span className="inline-flex h-6 items-center rounded-md bg-surface-sunken px-2 text-[12px] font-semibold text-ink">
      {deptLabel(dept)}
    </span>
  );
}

export function PriorityTag({ priority }: { priority: Priority }) {
  if (priority === 'urgent') {
    return (
      <span className="inline-flex h-6 items-center gap-1 rounded-md bg-danger-soft px-2 text-[12px] font-semibold text-danger">
        <Flame size={13} aria-hidden /> Urgent
      </span>
    );
  }
  return <span className="text-[13px] text-ink-muted">Normal</span>;
}

/** Advisory "likely to stall" flag from the v1 rule-based heuristic (TRD section 7). */
export function RiskFlag({ request }: { request: TrackRequest }) {
  if (!request.risk.atRisk) return null;
  return (
    <span
      title={request.risk.reasons.join(' · ')}
      className="inline-flex h-5 items-center gap-1 rounded bg-danger-soft px-1.5 text-[11px] font-semibold text-danger"
    >
      <AlertOctagon size={12} aria-hidden /> At risk
      <span className="sr-only">: {request.risk.reasons.join(', ')}</span>
    </span>
  );
}

/** Who still owes an acknowledgment of the latest post-authorization edit. */
export function PendingAckTag({ request }: { request: TrackRequest }) {
  if (request.pendingAcks.length === 0) return null;
  const who = request.pendingAcks.map((a) => (a === 'logistics' ? 'Logistics' : 'Floor')).join(' + ');
  return (
    <span className="inline-flex h-5 items-center rounded bg-warn-soft px-1.5 text-[11px] font-semibold text-warn-ink">
      Awaiting ack: {who}
    </span>
  );
}
