import { Button } from '@snapglow/ui';
import { useEditorStore } from '@/modules/editor/store';
import { useCopyExtractedText } from '../hooks/useCopyExtractedText';
import { useTextExtraction } from '../hooks/useTextExtraction';
import { useTextExtractionStore } from '../store';

export function TextExtractionBar({ embedded = false }: { embedded?: boolean }) {
  const screenshot = useEditorStore((s) => s.screenshot);
  const status = useTextExtractionStore((s) => s.status);
  const lines = useTextExtractionStore((s) => s.lines);
  const selectedLineIds = useTextExtractionStore((s) => s.selectedLineIds);
  const error = useTextExtractionStore((s) => s.error);
  const lastCopiedText = useTextExtractionStore((s) => s.lastCopiedText);
  const { scan } = useTextExtraction();
  const { copyAll, copySelected } = useCopyExtractedText();

  if (!screenshot) {
    return null;
  }

  const content = (
    <div className="w-full space-y-2" data-testid="text-extraction-bar">
      {!embedded ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">Text extraction</p>
            <p className="text-xs text-muted">On-device OCR · copy text from capture</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => void scan()}
              disabled={status === 'scanning'}
              data-testid="text-extraction-scan-button"
            >
              {status === 'scanning' ? 'Scanning…' : 'Scan text'}
            </Button>
            {lines.length > 0 ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void copyAll()}
                  data-testid="text-extraction-copy-all-button"
                >
                  Copy all
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void copySelected()}
                  data-testid="text-extraction-copy-selected-button"
                >
                  Copy selected
                </Button>
              </>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => void scan()}
            disabled={status === 'scanning'}
            data-testid="text-extraction-scan-button"
          >
            {status === 'scanning' ? 'Scanning…' : 'Scan text'}
          </Button>
          {lines.length > 0 ? (
            <>
              <Button
                type="button"
                size="sm"
                onClick={() => void copyAll()}
                data-testid="text-extraction-copy-all-button"
              >
                Copy all
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => void copySelected()}
                data-testid="text-extraction-copy-selected-button"
              >
                Copy selected
              </Button>
            </>
          ) : null}
        </div>
      )}

      {status === 'ready' && lines.length > 0 ? (
        <p className="text-xs text-muted" data-testid="text-extraction-count">
          {lines.length} line{lines.length === 1 ? '' : 's'} detected
          {selectedLineIds.length > 0 ? ` · ${selectedLineIds.length} selected` : ''}
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
