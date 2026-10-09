import { useMemo, useState, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { ArrowUpDown, Filter, KanbanSquare, Layers, Search, Table2, X } from 'lucide-react';
import {
  activeFilterCount,
  applyControls,
  DEFAULT_CONTROLS,
  regroup,
  SORT_LABEL,
  type BoardControls,
  type GroupBy,
  type Layout,
  type SortKey,
} from '../../lib/board';
import type { BoardGroup } from '../../lib/grouping';
import { DEPARTMENTS, PRIORITY_LABEL, STATE_META } from '../../lib/states';
import type { Department, Priority, RequestState, TrackRequest } from '../../lib/types';
import { RequestBoard, type Column } from '../requests/RequestBoard';
import { Banner, Spinner } from '../ui/Feedback';
import { OptionRow, Popover, ToolbarButton } from '../ui/Popover';
import { KanbanView } from './KanbanView';

const ALL_STATES: RequestState[] = [
  'raised',
  'authorization',
  'in_progress',
  'updated',
  'completed',
  'declined',
];

function readLayout(key: string): Layout {
  try {
    return localStorage.getItem(`traackly.layout.${key}`) === 'kanban' ? 'kanban' : 'table';
  } catch {
    return 'table';
  }
}

function saveLayout(key: string, layout: Layout) {
  try {
    localStorage.setItem(`traackly.layout.${key}`, layout);
  } catch {
    // Storage blocked (private mode): the choice simply isn't remembered.
  }
}

const toggleIn = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

interface BoardViewProps {
  title: string;
  description?: ReactNode;
  /** Remembers this board's Table/Kanban choice per browser. */
  storageKey: string;
  items: TrackRequest[];
  stageGroups: (items: TrackRequest[]) => BoardGroup[];
  columns: Column[];
  href: (r: TrackRequest) => string;
  /** The board's primary action (monday's "New item"). */
  primary?: ReactNode;
  addHref?: string;
  /** Extra scopes of the same data, e.g. Pending / All authorized. */
  scopes?: ReactNode;
  loading?: boolean;
  error?: boolean;
  /** Shown instead of the board when there are no items at all. */
  empty?: ReactNode;
}

/** A monday-style board: title, view tabs, toolbar, then the main table or Kanban. */
export function BoardView({
  title,
  description,
  storageKey,
  items,
  stageGroups,
  columns,
  href,
  primary,
  addHref,
  scopes,
  loading,
  error,
  empty,
}: BoardViewProps) {
  const [layout, setLayout] = useState<Layout>(() => readLayout(storageKey));
  const [c, setC] = useState<BoardControls>(DEFAULT_CONTROLS);
  const [searchFocused, setSearchFocused] = useState(false);
  const set = (patch: Partial<BoardControls>) => setC((prev) => ({ ...prev, ...patch }));
  const visible = useMemo(() => applyControls(items, c), [items, c]);
  const groups = useMemo(() => regroup(visible, c.groupBy, stageGroups), [visible, c.groupBy, stageGroups]);
  const filters = activeFilterCount(c);
  const narrowed = filters > 0 || c.search.trim() !== '';

  const choose = (l: Layout) => {
    setLayout(l);
    saveLayout(storageKey, l);
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="px-6 pt-5 lg:px-8">
        <h1 className="font-display text-[24px] font-medium leading-tight tracking-[-0.01em] text-ink">
          {title}
        </h1>
        {description && <div className="mt-1 max-w-[760px] text-[14px] text-ink-muted">{description}</div>}
        <div role="tablist" aria-label="Board views" className="mt-4 flex gap-1 border-b border-line">
          {(
            [
              { key: 'table', label: 'Main table', icon: <Table2 size={16} /> },
              { key: 'kanban', label: 'Kanban', icon: <KanbanSquare size={16} /> },
            ] as const
          ).map((v) => {
            const active = layout === v.key;
            return (
              <button
                key={v.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => choose(v.key)}
                className={`relative -mb-px flex h-9 items-center gap-1.5 rounded-t px-3 text-sm transition-colors ${
                  active ? 'text-ink' : 'text-ink-muted hover:bg-surface-hover hover:text-ink'
                }`}
              >
                <span aria-hidden>{v.icon}</span>
                {v.label}
                <span
                  className={`absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand transition-transform duration-200 ${active ? 'scale-x-100' : 'scale-x-0'}`}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1 px-6 py-3 lg:px-8">
        {primary}
        {scopes && (
          <>
            {primary && <span className="mx-2 h-5 w-px bg-line" aria-hidden />}
            {scopes}
            <span className="mx-2 h-5 w-px bg-line" aria-hidden />
          </>
        )}
        <label className="relative inline-flex items-center">
          <Search size={16} className="pointer-events-none absolute left-2 text-ink-muted" aria-hidden />
          <input
            type="search"
            value={c.search}
            onChange={(e) => set({ search: e.target.value })}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder={searchFocused ? 'Search this board' : 'Search'}
            aria-label="Search requests"
            className={`h-8 rounded border pl-8 pr-2 text-sm text-ink transition-[width,border-color,background-color] duration-200 ease-out-soft focus:outline-none ${
              searchFocused || c.search
                ? 'w-[220px] border-brand bg-surface placeholder:text-ink-muted'
                : 'w-[108px] cursor-pointer border-transparent bg-transparent placeholder:text-ink hover:bg-surface-hover'
            }`}
          />
        </label>
        <Popover
          label="Filter"
          icon={<Filter size={16} />}
          badge={filters}
          active={filters > 0}
          width="w-[460px] max-w-[90vw]"
        >
          <div className="flex items-center justify-between px-2 pb-2 pt-1">
            <p className="text-[13px] font-medium text-ink">Quick filters</p>
            {filters > 0 && (
              <button
                type="button"
                onClick={() => set({ states: [], departments: [], priorities: [] })}
                className="text-[13px] text-brand hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <fieldset>
              <legend className="px-2 pb-1 text-[12px] text-ink-muted">Status</legend>
              {ALL_STATES.map((s) => (
                <OptionRow
                  key={s}
                  checked={c.states.includes(s)}
                  onChange={() => set({ states: toggleIn(c.states, s) })}
                >
                  <span className={`h-3 w-3 rounded-sm ${STATE_META[s].strip}`} aria-hidden />
                  {STATE_META[s].label}
                </OptionRow>
              ))}
            </fieldset>
            <fieldset>
              <legend className="px-2 pb-1 text-[12px] text-ink-muted">Department</legend>
              {DEPARTMENTS.map((d) => (
                <OptionRow
                  key={d.id}
                  checked={c.departments.includes(d.id)}
                  onChange={() => set({ departments: toggleIn<Department>(c.departments, d.id) })}
                >
                  {d.label}
                </OptionRow>
              ))}
            </fieldset>
            <fieldset>
              <legend className="px-2 pb-1 text-[12px] text-ink-muted">Priority</legend>
              {(['urgent', 'normal'] as Priority[]).map((p) => (
                <OptionRow
                  key={p}
                  checked={c.priorities.includes(p)}
                  onChange={() => set({ priorities: toggleIn(c.priorities, p) })}
                >
                  {PRIORITY_LABEL[p]}
                </OptionRow>
              ))}
            </fieldset>
          </div>
        </Popover>
        <Popover
          label={c.sort === 'updated' ? 'Sort' : `Sort: ${SORT_LABEL[c.sort]}`}
          icon={<ArrowUpDown size={16} />}
          active={c.sort !== 'updated'}
          width="w-56"
        >
          {(close) =>
            (Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
              <OptionRow
                key={k}
                type="radio"
                name="sort"
                checked={c.sort === k}
                onChange={() => (set({ sort: k }), close())}
              >
                {SORT_LABEL[k]}
              </OptionRow>
            ))
          }
        </Popover>
        <Popover label="Group by" icon={<Layers size={16} />} active={c.groupBy !== 'stage'} width="w-56">
          {(close) =>
            (
              [
                ['stage', 'Stage (default)'],
                ['department', 'Department'],
                ['priority', 'Priority'],
              ] as [GroupBy, string][]
            ).map(([k, label]) => (
              <OptionRow
                key={k}
                type="radio"
                name="group"
                checked={c.groupBy === k}
                onChange={() => (set({ groupBy: k }), close())}
              >
                {label}
              </OptionRow>
            ))
          }
        </Popover>
        {narrowed && (
          <ToolbarButton
            icon={<X size={16} />}
            onClick={() => setC((p) => ({ ...DEFAULT_CONTROLS, sort: p.sort, groupBy: p.groupBy }))}
          >
            Clear
          </ToolbarButton>
        )}
      </div>

      <div className="flex-1">
        {loading ? (
          <Spinner label="Loading requests" />
        ) : error ? (
          <div className="px-6 lg:px-8">
            <Banner tone="danger">Couldn&apos;t load requests. Retrying…</Banner>
          </div>
        ) : items.length === 0 ? (
          empty
        ) : visible.length === 0 ? (
          <div className="px-6 py-16 text-center lg:px-8">
            <p className="text-ink-muted">No requests match this search or filter.</p>
            <button
              type="button"
              onClick={() => setC((p) => ({ ...DEFAULT_CONTROLS, sort: p.sort, groupBy: p.groupBy }))}
              className="mt-3 text-sm font-medium text-brand hover:underline"
            >
              Clear search and filters
            </button>
          </div>
        ) : layout === 'kanban' ? (
          <KanbanView groups={groups} href={href} />
        ) : (
          <RequestBoard groups={groups} columns={columns} href={href} addHref={addHref} />
        )}
      </div>
    </div>
  );
}

/** monday's blue "New item" button. */
export function PrimaryLink({ children, ...rest }: LinkProps) {
  return (
    <Link
      className="inline-flex h-8 items-center gap-1.5 rounded bg-brand px-3 text-sm font-normal text-ink-inverse transition-colors hover:bg-brand-hover"
      {...rest}
    >
      {children}
    </Link>
  );
}
