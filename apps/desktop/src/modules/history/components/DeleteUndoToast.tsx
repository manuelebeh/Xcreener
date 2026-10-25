import { Button } from '@xcreener/ui';
import type { StoredCapture } from '@/db/captures';

interface DeleteUndoToastProps {
  capture: StoredCapture | null;
  onUndo: () => void;
}

export function DeleteUndoToast({ capture, onUndo }: DeleteUndoToastProps) {
  if (!capture) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex max-w-sm items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 shadow-lg"
      role="status"
      data-testid="history-delete-undo-toast"
    >
      <p className="min-w-0 flex-1 truncate text-sm text-foreground">
        Deleted <span className="font-medium">{capture.filename}</span>
      </p>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="shrink-0 whitespace-nowrap"
        onClick={onUndo}
      >
        Undo
      </Button>
    </div>
  );
}
