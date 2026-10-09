import { code39Bars } from './barcode';
import {
  activeFilterCount,
  applyControls,
  DEFAULT_CONTROLS,
  regroup,
  stateBreakdown,
  timelineProgress,
  toCsv,
  type BoardControls,
} from './board';
import { dateInputToISO, initials, isoToDateInput, timeAgo } from './format';
import { groupByState } from './grouping';
import { EMPTY_FIELDS, sameFields, toBody, validateFields } from './requestFields';
import { displayValue } from './states';
import { buildTimeline } from './timeline';
import { fieldErrors, inviteSchema, passwordSchema } from './validation';
import { makeRequest } from '../test/fixtures';

describe('request field validation mirrors the server', () => {
  it('reports every missing field with the App Flow copy', () => {
    const errs = validateFields(EMPTY_FIELDS);
    expect(errs.clientName).toBe('Client name is required');
    expect(errs.requirementDetails).toBe('Requirement details are required');
    expect(errs.targetDepartment).toBe('Select a target department');
  });

  it('accepts a complete request and trims the body', () => {
    const f = {
      clientName: ' BHEL ',
      requirementDetails: ' Brushes ',
      targetDepartment: 'qa' as const,
      priority: 'urgent' as const,
    };
    expect(validateFields(f)).toEqual({});
    expect(toBody(f)).toEqual({
      clientName: 'BHEL',
      requirementDetails: 'Brushes',
      targetDepartment: 'qa',
      priority: 'urgent',
    });
    expect(sameFields(f, { ...f, clientName: 'BHEL' })).toBe(true);
    expect(sameFields(f, { ...f, priority: 'normal' })).toBe(false);
  });

  it('enforces the password policy and match', () => {
    const errs = fieldErrors(passwordSchema.safeParse({ password: 'short', confirmPassword: 'nope' }));
    expect(errs.password).toMatch(/8 characters/);
    expect(
      fieldErrors(passwordSchema.safeParse({ password: 'password1', confirmPassword: 'password2' }))
        .confirmPassword,
    ).toBe("Passwords don't match");
    expect(passwordSchema.safeParse({ password: 'password1', confirmPassword: 'password1' }).success).toBe(
      true,
    );
  });

  it('requires a department only for floor supervisors', () => {
    const base = { name: 'Ravi Kumar', email: 'ravi@ncbp.in', role: 'floor_supervisor', department: '' };
    expect(fieldErrors(inviteSchema.safeParse(base)).department).toBe('Floor supervisors need a department');
    expect(inviteSchema.safeParse({ ...base, role: 'logistics' }).success).toBe(true);
    expect(fieldErrors(inviteSchema.safeParse({ ...base, email: 'nope' })).email).toBe(
      'Enter a valid email address',
    );
  });
});

describe('formatting', () => {
  it('formats relative time', () => {
    const now = Date.parse('2026-08-01T12:00:00Z');
    expect(timeAgo('2026-08-01T11:59:50Z', now)).toBe('just now');
    expect(timeAgo('2026-08-01T11:30:00Z', now)).toBe('30m ago');
    expect(timeAgo('2026-08-01T07:00:00Z', now)).toBe('5h ago');
    expect(timeAgo('2026-07-29T12:00:00Z', now)).toBe('3d ago');
    expect(timeAgo('2026-06-01T12:00:00Z', now)).toMatch(/2026/);
  });

  it('round-trips date inputs at end of working day', () => {
    const iso = dateInputToISO('2026-08-14');
    expect(new Date(iso).getHours()).toBe(17);
    expect(isoToDateInput(iso)).toBe('2026-08-14');
  });

  it('builds initials and display values', () => {
    expect(initials('Meera  Iyer')).toBe('MI');
    expect(displayValue('targetDepartment', 'qa')).toBe('QA');
    expect(displayValue('priority', 'urgent')).toBe('Urgent');
    expect(displayValue('clientName', 'X')).toBe('X');
  });
});

describe('code 39 barcode', () => {
  it('encodes start/stop plus each character as 5 bars', () => {
    const { bars, width } = code39Bars('TRK-1');
    expect(bars).toHaveLength(7 * 5);
    expect(width).toBeGreaterThan(0);
  });

  it('drops characters Code 39 cannot encode', () => {
    expect(code39Bars('a_b').bars).toHaveLength(4 * 5);
  });
});

describe('timeline', () => {
  it('groups one edit across fields and orders newest first with the edit above its status change', () => {
    const r = makeRequest({
      changelog: [
        {
          field: 'priority',
          oldValue: 'normal',
          newValue: 'urgent',
          changedBy: { id: 'a', name: 'Founder' },
          changedAt: '2026-08-02T10:00:00.000Z',
        },
        {
          field: 'clientName',
          oldValue: 'A',
          newValue: 'B',
          changedBy: { id: 'a', name: 'Founder' },
          changedAt: '2026-08-02T10:00:00.000Z',
        },
      ],
      statusHistory: [
        { from: '', to: 'raised', actor: 'Meera', at: '2026-08-01T09:00:00.000Z' },
        { from: 'raised', to: 'authorization', actor: 'Founder', at: '2026-08-01T10:00:00.000Z' },
        { from: 'authorization', to: 'in_progress', actor: 'Founder', at: '2026-08-01T10:00:00.000Z' },
        { from: 'in_progress', to: 'updated', actor: 'Founder', at: '2026-08-02T10:00:00.000Z' },
      ],
    });
    const events = buildTimeline(r);
    expect(events.map((e) => e.to ?? 'edit')).toEqual([
      'edit',
      'updated',
      'in_progress',
      'authorization',
      'raised',
    ]);
    expect(events[0]!.entries).toHaveLength(2);
  });
});

