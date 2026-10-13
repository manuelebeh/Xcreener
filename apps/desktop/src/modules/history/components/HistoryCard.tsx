import { clsx } from 'clsx';
import { useState } from 'react';
import type { StoredCapture } from '@/db/captures';
import type { StoredCollection } from '@/db/collections';
import { useLocalFileSrc } from '../hooks/useLocalFileSrc';
import { formatCaptureDimensions, formatRelativeTime } from '../utils/format';

interface HistoryCardProps {
  capture: StoredCapture;
  isSelected: boolean;
  isOpening: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onDelete: () => void;
  onAddTag: (tag: string) => void;
  collections: StoredCollection[];
  onAddToCollection: (collectionId: number) => void;
}

export function HistoryCard({
  capture,
  isSelected,
  isOpening,
  onSelect,
  onOpen,
  onDelete,
  onAddTag,
  collections,
  onAddToCollection,
}: HistoryCardProps) {
  const thumbnailSrc = useLocalFileSrc(capture.thumbnail, 'image/webp');
  const [tagDraft, setTagDraft] = useState('');

  return (
    <article
      className={clsx(
        'group relative flex flex-col overflow-hidden rounded-lg border bg-surface transition-colors',
        isSelected
          ? 'border-primary ring-1 ring-primary/40'
          : 'border-border hover:border-foreground/25'
      )}
      data-testid={`history-card-${capture.id}`}
    >
      <button
        type="button"
        className="block w-full flex-1 text-left"
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
          {capture.ocrSnippet ? (
            <p className="line-clamp-2 text-xs text-muted" data-testid="history-ocr-snippet">
              {capture.ocrSnippet}
            </p>
          ) : null}
          {capture.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1 pt-1">
              {capture.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-foreground"
                >
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </button>

      <div className="flex items-center gap-2 border-t border-border px-3 py-2">
        <button
          type="button"
          className="sg-focus-ring h-7 flex-1 rounded-md bg-foreground/[0.06] px-2 text-xs font-medium whitespace-nowrap hover:bg-foreground/[0.1] disabled:opacity-50"
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
          className="sg-focus-ring h-7 rounded-md px-2 text-xs whitespace-nowrap text-destructive hover:bg-destructive/10"
          data-testid="history-delete-button"
          onClick={onDelete}
        >
          Delete
        </button>
      </div>

      <details className="group border-t border-border">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 text-xs text-muted select-none hover:text-foreground [&::-webkit-details-marker]:hidden">
          <svg
            aria-hidden="true"
            viewBox="0 0 12 12"
            className="size-3 transition-transform group-open:rotate-90"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4.5 2.5 8 6l-3.5 3.5" />
          </svg>
          Tags and collections
        </summary>
        <div className="space-y-2 px-3 pb-3">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!tagDraft.trim()) {
                return;
              }
              onAddTag(tagDraft.trim());
              setTagDraft('');
            }}
          >
            <input
              value={tagDraft}
              onChange={(event) => setTagDraft(event.target.value)}
              placeholder="Add tag"
              aria-label="Add tag"
              className="sg-focus-ring h-7 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-xs"
            />
            <button
              type="submit"
              className="sg-focus-ring h-7 rounded-md border border-border px-2.5 text-xs whitespace-nowrap hover:bg-foreground/[0.05]"
            >
              Tag
            </button>
          </form>

          {collections.length > 0 ? (
            <select
              aria-label="Add to collection"
              className="sg-focus-ring h-7 w-full rounded-md border border-border bg-background px-2 text-xs"
              defaultValue=""
              onChange={(event) => {
                const value = Number.parseInt(event.target.value, 10);
                if (Number.isFinite(value)) {
                  onAddToCollection(value);
                  event.target.value = '';
                }
              }}
            >
              <option value="">Add to collection…</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </details>
    </article>
  );
}
