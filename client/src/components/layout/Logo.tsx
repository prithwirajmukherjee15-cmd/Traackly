export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="8" className="fill-brand" />
      <rect x="7" y="13" width="4.5" height="12" rx="2.25" className="fill-surface" />
      <rect x="13.75" y="7" width="4.5" height="18" rx="2.25" className="fill-state-updated" />
      <rect x="20.5" y="16" width="4.5" height="9" rx="2.25" className="fill-state-completed" />
    </svg>
  );
}

export function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark />
      <span
        className={`font-display text-[19px] font-semibold tracking-tight ${inverse ? 'text-kiosk-ink' : 'text-ink'}`}
      >
        traackly
      </span>
    </span>
  );
}
