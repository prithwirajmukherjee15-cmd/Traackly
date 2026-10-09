import type { ReactNode } from 'react';
import { formatDate, formatDateTime } from '../../lib/format';
import type { TrackRequest } from '../../lib/types';
import { Avatar, Banner, Card } from '../ui/Feedback';
import { StatusBadge } from '../ui/StatusPill';
import { DeptTag, PendingAckTag, PriorityTag, RiskFlag } from './Tags';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-center gap-3 border-b border-line py-2.5 last:border-b-0">
      <dt className="text-[13px] text-ink-muted">{label}</dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </div>
  );
}

/** Read-only summary of a request: properties column plus the full requirement text. */
export function RequestDetails({ request: r }: { request: TrackRequest }) {
  return (
    <div className="space-y-4">
      {r.state === 'declined' && r.declineReason && (
        <Banner tone="danger">
          Declined: <span className="font-normal">{r.declineReason}</span>
        </Banner>
      )}
      {r.state === 'updated' && (
        <Banner tone="warning">
          This request changed after authorization. Downstream teams must acknowledge before work continues.
        </Banner>
      )}
      <Card className="px-5 py-2">
        <dl>
          <Row label="Status">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge state={r.state} />
              <PendingAckTag request={r} />
              <RiskFlag request={r} />
            </div>
          </Row>
          <Row label="Job code">
            <span className="font-mono">{r.jobCode}</span>
          </Row>
          <Row label="Department">
            <DeptTag dept={r.targetDepartment} />
          </Row>
          <Row label="Priority">
            <PriorityTag priority={r.priority} />
          </Row>
          <Row label="Raised by">
            <span className="inline-flex items-center gap-2">
              <Avatar name={r.raisedBy.name} size={24} /> {r.raisedBy.name}
              <span className="text-ink-muted">· {formatDateTime(r.createdAt)}</span>
            </span>
          </Row>
          <Row label="Timeline">
            {r.timeline ? (
              <span>
                {formatDate(r.timeline.estimate)}{' '}
                <span className="text-ink-muted">· set by {r.timeline.setBy.name}</span>
              </span>
            ) : (
              <span className="text-ink-faint">Not set yet</span>
            )}
          </Row>
          {r.acknowledged && (
            <Row label="Last acknowledged">
              {r.acknowledged.by}{' '}
              <span className="text-ink-muted">· {formatDateTime(r.acknowledged.at)}</span>
            </Row>
          )}
        </dl>
      </Card>
      <Card className="p-5">
        <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-ink-muted">
          Requirement details
        </h3>
        <p className="whitespace-pre-wrap leading-relaxed">{r.requirementDetails}</p>
      </Card>
    </div>
  );
}
