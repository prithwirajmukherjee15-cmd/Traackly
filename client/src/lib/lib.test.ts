import { code39Bars } from './barcode';
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
