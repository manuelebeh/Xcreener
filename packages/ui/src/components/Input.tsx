import { clsx } from 'clsx';
import { forwardRef, type InputHTMLAttributes } from 'react';
import { focusRingClasses } from '../lib/focusRing';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={clsx(
      'flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm',
      'text-foreground placeholder:text-muted',
      focusRingClasses,
      'aria-invalid:border-destructive aria-invalid:outline-destructive',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  />
));

Input.displayName = 'Input';
