import { clsx } from 'clsx';
import type { StoredCapture } from '@/db/captures';
import { useLocalFileSrc } from '../hooks/useLocalFileSrc';
import { formatCaptureDimensions, formatRelativeTime } from '../utils/format';

interface HistoryCardProps {
  capture: StoredCapture;
  isSelected: boolean;
  isOpening: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onDelete: () => void;
}

export function HistoryCard({
  capture,
  isSelected,
  isOpening,
  onSelect,
  onOpen,
  onDelete,
}: HistoryCardProps) {
  const thumbnailSrc = useLocalFileSrc(capture.thumbnail, 'image/webp');

  return (
    <article
      className={clsx(
        'group relative overflow-hidden rounded-lg border bg-surface transition-colors',
        isSelected
          ? 'border-primary ring-1 ring-primary/40'
          : 'border-border hover:border-primary/40'
      )}
      data-testid={`history-card-${capture.id}`}
    >
      <button
        type="button"
        className="block w-full text-left"
        onClick={onSelect}
        onDoubleClick={onOpen}
        aria-label={`Preview capture ${capture.filename}`}
      >
        <div className="aspect-video w-full overflow-hidden bg-muted/30">
          {thumbnailSrc ? (
            <img src={thumbnailSrc} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted">
              No preview
            </div>
          )}
        </div>
        <div className="space-y-1 px-3 py-2">
          <p className="truncate text-xs font-medium text-foreground">{capture.filename}</p>
          <p className="text-xs text-muted">
            {formatRelativeTime(capture.createdAt)} · {capture.format.toUpperCase()} ·{' '}
            {formatCaptureDimensions(capture.width, capture.height)}
          </p>
        </div>
      </button>

      <div className="flex gap-2 border-t border-border px-3 py-2">
        <button
          type="button"
          className="sg-focus-ring flex-1 rounded-md border border-border px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-muted/40 disabled:opacity-50"
          data-testid="history-open-button"
          disabled={isOpening}
          onClick={onOpen}
        >
          {isOpening
            ? 'Opening…'
            : capture.format === 'gif' || capture.format === 'mp4'
              ? 'Open file'
              : 'Open in editor'}
        </button>
        <button
          type="button"
          className="sg-focus-ring rounded-md border border-border px-2 py-1 text-xs whitespace-nowrap text-destructive hover:bg-destructive/10"
          data-testid="history-delete-button"
          onClick={onDelete}
        >
          Delete
        </button>
      </div>
    </article>
  );
}
