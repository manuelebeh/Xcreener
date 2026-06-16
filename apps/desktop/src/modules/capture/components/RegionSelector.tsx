import { useCallback, useRef, useState } from 'react';
import type { Rect } from '@/shared/types/ipc';

interface RegionSelectorProps {
  disabled?: boolean;
  selection: Rect | null;
  onSelectionChange: (selection: Rect | null) => void;
}

function normalizeRect(startX: number, startY: number, endX: number, endY: number): Rect {
  const x = Math.min(startX, endX);
  const y = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);

  return { x, y, width, height };
}

function RegionSelectionOverlay({ rect }: { rect: Rect }) {
  return (
    <>
      <div
        className="pointer-events-none absolute border-2 border-primary bg-primary/10"
        style={{
          left: rect.x,
          top: rect.y,
          width: rect.width,
          height: rect.height,
        }}
      />
      <div
        data-testid="region-selection-size"
        className="pointer-events-none absolute rounded bg-black/70 px-2 py-1 text-xs text-white"
        style={{
          left: rect.x,
          top: Math.max(0, rect.y - 28),
        }}
      >
        {Math.round(rect.width)} × {Math.round(rect.height)}
      </div>
    </>
  );
}

export function RegionSelector({
  disabled = false,
  selection,
  onSelectionChange,
}: RegionSelectorProps) {
  const [draft, setDraft] = useState<Rect | null>(null);
  const originRef = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) {
        return;
      }

      onSelectionChange(null);
      originRef.current = { x: event.clientX, y: event.clientY };
      setDraft({ x: event.clientX, y: event.clientY, width: 0, height: 0 });
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [disabled, onSelectionChange]
  );

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const origin = originRef.current;
    if (!origin) {
      return;
    }

    setDraft(normalizeRect(origin.x, origin.y, event.clientX, event.clientY));
  }, []);

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const origin = originRef.current;
      if (!origin) {
        return;
      }

      const nextSelection = normalizeRect(origin.x, origin.y, event.clientX, event.clientY);
      originRef.current = null;
      setDraft(null);

      if (nextSelection.width >= 4 && nextSelection.height >= 4) {
        onSelectionChange(nextSelection);
      }
    },
    [onSelectionChange]
  );

  const visibleRect = draft ?? selection;

  return (
    <div
      data-testid="region-selector"
      className={`absolute inset-0 ${disabled ? 'pointer-events-none' : 'cursor-crosshair'}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {visibleRect && visibleRect.width > 0 && visibleRect.height > 0 ? (
        <RegionSelectionOverlay rect={visibleRect} />
      ) : null}
    </div>
  );
}
