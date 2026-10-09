import { AlertOctagon, Flame } from 'lucide-react';
import { deptLabel } from '../../lib/states';
import type { Department, Priority, TrackRequest } from '../../lib/types';

const DEPT_LABEL_BG: Record<Department, string> = {
  production: 'bg-dept-production',
  supply: 'bg-dept-supply',
  qa: 'bg-dept-qa',
};

/** Department as a coloured label, matching the board's label column. */
export function DeptTag({ dept }: { dept: Department }) {
  return (
    <span
      className={`inline-flex h-7 min-w-[96px] items-center justify-center rounded-sm px-3 text-[13px] font-medium text-ink-inverse ${DEPT_LABEL_BG[dept]}`}
    >
      {deptLabel(dept)}
    </span>
  );
}

/** Priority as a coloured label, matching the board's label column. */
export function PriorityTag({ priority }: { priority: Priority }) {
  return (
    <span
      className={`inline-flex h-7 min-w-[96px] items-center justify-center gap-1 rounded-sm px-3 text-[13px] font-medium text-ink-inverse ${
        priority === 'urgent' ? 'bg-prio-urgent' : 'bg-prio-normal'
      }`}
    >
      {priority === 'urgent' && <Flame size={13} aria-hidden />}
      {priority === 'urgent' ? 'Urgent' : 'Normal'}
    </span>
  );
}

/** Advisory "likely to stall" flag from the v1 rule-based heuristic (TRD section 7). */
export function RiskFlag({ request }: { request: TrackRequest }) {
  if (!request.risk.atRisk) return null;
  return (
    <span
      title={request.risk.reasons.join(' · ')}
      className="inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded bg-danger-soft px-1.5 text-[11px] font-semibold text-danger"
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
    <span
      title={`Awaiting acknowledgment: ${who}`}
      className="inline-flex h-5 shrink-0 items-center whitespace-nowrap rounded bg-warn-soft px-1.5 text-[11px] font-semibold text-warn-ink"
    >
      Awaiting ack: {who}
    </span>
  );
}
