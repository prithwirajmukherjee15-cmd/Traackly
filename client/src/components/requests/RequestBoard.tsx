import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, Download, Flame, MessageCircle, Plus, X } from 'lucide-react';
import { stateBreakdown, timelineProgress, toCsv } from '../../lib/board';
import { timeAgo } from '../../lib/format';
import type { BoardGroup } from '../../lib/grouping';
import { deptLabel, PRIORITY_LABEL, STATE_META } from '../../lib/states';
import type { Department, Priority, TrackRequest } from '../../lib/types';
import { Avatar } from '../ui/Feedback';
import { StatusCell } from '../ui/StatusPill';
import { PendingAckTag, RiskFlag } from './Tags';

export type Column = 'person' | 'status' | 'department' | 'priority' | 'timeline' | 'updated' | 'code';

interface BoardProps {
  groups: BoardGroup[];
  columns?: Column[];
  href: (r: TrackRequest) => string;
  /** Shows the "+ Add request" row at the foot of each group. */
  addHref?: string;
}

// `from` is the viewport width a column appears at. Columns are dropped in JS, not hidden with
// CSS: a fixed-layout table still reserves width for display:none cells.
const HEAD: Record<Column, { label: string; width: number; from: number }> = {
  person: { label: 'Person', width: 84, from: 1024 },
  status: { label: 'Status', width: 140, from: 0 },
  department: { label: 'Department', width: 130, from: 768 },
  priority: { label: 'Priority', width: 120, from: 1024 },
  timeline: { label: 'Timeline', width: 160, from: 768 },
  updated: { label: 'Last updated', width: 130, from: 1280 },
  code: { label: 'Job code', width: 120, from: 1280 },
};

function useViewportWidth() {
  const [width, setWidth] = useState(() => (typeof window === 'undefined' ? 1440 : window.innerWidth));
  useEffect(() => {
    const on = () => setWidth(window.innerWidth);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return width;
}

const DEFAULT_COLUMNS: Column[] = ['person', 'status', 'department', 'priority', 'timeline', 'updated'];

const DEPT_CELL: Record<Department, string> = {
  production: 'bg-dept-production',
  supply: 'bg-dept-supply',
  qa: 'bg-dept-qa',
};

const shortDate = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });

/** A full-colour label cell (department, priority), as on a monday board. */
function LabelCell({ cls, children }: { cls: string; children: React.ReactNode }) {
  return (
    <span
      className={`flex h-full min-h-[36px] w-full items-center justify-center gap-1 px-2 text-[13px] font-medium text-ink-inverse ${cls}`}
    >
      {children}
    </span>
  );
}

/** Rounded timeline pill: the filled share is how much of the scheduled window has elapsed. */
export function TimelinePill({ request }: { request: TrackRequest }) {
  const progress = timelineProgress(request);
  if (progress === null || !request.timeline) {
    return (
      <span className="mx-auto flex h-6 w-[120px] items-center justify-center rounded-full bg-surface-sunken text-[12px] text-ink-faint">
        –
      </span>
    );
  }
  const range = `${shortDate.format(new Date(request.timeline.setAt))} – ${shortDate.format(new Date(request.timeline.estimate))}`;
  const overdue = progress >= 1 && request.state !== 'completed';
  return (
    <span
      title={`Due ${shortDate.format(new Date(request.timeline.estimate))}${overdue ? ' (overdue)' : ''}`}
      className="relative mx-auto flex h-6 w-[130px] items-center justify-center overflow-hidden rounded-full bg-line-strong/70 text-[12px] font-medium text-ink"
    >
      <span
        className={`absolute inset-y-0 left-0 ${overdue ? 'bg-danger/80' : STATE_META[request.state].strip}`}
        style={{ width: `${Math.round(progress * 100)}%` }}
        aria-hidden
      />
      <span className="relative">{range}</span>
    </span>
  );
}

function Cell({ col, r }: { col: Column; r: TrackRequest }) {
  switch (col) {
    case 'status':
      return <StatusCell state={r.state} />;
    case 'department':
      return <LabelCell cls={DEPT_CELL[r.targetDepartment]}>{deptLabel(r.targetDepartment)}</LabelCell>;
    case 'priority':
      return <PriorityCell priority={r.priority} />;
    case 'timeline':
      return <TimelinePill request={r} />;
    case 'updated':
      return <span className="text-[13px] text-ink-muted">{timeAgo(r.updatedAt)}</span>;
    case 'person':
      return <Avatar name={r.raisedBy.name} />;
    case 'code':
      return <span className="font-mono text-[12px] text-ink-muted">{r.jobCode}</span>;
  }
}

function PriorityCell({ priority }: { priority: Priority }) {
  return (
    <LabelCell cls={priority === 'urgent' ? 'bg-prio-urgent' : 'bg-prio-normal'}>
      {priority === 'urgent' && <Flame size={13} aria-hidden />}
      {PRIORITY_LABEL[priority]}
    </LabelCell>
  );
}

