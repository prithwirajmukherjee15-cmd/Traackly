/** The "t-check" mark: a lowercase t whose crossbar becomes a tick — every edit, acknowledged. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="16" className="fill-brand" />
      <path
        d="M26 12V40Q26 50 36 50H40"
        fill="none"
        strokeWidth="7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-surface"
      />
      <path
        d="M16 25H30L35 30L50 14"
        fill="none"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-state-updated"
      />
    </svg>
  );
}

/** Mark + wordmark; the double "aa" is picked out so the name is spelled right. */
export function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark />
      <span
        className={`font-display text-[19px] font-semibold tracking-tight ${inverse ? 'text-kiosk-ink' : 'text-ink'}`}
      >
        tr<span className={inverse ? 'text-brand-on-dark' : 'text-brand'}>aa</span>ckly
      </span>
    </span>
  );
}
