import { Button } from '@snapglow/ui';
import { useEditorStore } from '@/modules/editor/store';
import { useApplySuggestedStyle } from '../hooks/useStyleSuggestion';
import { useStyleSuggestionStore } from '../store';

export function StyleSuggestionBar({ embedded = false }: { embedded?: boolean }) {
  const screenshot = useEditorStore((s) => s.screenshot);
  const status = useStyleSuggestionStore((s) => s.status);
  const suggestion = useStyleSuggestionStore((s) => s.suggestion);
  const confidence = useStyleSuggestionStore((s) => s.confidence);
  const error = useStyleSuggestionStore((s) => s.error);
  const dismiss = useStyleSuggestionStore((s) => s.dismiss);
  const applySuggested = useApplySuggestedStyle();

  if (!screenshot || status === 'idle' || status === 'dismissed') {
    return null;
  }

  const content = (
    <div
      className="flex w-full flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/20 px-3 py-2"
      data-testid="style-suggestion-bar"
    >
      <div className="min-w-0 flex-1">
        {status === 'classifying' ? (
          <p className="text-xs text-muted">Analyzing content…</p>
        ) : null}
        {status === 'ready' && suggestion ? (
          <p className="text-xs text-foreground">
            <span className="font-medium text-primary">Suggested</span>
            <span className="text-muted"> · </span>
            {suggestion.label}
            <span className="text-muted"> ({Math.round(confidence * 100)}%)</span>
          </p>
        ) : null}
        {status === 'error' ? (
          <p className="text-xs text-muted">{error ?? 'Style suggestion unavailable'}</p>
        ) : null}
      </div>

      {status === 'ready' && suggestion ? (
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => void applySuggested()}
            data-testid="style-suggestion-apply"
          >
            Apply
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={dismiss}
            aria-label="Dismiss style suggestion"
            data-testid="style-suggestion-dismiss"
          >
            ×
          </Button>
        </div>
      ) : null}
    </div>
  );

  if (embedded) {
    return content;
  }

  return <div className="rounded-lg border border-border bg-surface px-3 py-2">{content}</div>;
}
