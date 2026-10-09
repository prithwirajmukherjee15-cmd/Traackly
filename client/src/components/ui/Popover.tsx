import { useEffect, useRef, useState, type ReactNode } from 'react';

/** A toolbar button with an anchored panel; outside click and Escape close it. */
export function Popover({
  label,
  icon,
  badge,
  active,
  children,
  align = 'left',
  width = 'w-72',
}: {
  label: string;
  icon: ReactNode;
  badge?: number;
  active?: boolean;
  children: ReactNode | ((close: () => void) => ReactNode);
  align?: 'left' | 'right';
  width?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);
  const close = () => setOpen(false);
  return (
    <div ref={ref} className="relative">
      <ToolbarButton
        icon={icon}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        active={active || open}
      >
        {label}
        {badge ? (
          <span className="ml-0.5 rounded bg-brand px-1.5 text-[11px] font-semibold leading-[18px] text-ink-inverse">
            {badge}
          </span>
        ) : null}
      </ToolbarButton>
      {open && (
        <div
          role="dialog"
          aria-label={label}
          className={`absolute top-10 z-30 ${align === 'right' ? 'right-0' : 'left-0'} ${width} animate-menu-in rounded-lg border border-line bg-surface p-2 shadow-pop`}
        >
          {typeof children === 'function' ? children(close) : children}
        </div>
      )}
    </div>
  );
}

/** monday-style ghost toolbar button: icon + label, light blue when active. */
export function ToolbarButton({
  icon,
  active,
  children,
  className = '',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: ReactNode; active?: boolean }) {
  return (
    <button
      type="button"
      className={`inline-flex h-8 items-center gap-1.5 rounded px-2 text-sm transition-colors ${
        active ? 'bg-brand-soft text-ink' : 'text-ink hover:bg-surface-hover'
      } ${className}`}
      {...rest}
    >
      <span className="text-ink-muted" aria-hidden>
        {icon}
      </span>
      {children}
    </button>
  );
}

/** A checkable row inside a popover. */
export function OptionRow({
  checked,
  onChange,
  children,
  type = 'checkbox',
  name,
}: {
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
  type?: 'checkbox' | 'radio';
  name?: string;
}) {
  return (
    <label className="flex h-8 cursor-pointer items-center gap-2.5 rounded px-2 text-sm hover:bg-surface-hover">
      <input
        type={type}
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-[rgb(var(--brand))]"
      />
      {children}
    </label>
  );
}
