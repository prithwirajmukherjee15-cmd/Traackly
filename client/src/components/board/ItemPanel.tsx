import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

export interface PanelTab {
  key: string;
  label: string;
  count?: number;
  content: ReactNode;
}

/**
 * monday-style item panel: slides in over the board from the right, so the board stays in place
 * behind it. Escape, the close button and the backdrop all return to `closeTo`.
 */
export function ItemPanel({
  title,
  closeTo,
  meta,
  tabs,
  footer,
  onRequestClose,
  children,
}: {
  title: string;
  /** Intercepts every close (e.g. to confirm discarding unsaved input). */
  onRequestClose?: () => void;
  closeTo: string;
  meta?: ReactNode;
  tabs?: PanelTab[];
  footer?: ReactNode;
  children?: ReactNode;
}) {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState(tabs?.[0]?.key ?? '');
  const close = () => (onRequestClose ? onRequestClose() : navigate(closeTo));
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      // A dialog opened from inside the panel handles its own Escape.
      if (e.key === 'Escape' && !document.querySelector('[aria-modal="true"]:not([data-item-panel])')) {
        closeRef.current();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  const current = tabs?.find((t) => t.key === tab) ?? tabs?.[0];
  return (
    <>
      <div className="fixed inset-0 z-20 animate-fade-in bg-ink/25" onMouseDown={close} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-item-panel
        tabIndex={-1}
        className="fixed inset-y-0 right-0 z-30 flex w-full max-w-[880px] animate-drawer-in flex-col bg-surface shadow-[-12px_0_40px_rgb(var(--shadow)/0.18)] focus:outline-none"
      >
        <header className="shrink-0 px-6 pt-4 lg:px-8">
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="-ml-2 mb-2 rounded p-1.5 text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
          >
            <X size={22} aria-hidden />
          </button>
          <h1 className="font-display text-[24px] font-medium leading-tight tracking-[-0.01em] text-ink">
            {title}
          </h1>
          {meta && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-ink-muted">{meta}</div>
          )}
          {tabs && (
            <div role="tablist" aria-label="Item sections" className="mt-4 flex gap-1 border-b border-line">
              {tabs.map((t) => {
                const active = t.key === current?.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(t.key)}
                    className={`relative -mb-px flex h-10 items-center gap-1.5 rounded-t px-3 text-sm transition-colors ${
                      active ? 'text-ink' : 'text-ink-muted hover:bg-surface-hover hover:text-ink'
                    }`}
                  >
                    {t.label}
                    {t.count !== undefined && t.count > 0 && (
                      <span className="rounded-full bg-brand-soft px-1.5 text-[11px] font-semibold leading-[18px] text-brand">
                        {t.count}
                      </span>
                    )}
                    <span
                      className={`absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand transition-transform duration-200 ${active ? 'scale-x-100' : 'scale-x-0'}`}
                      aria-hidden
                    />
                  </button>
                );
              })}
            </div>
          )}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto bg-surface-sunken/60 px-6 py-5 lg:px-8">
          {tabs && (
            <div key={current?.key} className="animate-fade-in" role="tabpanel" aria-label={current?.label}>
              {current?.content}
            </div>
          )}
          {children}
        </div>
        {footer && (
          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-line bg-surface px-6 py-3 lg:px-8">
            {footer}
          </footer>
        )}
      </div>
    </>
  );
}
