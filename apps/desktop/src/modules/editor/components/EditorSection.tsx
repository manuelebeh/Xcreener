import type { ReactNode } from 'react';

interface EditorSectionProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  testId?: string;
  /** Primary sections (Export) stay open so their main action is never hidden. */
  collapsible?: boolean;
}

export function EditorSection({
  title,
  description,
  actions,
  children,
  testId,
  collapsible = true,
}: EditorSectionProps) {
  if (!collapsible) {
    return (
      <section className="px-4 py-3" data-testid={testId}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="truncate text-xs font-semibold text-foreground">{title}</h3>
          {actions ? <span className="flex shrink-0 items-center gap-2">{actions}</span> : null}
        </div>
        {description ? <p className="mb-2 text-xs text-muted">{description}</p> : null}
        {children}
      </section>
    );
  }

  return (
    <details className="group border-b border-border" open data-testid={testId}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 select-none [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-1.5">
          <svg
            aria-hidden="true"
            viewBox="0 0 12 12"
            className="size-3 shrink-0 text-muted transition-transform group-open:rotate-90"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4.5 2.5 8 6l-3.5 3.5" />
          </svg>
          <h3 className="truncate text-xs font-semibold text-foreground">{title}</h3>
        </span>
        {actions ? <span className="flex shrink-0 items-center gap-2">{actions}</span> : null}
      </summary>
      <div className="px-4 pt-0.5 pb-4">
        {description ? <p className="mb-2 text-xs text-muted">{description}</p> : null}
        {children}
      </div>
    </details>
  );
}

interface EditorToolsPanelProps {
  children: ReactNode;
}

export function EditorToolsPanel({ children }: EditorToolsPanelProps) {
  return <div className="flex flex-col">{children}</div>;
}
