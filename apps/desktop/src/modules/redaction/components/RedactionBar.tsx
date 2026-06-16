import { Button } from '@snapglow/ui';
import { useEditorStore } from '@/modules/editor/store';
import { useRedactionScan } from '../hooks/useRedactionScan';
import { useRedactionStore } from '../store';

export function RedactionBar() {
  const screenshot = useEditorStore((s) => s.screenshot);
  const status = useRedactionStore((s) => s.status);
  const detections = useRedactionStore((s) => s.detections);
  const error = useRedactionStore((s) => s.error);
  const { scan, maskAll } = useRedactionScan();

  if (!screenshot) {
    return null;
  }

  return (
    <div
      className="w-full space-y-3 rounded-xl border border-border bg-surface p-4"
      data-testid="redaction-bar"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">Sensitive data</p>
          <p className="text-xs text-muted">On-device OCR scan · 1-click masking</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => void scan()}
            disabled={status === 'scanning'}
            data-testid="redaction-scan-button"
          >
            {status === 'scanning' ? 'Scanning…' : 'Scan'}
          </Button>
          {detections.length > 0 ? (
            <Button
              type="button"
              size="sm"
              onClick={() => maskAll(false)}
              data-testid="redaction-mask-all-button"
            >
              Mask all ({detections.length})
            </Button>
          ) : null}
        </div>
      </div>

      {status === 'ready' && detections.length === 0 ? (
        <p className="text-xs text-muted">No sensitive data detected.</p>
      ) : null}

      {error ? (
        <p className="text-xs text-destructive" data-testid="redaction-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
