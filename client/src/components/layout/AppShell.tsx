import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { ChevronLeft, Inbox, LogOut, Settings, Table2, UserRound, Users } from 'lucide-react';
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
}

// Each role's screens, shown as boards in one workspace (monday's left pane).
const NAV: Record<Role, NavItem[]> = {
  coordinator: [{ to: '/requests', label: 'My requests', icon: <Table2 size={17} /> }],
  authorizer: [
    { to: '/authorize', label: 'Authorization queue', icon: <Table2 size={17} /> },
    { to: '/team', label: 'Manage team', icon: <Users size={17} /> },
  ],
  logistics: [{ to: '/logistics', label: 'Logistics queue', icon: <Table2 size={17} /> }],
  floor_supervisor: [{ to: '/kiosk', label: 'Kiosk', icon: <Inbox size={17} /> }],
};

function readCollapsed() {
  try {
    return localStorage.getItem('traackly.sidebar') === 'collapsed';
  } catch {
    return false;
  }
}

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

const navItem =
  (collapsed: boolean) =>
  ({ isActive }: { isActive: boolean }) =>
    `flex h-8 items-center gap-2.5 rounded px-2 text-[14px] transition-colors ${collapsed ? 'justify-center' : ''} ${
      isActive ? 'bg-brand-soft text-ink' : 'text-ink hover:bg-surface-hover'
    }`;

/** Office-role layout: monday-style top bar, workspace sidebar, white board surface. */
export function AppShell() {
  const { user } = useAuth();
  const live = useLiveStatus();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  if (!user) return null;
  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem('traackly.sidebar', c ? 'open' : 'collapsed');
      } catch {
        // Not remembered when storage is blocked.
      }
      return !c;
    });
  const home = NAV[user.role][0]!.to;
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between pl-4 pr-3 lg:pl-5">
        <Link to={home} aria-label="Traackly home" className="flex items-center gap-2">
          <span className="lg:hidden">
            <LogoMark />
          </span>
          <span className="hidden lg:inline-flex">
            <Logo />
          </span>
          <span className="hidden text-[15px] font-light text-ink-muted lg:inline">request board</span>
        </Link>
        <div className="flex items-center gap-1">
          <LiveDot />
          <span className="mx-2 hidden h-6 w-px bg-line-strong/70 sm:block" aria-hidden />
          <NavLink
            to="/profile"
            title="Profile"
            className="hidden h-8 w-8 items-center justify-center rounded text-ink-muted hover:bg-surface-hover hover:text-ink sm:flex"
          >
            <Settings size={18} aria-hidden />
            <span className="sr-only">Profile</span>
          </NavLink>
          <UserMenu />
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <nav
          aria-label="Main"
          className={`relative flex shrink-0 flex-col pb-4 pt-2 transition-[width] duration-300 ease-out-soft ${
            collapsed ? 'w-14' : 'w-14 lg:w-[248px]'
          }`}
        >
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="absolute -right-3 top-3 z-10 hidden h-6 w-6 items-center justify-center rounded-full border border-line bg-surface text-ink-muted shadow-sm hover:text-ink lg:flex"
          >
            <ChevronLeft
              size={14}
              className={`transition-transform ${collapsed ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </button>
          <div className={`px-2 ${collapsed ? '' : 'lg:px-3'}`}>
            <div
              className={`mb-1 flex h-9 items-center gap-2 rounded px-1 ${collapsed ? 'justify-center' : 'justify-center lg:justify-start'}`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-brand to-state-authorization text-[12px] font-semibold text-ink-inverse">
                T
              </span>
              <span
                className={
                  collapsed ? 'hidden' : 'hidden min-w-0 flex-1 truncate text-[14px] font-semibold lg:block'
                }
              >
                Main workspace
              </span>
            </div>
            <ul className="flex flex-col gap-0.5">
              {NAV[user.role].map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} title={item.label} className={navItem(collapsed)}>
                    <span className="shrink-0 text-ink-muted" aria-hidden>
                      {item.icon}
                    </span>
                    <span className={collapsed ? 'sr-only' : 'sr-only truncate lg:not-sr-only'}>
                      {item.label}
                    </span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
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
    <div className="flex flex-wrap items-start justify-between gap-4 px-6 pb-4 pt-5 lg:px-8">
      <div className="min-w-0">
        {back}
        <h1 className="page-title">{title}</h1>
        {subtitle && <div className="mt-1 text-[14px] text-ink-muted">{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}
