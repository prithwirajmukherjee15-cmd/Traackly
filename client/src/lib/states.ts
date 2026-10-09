import type { Department, Priority, RequestState, Role } from './types';

interface StateMeta {
  label: string;
  /** Tailwind classes for the full-bleed status cell (fill + AA-contrast text). */
  cell: string;
  /** Tailwind text color for group headers. */
  text: string;
  /** Tailwind background for the row's leading color strip. */
  strip: string;
}

// Every state carries a text label, never color alone (UI/UX brief, accessibility).
export const STATE_META: Record<RequestState, StateMeta> = {
  raised: {
    label: 'Raised',
    cell: 'bg-state-raised text-ink',
    text: 'text-state-raised-ink',
    strip: 'bg-state-raised',
  },
  authorization: {
    label: 'Authorizing',
    cell: 'bg-state-authorization text-ink-inverse',
    text: 'text-state-authorization',
    strip: 'bg-state-authorization',
  },
  in_progress: {
    label: 'In progress',
    cell: 'bg-state-progress text-ink',
    text: 'text-state-progress-ink',
    strip: 'bg-state-progress',
  },
  updated: {
    label: 'Updated',
    cell: 'bg-state-updated text-warn-ink',
    text: 'text-warn-ink',
    strip: 'bg-state-updated',
  },
  completed: {
    label: 'Completed',
    cell: 'bg-state-completed text-ink',
    text: 'text-success',
    strip: 'bg-state-completed',
  },
  declined: {
    label: 'Declined',
    cell: 'bg-state-declined text-ink-inverse',
    text: 'text-danger',
    strip: 'bg-state-declined',
  },
};

export const DEPARTMENTS: { id: Department; label: string }[] = [
  { id: 'production', label: 'Production' },
  { id: 'supply', label: 'Supply' },
  { id: 'qa', label: 'QA' },
];

export const deptLabel = (d: Department | null | undefined) =>
  DEPARTMENTS.find((x) => x.id === d)?.label ?? '—';

export const PRIORITY_LABEL: Record<Priority, string> = { normal: 'Normal', urgent: 'Urgent' };

export const ROLE_LABEL: Record<Role, string> = {
  coordinator: 'Coordinator',
  authorizer: 'Authorizer',
  logistics: 'Logistics',
  floor_supervisor: 'Floor supervisor',
};

/** Landing route per role (App Flow S-02: no generic home screen). */
export const ROLE_HOME: Record<Role, string> = {
  coordinator: '/requests',
  authorizer: '/authorize',
  logistics: '/logistics',
  floor_supervisor: '/kiosk',
};

export const FIELD_LABEL: Record<string, string> = {
  clientName: 'Client name',
  requirementDetails: 'Requirement details',
  targetDepartment: 'Target department',
  priority: 'Priority',
};

/** Renders a changelog value in human terms (department and priority slugs become labels). */
export function displayValue(field: string, value: string): string {
  if (field === 'targetDepartment') return deptLabel(value as Department);
  if (field === 'priority') return PRIORITY_LABEL[value as Priority] ?? value;
  return value;
}
