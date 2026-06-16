import type { ReactNode } from 'react';

interface EditorSectionProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  testId?: string;
}

export function EditorSection({
  title,
  description,
  actions,
  children,
  testId,
}: EditorSectionProps) {
  return (
    <section className="px-3 py-3" data-testid={testId}>
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-xs font-medium text-muted">{title}</h3>
          {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

interface EditorToolsPanelProps {
  children: ReactNode;
}

export function EditorToolsPanel({ children }: EditorToolsPanelProps) {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
      {children}
    </div>
  );
}
