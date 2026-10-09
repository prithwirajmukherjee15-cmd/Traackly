import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}

/** Accessible dialog: Escape and backdrop close it, focus moves in and returns on close. */
export function Modal({ open, title, onClose, children, footer, width = 'max-w-md' }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const first = panelRef.current?.querySelector<HTMLElement>(
      'input, select, textarea, button:not([data-close])',
    );
    (first ?? panelRef.current)?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4" onMouseDown={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
        className={`w-full ${width} rounded-panel bg-surface shadow-pop`}
      >
        <div className="flex items-center justify-between px-6 pb-2 pt-5">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <button
            type="button"
            data-close
            onClick={onClose}
            className="rounded p-1 text-ink-muted hover:bg-surface-hover"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-3">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-6 pb-5 pt-2">{footer}</div>}
      </div>
    </div>
  );
}
