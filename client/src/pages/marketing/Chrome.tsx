import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react';
import { Logo } from '../../components/layout/Logo';
import { useScrolledPast } from './hooks';

type PillVariant = 'accent' | 'outline' | 'black' | 'ghost';
type PillSize = 'sm' | 'md' | 'lg';

const PILL: Record<PillVariant, string> = {
  accent: 'bg-accent text-white border border-accent hover:bg-accent-hover hover:border-accent-hover',
  outline: 'border border-accent text-accent hover:bg-accent-soft',
  black: 'bg-black text-white border border-black hover:bg-ink',
  ghost: 'border border-ink text-ink hover:bg-black hover:text-white',
};
const PILL_SIZE: Record<PillSize, string> = {
  sm: 'h-10 px-4 text-[13px] gap-2',
  md: 'h-[50px] px-8 text-base gap-2.5',
  lg: 'h-14 px-9 text-lg gap-3',
};

/** Fully rounded call-to-action with a trailing arrow that nudges on hover. */
export function Pill({
  to,
  href,
  variant = 'accent',
  size = 'md',
  arrow = true,
  children,
  className = '',
}: {
  to?: string;
  href?: string;
  variant?: PillVariant;
  size?: PillSize;
  arrow?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const cls = `group/pill inline-flex shrink-0 items-center justify-center rounded-full font-normal transition-colors duration-300 ease-pill ${PILL[variant]} ${PILL_SIZE[size]} ${className}`;
  const inner = (
    <>
      {children}
      {arrow && (
        <ArrowRight
          size={size === 'sm' ? 14 : 18}
          className="transition-transform duration-300 ease-out-soft group-hover/pill:translate-x-1"
          aria-hidden
        />
      )}
    </>
  );
  if (href) {
    return (
      <a href={href} className={cls}>
        {inner}
      </a>
    );
  }
  return (
    <Link to={to ?? '/login'} className={cls}>
      {inner}
    </Link>
  );
}

const NAV = [
  { label: 'Product', href: '#product', menu: true },
  { label: 'Roles', href: '#roles', menu: true },
  { label: 'How it works', href: '#flow', menu: false },
  { label: 'Security', href: '#trust', menu: false },
];

/** Sticky top bar: transparent at the top, gains a hairline shadow once scrolled. */
export function MarketingNav() {
  const scrolled = useScrolledPast(8);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);
  return (
    <header
      className={`sticky top-0 z-40 bg-white/95 backdrop-blur transition-shadow duration-300 ${
        scrolled ? 'shadow-[0_1px_0_rgb(var(--line))]' : ''
      }`}
    >
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 lg:px-10">
        <div className="flex items-center gap-8">
          <Link to="/" aria-label="Traackly home">
            <Logo />
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
            {NAV.map((n) => (
              <a
                key={n.label}
                href={n.href}
                className="flex items-center gap-1 text-[15px] font-light text-ink transition-colors hover:text-accent"
              >
                {n.label}
                {n.menu && <ChevronDown size={14} className="opacity-60" aria-hidden />}
              </a>
            ))}
          </nav>
        </div>
        <div className="hidden items-center gap-5 lg:flex">
          <a href="#faq" className="text-[15px] font-light text-ink-muted hover:text-ink">
            FAQ
          </a>
          <Link to="/login" className="text-[15px] font-light text-ink-muted hover:text-ink">
            Log in
          </Link>
          <Pill href="#cta" variant="outline" size="sm" arrow={false}>
            Book a walkthrough
          </Pill>
          <Pill to="/login" size="sm">
            Get started
          </Pill>
        </div>
        <button
          type="button"
          className="rounded-full p-2 lg:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      {open && (
        <div className="fixed inset-x-0 bottom-0 top-[72px] z-40 animate-fade-in overflow-y-auto bg-white px-6 py-6 lg:hidden">
          <nav aria-label="Mobile" className="flex flex-col">
            {NAV.map((n) => (
              <a
                key={n.label}
                href={n.href}
                onClick={() => setOpen(false)}
                className="border-b border-line py-4 font-display text-2xl font-light"
              >
                {n.label}
              </a>
            ))}
          </nav>
          <div className="mt-8 flex flex-col gap-3">
            <Pill to="/login">Get started</Pill>
            <Pill to="/login" variant="ghost" arrow={false}>
              Log in
            </Pill>
          </div>
        </div>
      )}
    </header>
  );
}

const FOOTER = [
  {
    title: 'Product',
    links: ['Request board', 'Authorization', 'Logistics timeline', 'Floor kiosk', 'Live updates'],
  },
  { title: 'Roles', links: ['Coordinators', 'Authorizers', 'Logistics', 'Floor supervisors'] },
  {
    title: 'Trust',
    links: ['Append-only changelog', 'Role-based access', 'Station tokens', 'Session revocation'],
  },
  { title: 'Company', links: ['About Traackly', 'Contact', 'Log in'] },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-16 md:grid-cols-[1.4fr_repeat(4,1fr)] lg:px-10">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-[15px] font-light leading-relaxed text-ink-muted">
            The request layer between your order desk and your shop floor. Nothing changes silently.
          </p>
        </div>
        {FOOTER.map((col) => (
          <div key={col.title}>
            <p className="mb-4 text-sm font-medium">{col.title}</p>
            <ul className="space-y-3">
              {col.links.map((l) => (
                <li key={l}>
                  <a
                    href={l === 'Log in' ? '/login' : '#product'}
                    className="text-[15px] font-light text-ink-muted transition-colors hover:text-ink"
                  >
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 border-t border-line px-5 py-6 text-[13px] font-light text-ink-muted lg:px-10">
        <span>© {new Date().getFullYear()} Traackly. Built for manufacturing teams.</span>
        <span>Every edit. Acknowledged.</span>
      </div>
    </footer>
  );
}
