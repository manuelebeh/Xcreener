import { clsx } from 'clsx';
import { forwardRef, type LabelHTMLAttributes } from 'react';

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, required, ...props }, ref) => (
    // biome-ignore lint/a11y/noLabelWithoutControl: consumers pass htmlFor to associate with controls
    <label
      ref={ref}
      className={clsx('block text-sm font-medium text-foreground', className)}
      {...props}
    >
      {children}
      {required ? (
        <span className="text-destructive" aria-hidden="true">
          {' '}
          *
        </span>
      ) : null}
    </label>
  )
);

Label.displayName = 'Label';
