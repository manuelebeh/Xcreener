import type { StoredCapture } from '@/db/captures';
import { HistoryCard } from './HistoryCard';

interface HistoryGridProps {
  captures: StoredCapture[];
  selectedId: number | null;
  openingId: number | null;
  onSelect: (id: number) => void;
  onOpen: (id: number) => void;
  onDelete: (id: number) => void;
}

export function HistoryGrid({
  captures,
  selectedId,
  openingId,
  onSelect,
  onOpen,
  onDelete,
}: HistoryGridProps) {
  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))] lg:grid-cols-[repeat(3,minmax(0,1fr))]"
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
        />
      ))}
    </div>
  );
}
