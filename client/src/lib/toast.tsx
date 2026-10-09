import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';

type Tone = 'success' | 'info' | 'danger';
interface Toast {
  id: number;
  message: string;
  tone: Tone;
}

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => undefined);

const ICONS = { success: CheckCircle2, info: Info, danger: XCircle };
const TONE_CLASS: Record<Tone, string> = {
  success: 'bg-ink text-ink-inverse [&_svg]:text-state-completed',
  info: 'bg-ink text-ink-inverse [&_svg]:text-state-raised',
  danger: 'bg-danger text-ink-inverse',
};

const TOAST_MS = 4500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const show = useCallback(
    (message: string, tone: Tone = 'success') => {
      const id = nextId.current++;
      setToasts((t) => [...t.slice(-2), { id, message, tone }]);
      window.setTimeout(() => dismiss(id), TOAST_MS);
    },
    [dismiss],
  );

  const value = useMemo(() => show, [show]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => {
          const Icon = ICONS[t.tone];
          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex max-w-lg items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium shadow-pop ${TONE_CLASS[t.tone]}`}
            >
              <Icon size={18} aria-hidden />
              <span>{t.message}</span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="ml-2 rounded p-0.5 opacity-70 hover:opacity-100"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
