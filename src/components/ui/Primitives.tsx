import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', type = 'button', ...props }, ref) => {
    const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
      primary:
        'bg-accent-primary text-white hover:opacity-95 shadow-sm border border-transparent',
      secondary:
        'bg-accent-secondary/15 text-accent-secondary border border-accent-secondary/30 hover:bg-accent-secondary/25',
      outline:
        'bg-bg-surface text-text-primary border border-border-strong hover:bg-bg-elevated',
      ghost: 'bg-transparent text-text-secondary hover:bg-bg-elevated hover:text-text-primary',
      danger:
        'bg-status-error/15 text-status-error border border-status-error/30 hover:bg-status-error/25',
    };

    const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
      sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
      md: 'h-10 px-4 text-sm gap-2 rounded-lg',
      lg: 'h-11 px-5 text-sm gap-2 rounded-xl',
    };

    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'outline';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants: Record<NonNullable<BadgeProps['variant']>, string> = {
    default: 'bg-bg-elevated text-text-secondary border-border-subtle',
    primary: 'bg-accent-primary/15 text-accent-primary border-accent-primary/30',
    secondary: 'bg-accent-secondary/15 text-accent-secondary border-accent-secondary/30',
    success: 'bg-status-success/15 text-status-success border-status-success/30',
    warning: 'bg-status-warning/15 text-status-warning border-status-warning/30',
    error: 'bg-status-error/15 text-status-error border-status-error/30',
    outline: 'bg-transparent text-text-secondary border-border-strong',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'flex h-10 w-full min-w-0 rounded-lg border border-border-strong bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'flex h-10 w-full min-w-0 rounded-lg border border-border-strong bg-bg-secondary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = 'Select';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-[90px] w-full rounded-lg border border-border-strong bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('sp-card min-w-0 p-5', className)} {...props}>
      {children}
    </div>
  );
}

export function ProgressBar({
  value,
  label,
  className,
}: {
  value: number;
  label?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <div className="mb-1 flex items-center justify-between text-xs text-text-secondary">
          <span>{label}</span>
          <span className="font-mono font-medium text-text-primary">{clamped}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full overflow-hidden rounded-full bg-bg-secondary"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent-primary to-accent-secondary transition-all duration-300"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
