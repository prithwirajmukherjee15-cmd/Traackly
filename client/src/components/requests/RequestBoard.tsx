import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { formatDate, timeAgo } from '../../lib/format';
import { STATE_META } from '../../lib/states';
import type { BoardGroup } from '../../lib/grouping';
import type { TrackRequest } from '../../lib/types';
import { Avatar } from '../ui/Feedback';
import { StatusCell } from '../ui/StatusPill';
import { DeptTag, PendingAckTag, PriorityTag, RiskFlag } from './Tags';

export type Column = 'status' | 'department' | 'priority' | 'timeline' | 'updated' | 'owner';

interface BoardProps {
  groups: BoardGroup[];
  columns?: Column[];
  href: (r: TrackRequest) => string;
}

const HEAD: Record<Column, { label: string; cls: string }> = {
  status: { label: 'Status', cls: 'w-[150px]' },
  department: { label: 'Department', cls: 'w-[130px] hidden md:table-cell' },
  priority: { label: 'Priority', cls: 'w-[110px] hidden lg:table-cell' },
  timeline: { label: 'Timeline', cls: 'w-[130px] hidden md:table-cell' },
  updated: { label: 'Last updated', cls: 'w-[130px] hidden xl:table-cell' },
  owner: { label: 'Raised by', cls: 'w-[90px] hidden lg:table-cell' },
};

const DEFAULT_COLUMNS: Column[] = ['status', 'department', 'priority', 'timeline', 'updated', 'owner'];

function Cell({ col, r }: { col: Column; r: TrackRequest }) {
  switch (col) {
    case 'status':
      return <StatusCell state={r.state} />;
    case 'department':
      return <DeptTag dept={r.targetDepartment} />;
    case 'priority':
      return <PriorityTag priority={r.priority} />;
    case 'timeline':
      return r.timeline ? (
        <span className="text-[13px]">{formatDate(r.timeline.estimate)}</span>
      ) : (
        <span className="text-[13px] text-ink-faint">Not set</span>
      );
    case 'updated':
      return <span className="text-[13px] text-ink-muted">{timeAgo(r.updatedAt)}</span>;
    case 'owner':
      return <Avatar name={r.raisedBy.name} />;
  }
}

function Group({ group, columns, href }: { group: BoardGroup; columns: Column[]; href: BoardProps['href'] }) {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();
  const meta = STATE_META[group.tone];
  return (
    <section className="mb-8">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`mb-2 flex items-center gap-1.5 rounded px-1 font-display text-[16px] font-semibold ${meta.text}`}
      >
        <ChevronDown size={18} className={`transition-transform ${open ? '' : '-rotate-90'}`} aria-hidden />
        {group.title}
        <span className="ml-1 font-sans text-[13px] font-normal text-ink-muted">
          {group.items.length} {group.items.length === 1 ? 'request' : 'requests'}
        </span>
      </button>
      {open && (
        <div className="overflow-hidden rounded-lg border border-line">
          <table className="w-full table-fixed border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-surface text-[13px] text-ink-muted">
                <th className="w-1.5 p-0" aria-hidden>
                  <span className={`block h-9 w-1.5 ${meta.strip}`} />
                </th>
                <th className="px-4 py-2 font-medium">Request</th>
                {columns.map((c) => (
                  <th
                    key={c}
                    className={`border-l border-line px-3 py-2 text-center font-medium ${HEAD[c].cls}`}
                  >
                    {HEAD[c].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {group.items.map((r) => {
                const flagged = r.state === 'updated';
                return (
                  <tr
                    key={r.id}
                    onClick={() => navigate(href(r))}
                    className={`cursor-pointer border-b border-line last:border-b-0 ${
                      flagged ? 'bg-warn-soft/60 hover:bg-warn-soft' : 'hover:bg-surface-hover'
                    }`}
                  >
                    <td className="p-0" aria-hidden>
                      <span className={`block h-[60px] w-1.5 ${flagged ? 'bg-state-updated' : meta.strip}`} />
                    </td>
                    <td className="h-[60px] px-4 py-0">
                      <Link
                        to={href(r)}
                        onClick={(e) => e.stopPropagation()}
                        className="block truncate font-medium text-ink hover:text-brand"
                      >
                        {r.clientName}
                      </Link>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[11px] text-ink-muted">{r.jobCode}</span>
                        <PendingAckTag request={r} />
                        <RiskFlag request={r} />
                      </div>
                    </td>
                    {columns.map((c) => (
                      <td
                        key={c}
                        className={`border-l border-line text-center ${c === 'status' ? 'p-0' : 'px-3 py-2'} ${HEAD[c].cls}`}
                      >
                        <div className={c === 'status' ? 'h-[60px]' : 'flex justify-center'}>
                          <Cell col={c} r={r} />
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** monday-style board: collapsible color-coded groups of rows with full-color status cells. */
export function RequestBoard({ groups, columns = DEFAULT_COLUMNS, href }: BoardProps) {
  return (
    <div className="px-6 pb-10 lg:px-8">
      {groups
        .filter((g) => g.items.length > 0)
        .map((g) => (
          <Group key={g.key} group={g} columns={columns} href={href} />
        ))}
    </div>
  );
}
