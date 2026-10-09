export interface Chip<T extends string> {
  value: T;
  label: string;
  count?: number;
}

/** Segmented filter chips; filtering is client-side with no reload (App Flow S-10). */
export function FilterChips<T extends string>({
  chips,
  value,
  onChange,
  label,
}: {
  chips: Chip<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {chips.map((c) => {
        const active = c.value === value;
        return (
          <button
            key={c.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(c.value)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors ${
              active
                ? 'border-brand bg-brand-soft text-brand'
                : 'border-line-strong bg-surface text-ink hover:bg-surface-hover'
            }`}
          >
            {c.label}
            {c.count !== undefined && (
              <span
                className={`rounded-full px-1.5 text-[11px] ${active ? 'bg-brand text-ink-inverse' : 'bg-surface-sunken text-ink-muted'}`}
              >
                {c.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Underlined tabs (monday board-view style). */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: Chip<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="tablist" className="flex gap-1 border-b border-line">
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-3 pb-2.5 pt-1 text-sm font-medium transition-colors ${
              active ? 'border-brand text-ink' : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className="rounded-full bg-surface-sunken px-1.5 text-[11px] text-ink-muted">
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
