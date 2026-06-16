import { clsx } from 'clsx';
import { forwardRef, type SelectHTMLAttributes } from 'react';
import { focusRingClasses } from '../lib/focusRing';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={clsx(
      'flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm',
      'text-foreground',
      focusRingClasses,
      'disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  />
));

Select.displayName = 'Select';
