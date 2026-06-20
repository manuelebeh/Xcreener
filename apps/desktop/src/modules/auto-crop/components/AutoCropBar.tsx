import { Button } from '@snapglow/ui';
import { useEditorStore } from '@/modules/editor/store';
import { useAutoCrop } from '../hooks/useAutoCrop';
import { useAutoCropStore } from '../store';

export function AutoCropBar({ embedded = false }: { embedded?: boolean }) {
  const screenshot = useEditorStore((s) => s.screenshot);
  const status = useAutoCropStore((s) => s.status);
  const error = useAutoCropStore((s) => s.error);
  const lastReductionPercent = useAutoCropStore((s) => s.lastReductionPercent);
  const { runAutoCrop } = useAutoCrop();

  if (!screenshot) {
    return null;
  }

  const content = (
    <div className="w-full space-y-2" data-testid="auto-crop-bar">
      {!embedded ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">Auto-crop</p>
            <p className="text-xs text-muted">Remove empty margins from the capture</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => void runAutoCrop()}
            disabled={status === 'running'}
            data-testid="auto-crop-button"
          >
            {status === 'running' ? 'Cropping…' : 'Auto-crop'}
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => void runAutoCrop()}
          disabled={status === 'running'}
          data-testid="auto-crop-button"
        >
          {status === 'running' ? 'Cropping…' : 'Auto-crop'}
        </Button>
      )}

      {lastReductionPercent !== null && status === 'ready' ? (
        <p className="text-xs text-muted" data-testid="auto-crop-result">
          Trimmed {lastReductionPercent}% of empty margins
        </p>
      ) : null}

      {error ? (
        <p className="text-xs text-destructive" data-testid="auto-crop-error">
          {error}
        </p>
      ) : null}
    </div>
  );

  if (embedded) {
    return content;
  }

  return <div className="rounded-lg border border-border bg-surface p-4">{content}</div>;
}
