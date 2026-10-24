import { useEffect, useRef, useState } from 'react';
import { isCloudConfigured } from '@/modules/cloud/config';
import { useCloudAuthStore } from '@/modules/cloud/store';
import { useCollabStore } from '../store';
import { CollabBar } from './CollabBar';
import { CommentsPanel } from './CommentsPanel';

/** Editor toolbar entry for collaboration: session controls and comments in a popover. */
export function CollabMenu() {
  const isAuthenticated = useCloudAuthStore((s) => s.isAuthenticated);
  const documentId = useCollabStore((s) => s.documentId);
  const participants = useCollabStore((s) => s.participants);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      // Pinning a comment means clicking the canvas: keep the panel open meanwhile.
      if (useCollabStore.getState().commentMode) {
        return;
      }
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (!isCloudConfigured() || !isAuthenticated) {
    return null;
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        className="sg-focus-ring flex h-7 items-center gap-1.5 rounded-[5px] px-2 text-xs font-medium text-foreground transition-colors hover:bg-foreground/[0.08]"
        onClick={() => setOpen((value) => !value)}
        data-testid="collab-menu-button"
      >
        {documentId ? (
          <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
        ) : null}
        Collaborate
        {documentId && participants.length > 0 ? (
          <span className="text-muted tabular-nums">{participants.length}</span>
        ) : null}
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Collaboration"
          className="absolute right-0 z-30 mt-2 max-h-[70vh] w-80 space-y-3 overflow-y-auto rounded-lg border border-border bg-surface p-3 shadow-lg"
        >
          <CollabBar embedded />
          <CommentsPanel />
        </div>
      ) : null}
    </div>
  );
}
