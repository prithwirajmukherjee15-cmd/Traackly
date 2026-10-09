export interface Chip<T extends string> {
  value: T;
  label: string;
  count?: number;
}

/** Segmented scope switch (e.g. Pending / All authorized) for the board toolbar. */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label = 'Scope',
}: {
  tabs: Chip<T>[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="inline-flex h-8 items-center rounded-md bg-surface-sunken p-0.5"
    >
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={`flex h-7 items-center gap-1.5 rounded px-3 text-sm transition-colors duration-150 ${
              active
                ? 'bg-surface text-ink shadow-[0_1px_3px_rgb(var(--shadow)/0.15)]'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span
                className={`rounded-full px-1.5 text-[11px] leading-[18px] ${active ? 'bg-brand text-ink-inverse' : 'bg-line text-ink-muted'}`}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
