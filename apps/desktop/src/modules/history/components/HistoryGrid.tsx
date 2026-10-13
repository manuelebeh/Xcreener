import type { StoredCapture } from '@/db/captures';
import type { StoredCollection } from '@/db/collections';
import { HistoryCard } from './HistoryCard';

interface HistoryGridProps {
  captures: StoredCapture[];
  selectedId: number | null;
  openingId: number | null;
  onSelect: (id: number) => void;
  onOpen: (id: number) => void;
  onDelete: (id: number) => void;
  onAddTag: (capture: StoredCapture, tag: string) => void;
  collections: StoredCollection[];
  onAddToCollection: (captureId: number, collectionId: number) => void;
}

export function HistoryGrid({
  captures,
  selectedId,
  openingId,
  onSelect,
  onOpen,
  onDelete,
  onAddTag,
  collections,
  onAddToCollection,
}: HistoryGridProps) {
  return (
    <div
      className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4"
      data-testid="history-grid"
    >
      {captures.map((capture) => (
        <HistoryCard
          key={capture.id}
          capture={capture}
          isSelected={selectedId === capture.id}
          isOpening={openingId === capture.id}
          onSelect={() => onSelect(capture.id)}
          onOpen={() => onOpen(capture.id)}
          onDelete={() => onDelete(capture.id)}
          onAddTag={(tag) => onAddTag(capture, tag)}
          collections={collections}
          onAddToCollection={(collectionId) => onAddToCollection(capture.id, collectionId)}
        />
      ))}
    </div>
  );
}