/** Group footer: each lifecycle state's share of the group, like monday's status summary. */
export function StatusBattery({ items }: { items: TrackRequest[] }) {
  const parts = stateBreakdown(items);
  const summary = parts.map((p) => `${p.count} ${STATE_META[p.state].label}`).join(', ');
  return (
    <span role="img" aria-label={`Status summary: ${summary}`} className="flex h-6 w-full overflow-hidden">
      {parts.map((p) => (
        <span
          key={p.state}
          title={`${STATE_META[p.state].label}: ${p.count}/${items.length}`}
          className={`h-full ${STATE_META[p.state].strip}`}
          style={{ flexGrow: p.count }}
        />
      ))}
    </span>
  );
}

const cellBorder = 'border-b border-r border-line';

function Group({
  group,
  columns,
  href,
  addHref,
  selected,
  setSelected,
}: {
  group: BoardGroup;
  columns: Column[];
  href: BoardProps['href'];
  addHref?: string;
  selected: Set<string>;
  setSelected: (fn: (s: Set<string>) => Set<string>) => void;
}) {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();
  const meta = STATE_META[group.tone];
  const ids = group.items.map((r) => r.id);
  const allOn = ids.length > 0 && ids.every((id) => selected.has(id));
  const toggleAll = () =>
    setSelected((s) => {
      const next = new Set(s);
      ids.forEach((id) => (allOn ? next.delete(id) : next.add(id)));
      return next;
    });
  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section className="mb-10">
      <div className="mb-1.5 flex flex-wrap items-center gap-x-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={`flex items-center gap-1.5 rounded px-1 py-0.5 text-left font-display text-[16px] font-medium leading-tight hover:bg-surface-hover sm:text-[18px] ${meta.text}`}
        >
          <ChevronDown
            size={20}
            className={`transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
            aria-hidden
          />
          {group.title}
        </button>
        <span className="text-[13px] text-ink-muted">
          {group.items.length} {group.items.length === 1 ? 'request' : 'requests'}
        </span>
      </div>
      {open && (
        <div className="overflow-x-auto">
          {/* Browsers ignore min-width on fixed-layout tables, so the wrapper holds the scroll width. */}
          <div style={{ minWidth: 6 + 40 + 220 + columns.reduce((w, c) => w + HEAD[c].width, 0) }}>
            <table className="w-full table-fixed border-separate border-spacing-0 text-left">
              <thead>
                <tr className="text-[13px] text-ink-muted">
                  <th className="w-1.5 p-0" aria-hidden>
                    <span className={`block h-9 w-1.5 rounded-tl-md ${meta.strip}`} />
                  </th>
                  <th className={`w-10 border-t border-line ${cellBorder}`}>
                    <span className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={allOn}
                        onChange={toggleAll}
                        aria-label={`Select all in ${group.title}`}
                        className="h-4 w-4 cursor-pointer accent-[rgb(var(--brand))]"
                      />
                    </span>
                  </th>
                  <th className={`border-t border-line px-3 py-2 font-normal ${cellBorder}`}>Request</th>
                  {columns.map((c) => (
                    <th
                      key={c}
                      className={`border-t border-line px-2 py-2 text-center font-normal ${cellBorder} `}
                      style={{ width: HEAD[c].width }}
                    >
                      {HEAD[c].label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {group.items.map((r) => {
                  const flagged = r.state === 'updated';
                  const isOn = selected.has(r.id);
                  const updates = r.changelog.length;
                  return (
                    <tr
                      key={r.id}
                      onClick={() => navigate(href(r))}
                      className={`group/row cursor-pointer ${
                        isOn
                          ? 'bg-brand-soft/60'
                          : flagged
                            ? 'bg-warn-soft/60 hover:bg-warn-soft'
                            : 'bg-surface hover:bg-surface-hover'
                      }`}
                    >
                      <td className="p-0" aria-hidden>
                        <span className={`block h-10 w-1.5 ${flagged ? 'bg-state-updated' : meta.strip}`} />
                      </td>
                      <td className={`${cellBorder} p-0`} onClick={(e) => e.stopPropagation()}>
                        <label className="flex h-10 cursor-pointer items-center justify-center">
                          <input
                            type="checkbox"
                            checked={isOn}
                            onChange={() => toggle(r.id)}
                            aria-label={`Select ${r.clientName}`}
                            className="h-4 w-4 cursor-pointer accent-[rgb(var(--brand))]"
                          />
                        </label>
                      </td>
                      <td className={`${cellBorder} h-10 px-3 py-0`}>
                        <div className="flex items-center gap-2">
                          <Link
                            to={href(r)}
                            onClick={(e) => e.stopPropagation()}
                            className="min-w-[96px] truncate text-[14px] text-ink hover:text-brand"
                          >
                            {r.clientName}
                          </Link>
                          <span className="flex min-w-0 items-center gap-1 overflow-hidden">
                            <PendingAckTag request={r} />
                            <RiskFlag request={r} />
                          </span>
                          <span
                            className={`relative ml-auto mr-1 shrink-0 ${updates ? 'text-brand' : 'text-ink-faint opacity-0 group-hover/row:opacity-100'}`}
                            title={
                              updates
                                ? `${updates} logged change${updates === 1 ? '' : 's'}`
                                : 'No changes logged'
                            }
                          >
                            <MessageCircle size={18} aria-hidden />
                            {updates > 0 && (
                              <span className="absolute -bottom-1 -right-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-brand px-0.5 text-[9px] font-semibold text-ink-inverse">
                                {updates}
                              </span>
                            )}
                            <span className="sr-only">
                              {updates} logged change{updates === 1 ? '' : 's'}
                            </span>
                          </span>
                        </div>
                      </td>
                      {columns.map((c) => (
                        <td
                          key={c}
                          className={`${cellBorder} text-center ${['status', 'department', 'priority'].includes(c) ? 'p-0' : 'px-2 py-0'}`}
                        >
                          <div
                            className={
                              ['status', 'department', 'priority'].includes(c)
                                ? 'h-10'
                                : 'flex justify-center'
                            }
                          >
                            <Cell col={c} r={r} />
                          </div>
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {addHref && (
                  <tr>
                    <td className="p-0" aria-hidden>
                      <span className={`block h-9 w-1.5 rounded-bl-md opacity-50 ${meta.strip}`} />
                    </td>
                    <td className={`${cellBorder}`} />
                    <td className={`${cellBorder} px-3`} colSpan={columns.length + 1}>
                      <Link
                        to={addHref}
                        className="inline-flex h-9 items-center gap-1.5 text-[14px] text-ink-muted hover:text-brand"
                      >
                        <Plus size={15} aria-hidden /> Add request
                      </Link>
                    </td>
                  </tr>
                )}
                <tr>
                  <td className="p-0" />
                  <td />
                  <td />
                  {columns.map((c) => (
                    <td
                      key={c}
                      className={c === 'status' ? 'border-b border-l border-r border-line p-1.5' : ''}
                    >
                      {c === 'status' && <StatusBattery items={group.items} />}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** Bottom action bar for selected rows. */
function SelectionBar({ items, onClear }: { items: TrackRequest[]; onClear: () => void }) {
  return (
    <div
      role="region"
      aria-label="Selected requests"
      className="fixed bottom-6 left-1/2 z-20 flex h-16 animate-bar-up items-stretch overflow-hidden rounded-lg bg-surface shadow-pop"
    >
      <span className="flex w-16 items-center justify-center bg-brand font-display text-[26px] font-light text-ink-inverse">
        {items.length}
      </span>
      <div className="flex flex-col justify-center px-5">
        <span className="text-[18px] font-normal">Request{items.length === 1 ? '' : 's'} selected</span>
        <span className="mt-1 flex gap-1" aria-hidden>
          {items.slice(0, 14).map((r) => (
            <span key={r.id} className={`h-2 w-2 rounded-full ${STATE_META[r.state].strip}`} />
          ))}
        </span>
      </div>
      <button
        type="button"
        onClick={() =>
          download(`traackly-requests-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(items))
        }
        className="flex w-20 flex-col items-center justify-center gap-1 border-l border-line text-[12px] text-ink hover:bg-surface-hover"
      >
        <Download size={18} aria-hidden /> Export
      </button>
      <button
        type="button"
        onClick={onClear}
        aria-label="Clear selection"
        className="flex w-14 items-center justify-center border-l border-line text-ink-muted hover:bg-surface-hover"
      >
        <X size={20} aria-hidden />
      </button>
    </div>
  );
}

/** monday-style main table: collapsible colour-coded groups, full-colour label cells, summaries. */
export function RequestBoard({ groups, columns: wanted = DEFAULT_COLUMNS, href, addHref }: BoardProps) {
  const viewport = useViewportWidth();
  const columns = wanted.filter((c) => viewport >= HEAD[c].from);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const all = groups.flatMap((g) => g.items);
  const picked = all.filter((r) => selected.has(r.id));
  return (
    <div className="px-6 pb-24 lg:px-8">
      {groups
        .filter((g) => g.items.length > 0)
        .map((g) => (
          <Group
            key={g.key}
            group={g}
            columns={columns}
            href={href}
            addHref={addHref}
            selected={selected}
            setSelected={setSelected}
          />
        ))}
      {picked.length > 0 && <SelectionBar items={picked} onClear={() => setSelected(new Set())} />}
    </div>
  );
}
