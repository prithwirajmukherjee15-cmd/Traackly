import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'tertiary' | 'destructive' | 'warning';
type Size = 'sm' | 'md' | 'lg' | 'kiosk';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-brand text-ink-inverse hover:bg-brand-hover',
  secondary: 'border border-line-strong bg-surface text-ink hover:bg-surface-hover',
  tertiary: 'text-ink hover:bg-surface-hover',
  destructive: 'bg-danger text-ink-inverse hover:brightness-95',
  warning: 'bg-state-updated text-warn-ink hover:brightness-95',
};

const SIZE: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  // Kiosk: 60px minimum touch target (UI/UX brief section 7).
  kiosk: 'min-h-[64px] px-8 text-xl gap-3 rounded-xl',
};

const base = 'inline-flex shrink-0 items-center justify-center rounded font-medium transition-colors';

/** A router link styled as a button (never nest a <button> inside an <a>). */
export function LinkButton({
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  children,
  ...rest
}: LinkProps & { variant?: Variant; size?: Size; icon?: ReactNode }) {
  return (
    <Link className={`${base} ${VARIANT[variant]} ${SIZE[size]} ${className}`} {...rest}>
      {icon}
      {children}
    </Link>
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading,
    icon,
    className = '',
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${base} disabled:cursor-not-allowed disabled:opacity-45 ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 className="animate-spin" size={size === 'kiosk' ? 24 : 16} aria-hidden /> : icon}
      {children}
    </button>
  );
});
