import { useEffect } from 'react';
import type { StoredCapture } from '@/db/captures';
import { useLocalFileSrc } from '../hooks/useLocalFileSrc';
import { formatCaptureDimensions, formatRelativeTime } from '../utils/format';

interface HistoryPreviewProps {
  capture: StoredCapture | null;
  onClose: () => void;
  onOpen: () => void;
  isOpening: boolean;
}

export function HistoryPreview({ capture, onClose, onOpen, isOpening }: HistoryPreviewProps) {
  const previewSrc = useLocalFileSrc(capture?.filepath ?? null, 'image/png');

  useEffect(() => {
    if (!capture) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [capture, onClose]);

  if (!capture) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Capture preview"
      data-testid="history-preview"
    >
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg border border-border bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">{capture.filename}</p>
            <p className="text-xs text-muted">
              {formatRelativeTime(capture.createdAt)} ·{' '}
              {formatCaptureDimensions(capture.width, capture.height)}
            </p>
          </div>
          <button
            type="button"
            className="sg-focus-ring rounded-md border border-border px-2 py-1 text-xs whitespace-nowrap hover:bg-muted/40"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="max-h-[70vh] overflow-auto bg-muted/20 p-4">
          {previewSrc ? (
            <img
              src={previewSrc}
              alt={capture.filename}
              className="mx-auto max-h-[65vh] w-auto rounded-md"
            />
          ) : (
            <p className="text-center text-sm text-muted">Loading preview…</p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <button
            type="button"
            className="sg-focus-ring rounded-md border border-border px-3 py-1.5 text-sm whitespace-nowrap hover:bg-muted/40"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="sg-focus-ring rounded-md bg-primary px-3 py-1.5 text-sm font-medium whitespace-nowrap text-primary-foreground disabled:opacity-50"
            data-testid="history-preview-open-button"
            disabled={isOpening}
            onClick={onOpen}
          >
            {isOpening ? 'Opening…' : 'Open in editor'}
          </button>
        </div>
      </div>
    </div>
  );
}
