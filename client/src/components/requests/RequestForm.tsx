import { Flame } from 'lucide-react';
import { Select, TextArea, TextInput } from '../ui/Field';
import { DEPARTMENTS } from '../../lib/states';
import type { Priority, RequestFields } from '../../lib/types';

interface Props {
  value: RequestFields;
  onChange: (v: RequestFields) => void;
  errors: Record<string, string>;
  /** Fields that differ from the authorized version are highlighted (S-21 post-authorization edits). */
  original?: RequestFields;
  disabled?: boolean;
}

/** The four protected request fields, bound to the API's exact field names. */
export function RequestFormFields({ value, onChange, errors, original, disabled }: Props) {
  const set = <K extends keyof RequestFields>(k: K, v: RequestFields[K]) => onChange({ ...value, [k]: v });
  const changed = (k: keyof RequestFields) =>
    original && String(original[k]).trim() !== String(value[k]).trim() ? 'ring-2 ring-state-updated' : '';
  return (
    <div className="space-y-5">
      <TextInput
        label="Client name"
        value={value.clientName}
        onChange={(e) => set('clientName', e.target.value)}
        error={errors.clientName}
        placeholder="e.g. Indian Railways — Central Workshop"
        maxLength={200}
        className={changed('clientName')}
        disabled={disabled}
      />
      <TextArea
        label="Requirement details"
        value={value.requirementDetails}
        onChange={(e) => set('requirementDetails', e.target.value)}
        error={errors.requirementDetails}
        hint={`${value.requirementDetails.length}/5000 — specs, quantities, tolerances, drawings referenced.`}
        placeholder="Part numbers, dimensions, material grade, quantity, finishing…"
        maxLength={5000}
        className={`min-h-[160px] ${changed('requirementDetails')}`}
        disabled={disabled}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="Target department"
          value={value.targetDepartment}
          onChange={(e) => set('targetDepartment', e.target.value as RequestFields['targetDepartment'])}
          error={errors.targetDepartment}
          className={changed('targetDepartment')}
          disabled={disabled}
        >
          <option value="">Select a department</option>
          {DEPARTMENTS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </Select>
        <fieldset>
          <legend className="mb-1.5 block text-[13px] font-semibold">Priority</legend>
          <div
            className={`flex h-10 overflow-hidden rounded border border-line-strong ${changed('priority')}`}
          >
            {(['normal', 'urgent'] as Priority[]).map((p) => (
              <label
                key={p}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-inset has-[:focus-visible]:ring-brand ${
                  value.priority === p
                    ? p === 'urgent'
                      ? 'bg-danger text-ink-inverse'
                      : 'bg-brand text-ink-inverse'
                    : 'bg-surface text-ink hover:bg-surface-hover'
                }`}
              >
                <input
                  type="radio"
                  name="priority"
                  value={p}
                  checked={value.priority === p}
                  onChange={() => set('priority', p)}
                  className="sr-only"
                  disabled={disabled}
                />
                {p === 'urgent' && <Flame size={14} aria-hidden />}
                {p === 'urgent' ? 'Urgent' : 'Normal'}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </div>
  );
}
