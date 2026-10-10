/** The "t-check" mark: a lowercase t whose crossbar becomes a tick — every edit, acknowledged. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="16" className="fill-brand" />
      <path
        d="M16.5 26.5H28.5L34 32L47.5 17.5"
        fill="none"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-state-updated"
      />
      <path
        d="M25.5 13.5V40.5Q25.5 50.5 35.5 50.5H39.5"
        fill="none"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-surface"
      />
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
