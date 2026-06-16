import { useCallback, useEffect, useRef, useState } from 'react';
import type { FramePreset } from '../types';

const UNDO_MS = 8000;

interface PendingDelete {
  preset: FramePreset;
  timerId: ReturnType<typeof setTimeout>;
}

interface DeferredPresetDeleteOptions {
  onRemove: (id: string) => void;
  onRestore: (preset: FramePreset) => void;
  onFlush: (preset: FramePreset) => void | Promise<void>;
}

export function useDeferredPresetDelete({
  onRemove,
  onRestore,
  onFlush,
}: DeferredPresetDeleteOptions) {
  const [pending, setPending] = useState<PendingDelete | null>(null);
  const pendingRef = useRef<PendingDelete | null>(null);

  const flushPending = useCallback(
    (entry: PendingDelete) => {
      clearTimeout(entry.timerId);
      void onFlush(entry.preset);
    },
    [onFlush]
  );

  const requestDelete = useCallback(
    (preset: FramePreset) => {
      if (pendingRef.current) {
        flushPending(pendingRef.current);
      }

      onRemove(preset.id);

      const timerId = setTimeout(() => {
        void onFlush(preset);
        pendingRef.current = null;
        setPending(null);
      }, UNDO_MS);

      const entry: PendingDelete = { preset, timerId };
      pendingRef.current = entry;
      setPending(entry);
    },
    [flushPending, onFlush, onRemove]
  );

  const undoDelete = useCallback(() => {
    const entry = pendingRef.current;
    if (!entry) {
      return;
    }

    clearTimeout(entry.timerId);
    onRestore(entry.preset);
    pendingRef.current = null;
    setPending(null);
  }, [onRestore]);

  useEffect(() => {
    return () => {
      if (pendingRef.current) {
        flushPending(pendingRef.current);
      }
    };
  }, [flushPending]);

  return {
    requestDelete,
    undoDelete,
    pendingPreset: pending?.preset ?? null,
  };
}
