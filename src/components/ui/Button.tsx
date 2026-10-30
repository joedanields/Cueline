import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  busy?: boolean;
  /** Text shown while busy — never icon-only. */
  busyLabel?: string;
  children: ReactNode;
};

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg border-accent',
  secondary: 'bg-bg text-fg border-line',
  danger: 'bg-bg text-danger border-danger',
  ghost: 'bg-transparent text-fg border-transparent underline',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', busy = false, busyLabel, className = '', children, type = 'button', disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-busy={busy || undefined}
      disabled={disabled || busy}
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded border-2 px-4 py-2 font-medium disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {busy && busyLabel ? busyLabel : children}
    </button>
  );
});
