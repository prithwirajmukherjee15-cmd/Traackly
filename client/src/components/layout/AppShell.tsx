import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { ClipboardCheck, Inbox, LayoutList, LogOut, Plus, Truck, UserRound, Users } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useLiveStatus } from '../../lib/realtime';
import { ROLE_LABEL } from '../../lib/states';
import type { Role } from '../../lib/types';
import { Avatar, ReconnectBanner } from '../ui/Feedback';
import { Logo, LogoMark } from './Logo';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}

const NAV: Record<Role, NavItem[]> = {
  coordinator: [
    { to: '/requests', label: 'My requests', icon: <LayoutList size={18} />, end: true },
    { to: '/requests/new', label: 'New request', icon: <Plus size={18} /> },
  ],
  authorizer: [
    { to: '/authorize', label: 'Authorization queue', icon: <ClipboardCheck size={18} /> },
    { to: '/team', label: 'Manage team', icon: <Users size={18} /> },
  ],
  logistics: [{ to: '/logistics', label: 'Logistics queue', icon: <Truck size={18} /> }],
  floor_supervisor: [{ to: '/kiosk', label: 'Kiosk', icon: <Inbox size={18} /> }],
};

function LiveDot() {
  const live = useLiveStatus() === 'open';
  return (
    <span className="hidden items-center gap-1.5 text-[12px] font-medium text-ink-muted sm:inline-flex">
      <span
        className={`h-2 w-2 rounded-full ${live ? 'bg-state-completed' : 'bg-state-updated'}`}
        aria-hidden
      />
      {live ? 'Live' : 'Reconnecting'}
    </span>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  if (!user) return null;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full p-0.5 hover:ring-2 hover:ring-brand/30"
      >
        <Avatar name={user.name} size={32} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-30 w-60 rounded-xl border border-line bg-surface p-2 shadow-pop"
        >
          <div className="px-3 py-2">
            <p className="font-semibold">{user.name}</p>
            <p className="truncate text-[13px] text-ink-muted">{user.email}</p>
            <p className="mt-1 text-[12px] font-medium text-brand">{ROLE_LABEL[user.role]}</p>
          </div>
          <div className="my-1 border-t border-line" />
          <Link
            role="menuitem"
            to="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-surface-hover"
          >
            <UserRound size={16} /> Profile
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={() => void logout()}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-surface-hover"
          >
            <LogOut size={16} /> Log out
          </button>
        </div>
      )}
    </div>
  );
}

/** Office-role layout: top bar, fixed sidebar (icon rail below 1024px), light content panel. */
export function AppShell() {
  const { user } = useAuth();
  const live = useLiveStatus();
  if (!user) return null;
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between px-4 lg:px-5">
        <Link to="/" aria-label="Traackly home" className="flex items-center">
          <span className="lg:hidden">
            <LogoMark />
          </span>
          <span className="hidden lg:inline-flex">
            <Logo />
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <LiveDot />
          <UserMenu />
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <nav aria-label="Main" className="flex w-16 shrink-0 flex-col gap-1 px-2 pt-2 lg:w-60 lg:px-3">
          {NAV[user.role].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={item.label}
              className={({ isActive }) =>
                `flex h-10 items-center justify-center gap-3 rounded-md px-3 text-sm font-medium transition-colors lg:justify-start ${
                  isActive ? 'bg-brand-soft text-brand' : 'text-ink hover:bg-surface-hover/70'
                }`
              }
            >
              {item.icon}
              <span className="hidden lg:inline">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-tl-panel bg-surface shadow-panel">
          {live === 'reconnecting' && <ReconnectBanner />}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

/** Page header: title, optional subtitle, and one primary action slot (UI/UX brief section 5). */
export function PageHeader({
  title,
  subtitle,
  action,
  back,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  back?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 px-6 pb-4 pt-6 lg:px-8">
      <div className="min-w-0">
        {back}
        <h1 className="page-title">{title}</h1>
        {subtitle && <div className="mt-1 text-ink-muted">{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}
