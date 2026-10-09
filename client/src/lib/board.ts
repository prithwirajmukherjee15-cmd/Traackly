import type { BoardGroup } from './grouping';
import { deptLabel, PRIORITY_LABEL, STATE_META } from './states';
import type { Department, Priority, RequestState, TrackRequest } from './types';

export type SortKey = 'updated' | 'created' | 'due' | 'client';
export type GroupBy = 'stage' | 'department' | 'priority';
export type Layout = 'table' | 'kanban';

export interface BoardControls {
  search: string;
  states: RequestState[];
  departments: Department[];
  priorities: Priority[];
  sort: SortKey;
  groupBy: GroupBy;
}

export const DEFAULT_CONTROLS: BoardControls = {
  search: '',
  states: [],
  departments: [],
  priorities: [],
  sort: 'updated',
  groupBy: 'stage',
};

export const SORT_LABEL: Record<SortKey, string> = {
  updated: 'Last updated',
  created: 'Newest first',
  due: 'Due date',
  client: 'Client name',
};

export const activeFilterCount = (c: BoardControls) =>
  c.states.length + c.departments.length + c.priorities.length;

const haystack = (r: TrackRequest) =>
  `${r.clientName} ${r.jobCode} ${r.requirementDetails} ${r.raisedBy.name}`.toLowerCase();

const COMPARE: Record<SortKey, (a: TrackRequest, b: TrackRequest) => number> = {
  updated: (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  created: (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  // Undated requests sink to the bottom.
  due: (a, b) =>
    (a.timeline ? Date.parse(a.timeline.estimate) : Infinity) -
    (b.timeline ? Date.parse(b.timeline.estimate) : Infinity),
  client: (a, b) => a.clientName.localeCompare(b.clientName),
};

/** Search, filter and sort entirely client-side; the board never reloads for these. */
export function applyControls(items: TrackRequest[], c: BoardControls): TrackRequest[] {
  const terms = c.search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return items
    .filter((r) => terms.every((t) => haystack(r).includes(t)))
    .filter((r) => c.states.length === 0 || c.states.includes(r.state))
    .filter((r) => c.departments.length === 0 || c.departments.includes(r.targetDepartment))
    .filter((r) => c.priorities.length === 0 || c.priorities.includes(r.priority))
    .sort(COMPARE[c.sort]);
}

const DEPT_TONE: Record<Department, RequestState> = {
  production: 'in_progress',
  supply: 'raised',
  qa: 'authorization',
};

/** Regroups by a field other than the page's own lifecycle stages. */
export function regroup(
  items: TrackRequest[],
  groupBy: GroupBy,
  stageGroups: (items: TrackRequest[]) => BoardGroup[],
): BoardGroup[] {
  if (groupBy === 'department') {
    return (Object.keys(DEPT_TONE) as Department[]).map((d) => ({
      key: d,
      title: deptLabel(d),
      tone: DEPT_TONE[d],
      items: items.filter((r) => r.targetDepartment === d),
    }));
  }
  if (groupBy === 'priority') {
    return (['urgent', 'normal'] as Priority[]).map((p) => ({
      key: p,
      title: PRIORITY_LABEL[p],
      tone: p === 'urgent' ? 'declined' : 'raised',
      items: items.filter((r) => r.priority === p),
    }));
  }
  return stageGroups(items);
}

/** Share of each lifecycle state in a group, for the summary "battery" bar. */
export function stateBreakdown(items: TrackRequest[]): { state: RequestState; count: number }[] {
  const order: RequestState[] = [
    'updated',
    'raised',
    'authorization',
    'in_progress',
    'completed',
    'declined',
  ];
  return order
    .map((state) => ({ state, count: items.filter((r) => r.state === state).length }))
    .filter((s) => s.count > 0);
}

/** Fraction of the scheduled window already elapsed (0..1), or null with no timeline. */
export function timelineProgress(r: TrackRequest, now = Date.now()): number | null {
  if (!r.timeline) return null;
  if (r.state === 'completed') return 1;
  const start = Date.parse(r.timeline.setAt);
  const end = Date.parse(r.timeline.estimate);
  if (!(end > start)) return 1;
  return Math.min(1, Math.max(0, (now - start) / (end - start)));
}

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** CSV for the selected rows (bulk "Export"). */
export function toCsv(items: TrackRequest[]): string {
  const head = [
    'Job code',
    'Client',
    'Status',
    'Department',
    'Priority',
    'Due',
    'Raised by',
    'Last updated',
    'Details',
  ];
  const rows = items.map((r) => [
    r.jobCode,
    r.clientName,
    STATE_META[r.state].label,
    deptLabel(r.targetDepartment),
    PRIORITY_LABEL[r.priority],
    r.timeline ? r.timeline.estimate.slice(0, 10) : '',
    r.raisedBy.name,
    r.updatedAt,
    r.requirementDetails,
  ]);
  return [head, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}
