import { useCallback, useMemo } from 'react';
import { useDeferredDelete } from '../hooks/useDeferredDelete';
import { useHistoryLoader } from '../hooks/useHistoryLoader';
import { useOpenCapture } from '../hooks/useOpenCapture';
import { useHistoryStore } from '../store';
import { DeleteUndoToast } from './DeleteUndoToast';
import { HistoryGrid } from './HistoryGrid';
import { HistoryPreview } from './HistoryPreview';

export function HistoryView() {
  useHistoryLoader();

  const captures = useHistoryStore((s) => s.captures);
  const loading = useHistoryStore((s) => s.loading);
  const error = useHistoryStore((s) => s.error);
  const selectedId = useHistoryStore((s) => s.selectedId);
  const setSelectedId = useHistoryStore((s) => s.setSelectedId);

  const { openCapture, openingId, error: openError } = useOpenCapture();
  const { requestDelete, undoDelete, pendingCapture } = useDeferredDelete();

  const selectedCapture = useMemo(
    () => captures.find((capture) => capture.id === selectedId) ?? null,
    [captures, selectedId]
  );

  const handleOpen = useCallback(
    (id: number) => {
      void openCapture(id);
    },
    [openCapture]
  );

  const handleDelete = useCallback(
    (id: number) => {
      const capture = captures.find((item) => item.id === id);
      if (!capture) {
        return;
      }

      requestDelete(capture);
    },
    [captures, requestDelete]
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <header className="space-y-1">
        <h1 className="font-display text-lg font-semibold text-foreground">History</h1>
        <p className="text-sm text-muted">Last 30 captures stored locally on this device.</p>
      </header>

      {loading ? <p className="text-sm text-muted">Loading history…</p> : null}
      {error ? (
        <p className="text-sm text-destructive" data-testid="history-error">
          {error}
        </p>
      ) : null}
      {openError ? (
        <p className="text-sm text-destructive" data-testid="history-open-error">
          {openError}
        </p>
      ) : null}

      {!loading && captures.length === 0 ? (
        <div
          className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-12 text-center"
          data-testid="history-empty"
        >
          <p className="text-sm font-medium text-foreground">No captures yet</p>
          <p className="mt-1 text-sm text-muted">
            Use Cmd+Shift+S (or Ctrl+Shift+S) to capture your first screenshot.
          </p>
        </div>
      ) : null}

      {captures.length > 0 ? (
        <HistoryGrid
          captures={captures}
          selectedId={selectedId}
          openingId={openingId}
          onSelect={setSelectedId}
          onOpen={handleOpen}
          onDelete={handleDelete}
        />
      ) : null}

      <HistoryPreview
        capture={selectedCapture}
        onClose={() => setSelectedId(null)}
        onOpen={() => {
          if (selectedCapture) {
            handleOpen(selectedCapture.id);
          }
        }}
        isOpening={selectedCapture ? openingId === selectedCapture.id : false}
      />

      <DeleteUndoToast capture={pendingCapture} onUndo={undoDelete} />
    </div>
  );
}
