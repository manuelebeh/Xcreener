import { clsx } from 'clsx';
import { forwardRef, type SelectHTMLAttributes } from 'react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={clsx(
      'flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm',
      'text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  />
));

Select.displayName = 'Select';
