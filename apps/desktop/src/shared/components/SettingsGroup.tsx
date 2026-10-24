import type { ReactNode } from 'react';

interface SettingsGroupProps {
  title: string;
  description?: string;
  /** Small control aligned right of the title (e.g. Refresh). */
  action?: ReactNode;
  children: ReactNode;
}

export function SettingsGroup({ title, description, action, children }: SettingsGroupProps) {
  return (
    <section className="space-y-2">
      <div className="flex items-end justify-between gap-4 px-1">
        <div className="min-w-0">
          <h2 className="text-xs font-semibold text-muted">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
        {children}
      </div>
    </section>
  );
}

interface SettingsRowProps {
  label: string;
  hint?: string;
  /** Id of the control the label describes. */
  htmlFor?: string;
  children?: ReactNode;
  /** Extra content under the row (validation messages). */
  footer?: ReactNode;
}

export function SettingsRow({ label, hint, htmlFor, children, footer }: SettingsRowProps) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-6">
        <div className="min-w-0">
          <label htmlFor={htmlFor} className="block text-sm text-foreground">
            {label}
          </label>
          {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
        </div>
        {children ? <div className="flex shrink-0 items-center gap-2">{children}</div> : null}
      </div>
      {footer ? <div className="mt-2">{footer}</div> : null}
    </div>
  );
}

interface SettingsToggleProps {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  testId?: string;
}

export function SettingsToggle({
  id,
  label,
  hint,
  checked,
  onChange,
  disabled,
  testId,
}: SettingsToggleProps) {
  return (
    <div className="flex items-center justify-between gap-6 px-4 py-3">
      <div className="min-w-0">
        <p id={`${id}-label`} className="text-sm text-foreground">
          {label}
        </p>
        {hint ? (
          <p id={`${id}-hint`} className="mt-0.5 text-xs text-muted">
            {hint}
          </p>
        ) : null}
      </div>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        aria-labelledby={`${id}-label`}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="sg-focus-ring size-4 shrink-0 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50"
        data-testid={testId}
      />
    </div>
  );
}
