import { useCallback, useEffect, useRef, useState } from 'react';
import type { StoredCapture } from '@/db/captures';
import { useHistoryStore } from '../store';
import { removeCapture } from '../utils/removeCapture';

const UNDO_MS = 8000;

/** Deletes for real, keeping the capture out of reloaded lists until the database agrees. */
function commitDelete(id: number): void {
  const { releaseHidden, setError } = useHistoryStore.getState();
  removeCapture(id)
    .catch((error: unknown) => setError(error instanceof Error ? error.message : String(error)))
    .finally(() => releaseHidden(id));
}

interface PendingDelete {
  capture: StoredCapture;
  timerId: ReturnType<typeof setTimeout>;
}

export function useDeferredDelete() {
  const [pending, setPending] = useState<PendingDelete | null>(null);
  const pendingRef = useRef<PendingDelete | null>(null);

  const removeCaptureFromList = useHistoryStore((s) => s.removeCaptureFromList);
  const restoreCapture = useHistoryStore((s) => s.restoreCapture);

  const flushPending = useCallback((entry: PendingDelete) => {
    clearTimeout(entry.timerId);
    commitDelete(entry.capture.id);
  }, []);

  const requestDelete = useCallback(
    (capture: StoredCapture) => {
      if (pendingRef.current) {
        flushPending(pendingRef.current);
      }

      removeCaptureFromList(capture.id);

      const timerId = setTimeout(() => {
        commitDelete(capture.id);
        pendingRef.current = null;
        setPending(null);
      }, UNDO_MS);

      const entry: PendingDelete = { capture, timerId };
      pendingRef.current = entry;
      setPending(entry);
    },
    [flushPending, removeCaptureFromList]
  );

  const undoDelete = useCallback(() => {
    const entry = pendingRef.current;
    if (!entry) {
      return;
    }

    clearTimeout(entry.timerId);
    restoreCapture(entry.capture);
    pendingRef.current = null;
    setPending(null);
  }, [restoreCapture]);

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
    pendingCapture: pending?.capture ?? null,
  };
}
