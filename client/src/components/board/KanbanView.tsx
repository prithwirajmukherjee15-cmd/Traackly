import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, Flame, MessageCircle } from 'lucide-react';
import type { BoardGroup } from '../../lib/grouping';
import { deptLabel, STATE_META } from '../../lib/states';
import type { TrackRequest } from '../../lib/types';
import { Avatar } from '../ui/Feedback';
import { StatusBadge } from '../ui/StatusPill';
import { PendingAckTag, RiskFlag } from '../requests/Tags';

const due = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });

function Card({ r, href }: { r: TrackRequest; href: string }) {
  const navigate = useNavigate();
  return (
    <li
      onClick={() => navigate(href)}
      className="group/card cursor-pointer rounded-lg border border-line bg-surface p-3 shadow-[0_1px_2px_rgb(var(--shadow)/0.06)] transition-shadow hover:shadow-pop"
    >
      <div className="flex items-start gap-2">
        <Link
          to={href}
          onClick={(e) => e.stopPropagation()}
          className="min-w-0 flex-1 text-[14px] font-medium leading-snug text-ink hover:text-brand"
        >
          {r.clientName}
        </Link>
        <Avatar name={r.raisedBy.name} size={24} />
      </div>
      <p className="mt-0.5 font-mono text-[11px] text-ink-muted">{r.jobCode}</p>
      <p className="mt-2 line-clamp-2 text-[13px] text-ink-muted">{r.requirementDetails}</p>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <StatusBadge state={r.state} />
        <span className="inline-flex h-7 items-center rounded-full bg-surface-sunken px-2.5 text-[12px] font-medium">
          {deptLabel(r.targetDepartment)}
        </span>
        {r.priority === 'urgent' && (
          <span className="inline-flex h-7 items-center gap-1 rounded-full bg-danger-soft px-2.5 text-[12px] font-semibold text-danger">
            <Flame size={12} aria-hidden /> Urgent
          </span>
        )}
        <PendingAckTag request={r} />
        <RiskFlag request={r} />
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-line pt-2 text-[12px] text-ink-muted">
        <span className="inline-flex items-center gap-1">
          <CalendarDays size={13} aria-hidden />
          {r.timeline ? `Due ${due.format(new Date(r.timeline.estimate))}` : 'No timeline'}
        </span>
        {r.changelog.length > 0 && (
          <span className="inline-flex items-center gap-1 text-brand">
            <MessageCircle size={13} aria-hidden /> {r.changelog.length}
          </span>
        )}
      </div>
    </li>
  );
}

/** Kanban layout: one column per group, cards keep every flag the table shows. */
export function KanbanView({ groups, href }: { groups: BoardGroup[]; href: (r: TrackRequest) => string }) {
  return (
    <div className="flex gap-3 overflow-x-auto px-6 pb-10 lg:px-8">
      {groups.map((g) => (
        <section
          key={g.key}
          aria-label={g.title}
          className="flex w-[280px] shrink-0 flex-col rounded-lg bg-surface-sunken"
        >
          <header
            className={`flex items-center justify-between rounded-t-lg px-3 py-2.5 text-[14px] font-medium ${STATE_META[g.tone].cell}`}
          >
            <span className="truncate">{g.title}</span>
            <span className="ml-2 shrink-0 opacity-80">{g.items.length}</span>
          </header>
          <ul className="flex min-h-[120px] flex-col gap-2 p-2">
            {g.items.length === 0 ? (
              <li className="flex h-24 items-center justify-center rounded-lg border border-dashed border-line-strong text-[13px] text-ink-faint">
                No requests
              </li>
            ) : (
              g.items.map((r) => <Card key={r.id} r={r} href={href(r)} />)
            )}
          </ul>
        </section>
      ))}
    </div>
  );
}