describe('timeline ordering uses real time, not string order', () => {
  it('orders timestamps whose fractional seconds differ in length', () => {
    // Go's RFC3339Nano drops trailing zeros, so ".1Z" (later) sorts before ".12Z" as a string.
    const r = makeRequest({
      statusHistory: [
        { from: '', to: 'raised', actor: 'Meera', at: '2026-10-09T09:15:07.1Z' },
        { from: 'raised', to: 'authorization', actor: 'Founder', at: '2026-10-09T09:15:07.12Z' },
        { from: 'authorization', to: 'in_progress', actor: 'Founder', at: '2026-10-09T09:15:07.12Z' },
      ],
    });
    expect(buildTimeline(r).map((e) => e.to)).toEqual(['in_progress', 'authorization', 'raised']);
  });
});

describe('board grouping', () => {
  it('puts updated requests first and keeps every state', () => {
    const groups = groupByState([
      makeRequest({ id: 'a', state: 'completed' }),
      makeRequest({ id: 'b', state: 'updated' }),
    ]);
    expect(groups[0]!.key).toBe('updated');
    expect(groups[0]!.items.map((r) => r.id)).toEqual(['b']);
    expect(groups.map((g) => g.key)).toContain('declined');
  });
});

describe('board controls', () => {
  const items = [
    makeRequest({
      id: 'a',
      clientName: 'BHEL Haridwar',
      state: 'raised',
      targetDepartment: 'supply',
      updatedAt: '2026-10-01T00:00:00Z',
    }),
    makeRequest({
      id: 'b',
      clientName: 'Kirloskar',
      state: 'in_progress',
      priority: 'urgent',
      updatedAt: '2026-10-03T00:00:00Z',
    }),
    makeRequest({
      id: 'c',
      clientName: 'Siemens',
      jobCode: 'TRK-XYZ999',
      state: 'updated',
      targetDepartment: 'qa',
      updatedAt: '2026-10-02T00:00:00Z',
      timeline: {
        estimate: '2026-10-05T00:00:00Z',
        setBy: { id: 'l', name: 'L' },
        setAt: '2026-10-01T00:00:00Z',
      },
    }),
  ];

  it('searches name, job code and details, every term must match', () => {
    expect(applyControls(items, { ...DEFAULT_CONTROLS, search: 'xyz999' }).map((r) => r.id)).toEqual(['c']);
    expect(applyControls(items, { ...DEFAULT_CONTROLS, search: 'bhel brush' }).map((r) => r.id)).toEqual([
      'a',
    ]);
    expect(applyControls(items, { ...DEFAULT_CONTROLS, search: 'bhel kirloskar' })).toEqual([]);
  });

  it('filters within a field as OR and across fields as AND', () => {
    const c: BoardControls = { ...DEFAULT_CONTROLS, states: ['raised', 'updated'], departments: ['qa'] };
    expect(applyControls(items, c).map((r) => r.id)).toEqual(['c']);
    expect(activeFilterCount({ ...DEFAULT_CONTROLS, states: ['raised'], priorities: ['urgent'] })).toBe(2);
  });

  it('sorts by last update by default and puts undated requests last by due date', () => {
    expect(applyControls(items, DEFAULT_CONTROLS).map((r) => r.id)).toEqual(['b', 'c', 'a']);
    expect(applyControls(items, { ...DEFAULT_CONTROLS, sort: 'due' })[0]!.id).toBe('c');
    expect(applyControls(items, { ...DEFAULT_CONTROLS, sort: 'client' }).map((r) => r.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('regroups by department or priority, otherwise uses the page stages', () => {
    expect(regroup(items, 'department', groupByState).map((g) => [g.key, g.items.length])).toEqual([
      ['production', 1],
      ['supply', 1],
      ['qa', 1],
    ]);
    expect(regroup(items, 'priority', groupByState)[0]!.items.map((r) => r.id)).toEqual(['b']);
    expect(regroup(items, 'stage', groupByState)[0]!.key).toBe('updated');
  });

  it('summarises states for the battery bar', () => {
    expect(stateBreakdown([...items, makeRequest({ id: 'd', state: 'raised' })])).toEqual([
      { state: 'updated', count: 1 },
      { state: 'raised', count: 2 },
      { state: 'in_progress', count: 1 },
    ]);
  });

  it('measures timeline progress between scheduling and the estimate', () => {
    const r = items[2]!;
    expect(timelineProgress(items[0]!)).toBeNull();
    expect(timelineProgress(r, Date.parse('2026-10-03T00:00:00Z'))).toBeCloseTo(0.5);
    expect(timelineProgress(r, Date.parse('2026-11-01T00:00:00Z'))).toBe(1);
    expect(timelineProgress({ ...r, state: 'completed' }, Date.parse('2026-10-01T00:00:00Z'))).toBe(1);
  });

  it('exports CSV with quoting', () => {
    const csv = toCsv([makeRequest({ clientName: 'Acme, "Pune"', requirementDetails: 'Line 1\nLine 2' })]);
    const [head, row] = csv.split('\n');
    expect(head).toBe('Job code,Client,Status,Department,Priority,Due,Raised by,Last updated,Details');
    expect(row).toContain('"Acme, ""Pune"""');
    expect(csv).toContain('"Line 1\nLine 2"');
  });
});
