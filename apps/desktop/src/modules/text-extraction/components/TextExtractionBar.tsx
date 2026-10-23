import { Button } from '@snapglow/ui';
import { useEditorStore } from '@/modules/editor/store';
import { useCopyExtractedText } from '../hooks/useCopyExtractedText';
import { useTextExtractionStore } from '../store';

export function TextExtractionBar({ embedded = false }: { embedded?: boolean }) {
  const screenshot = useEditorStore((s) => s.screenshot);
  const status = useTextExtractionStore((s) => s.status);
  const lines = useTextExtractionStore((s) => s.lines);
  const error = useTextExtractionStore((s) => s.error);
  const lastCopiedText = useTextExtractionStore((s) => s.lastCopiedText);
  const { copyAll } = useCopyExtractedText();

  if (!screenshot) {
    return null;
  }

  const actions =
    lines.length > 0 ? (
      <Button
        type="button"
        size="sm"
        onClick={() => void copyAll()}
        data-testid="text-extraction-copy-all-button"
      >
        Copy all
      </Button>
    ) : null;

  const content = (
    <div className="w-full space-y-2" data-testid="text-extraction-bar">
      {!embedded ? (
        <div>
          <p className="text-sm font-medium text-foreground">Text extraction</p>
          <p className="text-xs text-muted">On-device OCR · copy text from capture</p>
        </div>
      ) : null}

      {actions}

      {status === 'scanning' ? (
        <p className="text-xs text-muted" role="status">
          Reading text…
        </p>
      ) : null}

      {status === 'ready' && lines.length > 0 ? (
        <p className="text-xs text-muted" data-testid="text-extraction-count">
          {lines.length} line{lines.length === 1 ? '' : 's'} detected. Select text on the capture to
          copy part of it.
        </p>
      ) : null}

      {status === 'ready' && lines.length === 0 ? (
        <p className="text-xs text-muted">No text detected in this capture.</p>
      ) : null}

      {lastCopiedText ? (
        <p className="text-xs text-primary" data-testid="text-extraction-copy-status">
          Copied to clipboard
        </p>
      ) : null}

      {error ? (
        <p className="text-xs text-destructive" data-testid="text-extraction-error">
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
