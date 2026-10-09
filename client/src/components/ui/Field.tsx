import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

const CONTROL =
  'w-full rounded border bg-surface px-3 text-sm text-ink placeholder:text-ink-faint transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 disabled:bg-surface-sunken disabled:text-ink-muted';

interface FieldProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  children: (props: {
    id: string;
    'aria-invalid'?: boolean;
    'aria-describedby'?: string;
    className: string;
  }) => ReactNode;
}

/** Label + control + inline error, wired for screen readers. */
export function Field({ label, error, hint, children }: FieldProps) {
  const id = useId();
  const msgId = `${id}-msg`;
  const border = error ? 'border-danger' : 'border-line-strong';
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-semibold text-ink">
        {label}
      </label>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error || hint ? msgId : undefined,
        className: `${CONTROL} ${border}`,
      })}
      {error ? (
        <p id={msgId} className="text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={msgId} className="text-[13px] text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type Labelled = { label: string; error?: string; hint?: ReactNode };

export function TextInput({
  label,
  error,
  hint,
  className = '',
  ...rest
}: Labelled & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} error={error} hint={hint}>
      {(p) => <input {...p} {...rest} className={`${p.className} h-10 ${className}`} />}
    </Field>
  );
}

export function TextArea({
  label,
  error,
  hint,
  className = '',
  ...rest
}: Labelled & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field label={label} error={error} hint={hint}>
      {(p) => (
        <textarea
          {...p}
          {...rest}
          className={`${p.className} min-h-[120px] py-2.5 leading-relaxed ${className}`}
        />
      )}
    </Field>
  );
}

export function Select({
  label,
  error,
  hint,
  className = '',
  children,
  ...rest
}: Labelled & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Field label={label} error={error} hint={hint}>
      {(p) => (
        <select {...p} {...rest} className={`${p.className} h-10 ${className}`}>
          {children}
        </select>
      )}
    </Field>
  );
}
