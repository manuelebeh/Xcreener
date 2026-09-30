import type { CollabDocumentState } from '@snapglow/collab-core';
import { isPaidPlan } from '@snapglow/team-core';
import { Button } from '@snapglow/ui';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { useCallback, useState } from 'react';
import { isCloudConfigured } from '@/modules/cloud/config';
import { useCloudAuthStore } from '@/modules/cloud/store';
import { useExportRender } from '@/modules/export/hooks/useExportRender';
import { useTeamStore } from '@/modules/team/store';
import { createCollabDocument } from '../api';
import { useCollabStore } from '../store';
import { buildDocumentStateFromEditor } from '../syncAnnotations';

export function CollabBar({ embedded = false }: { embedded?: boolean }) {
  const [loading, setLoading] = useState(false);
  const documentId = useCollabStore((s) => s.documentId);
  const document = useCollabStore((s) => s.document);
  const connected = useCollabStore((s) => s.connected);
  const reconnecting = useCollabStore((s) => s.reconnecting);
  const participants = useCollabStore((s) => s.participants);
  const statusMessage = useCollabStore((s) => s.statusMessage);
  const setDocumentId = useCollabStore((s) => s.setDocumentId);
  const startCheckout = useTeamStore((s) => s.startCheckout);
  const isAuthenticated = useCloudAuthStore((s) => s.isAuthenticated);
  const activeWorkspace = useTeamStore((s) =>
    s.workspaces.find((workspace) => workspace.id === s.activeWorkspaceId)
  );
  const { exportImage } = useExportRender();

  const startCollab = useCallback(async () => {
    if (!activeWorkspace || !isPaidPlan(activeWorkspace.plan)) {
      useCollabStore.getState().setStatusMessage('Collaboration requires a paid team workspace');
      return;
    }

    setLoading(true);
    try {
      const { blob } = await exportImage('png', 0.92);
      const response = await createCollabDocument({
        screenshotBlob: blob,
        documentState: buildDocumentStateFromEditor() as CollabDocumentState,
        title: 'Collaboration session',
      });
      setDocumentId(response.id);
      useCollabStore.getState().setStatusMessage('Collaboration started');
    } catch (error) {
      useCollabStore
        .getState()
        .setStatusMessage(error instanceof Error ? error.message : 'Failed to start collaboration');
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace, exportImage, setDocumentId]);

  const copyLink = useCallback(async () => {
    const url = document?.collabUrl;
    if (!url) {
      return;
    }
    await writeText(url);
    useCollabStore.getState().setStatusMessage('Collaboration link copied');
  }, [document?.collabUrl]);

  const stopCollab = useCallback(() => {
    setDocumentId(null);
    useCollabStore.getState().reset();
  }, [setDocumentId]);

  if (!isCloudConfigured() || !isAuthenticated) {
    return null;
  }

  return (
    <div
      className={
        embedded ? 'space-y-2' : 'rounded-lg border border-border bg-surface p-4 space-y-2'
      }
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">Collaboration</p>
        {connected ? (
          <span className="text-xs text-emerald-600">{participants.length} online</span>
        ) : null}
      </div>

      {!documentId ? (
        activeWorkspace && !isPaidPlan(activeWorkspace.plan) ? (
          <div className="space-y-2 rounded-md border border-border/80 bg-surface p-3">
            <p className="m-0 text-xs text-muted">
              Collaboration requires Team Starter or Team Pro. Upgrade your workspace in Settings →
              Team.
            </p>
            {activeWorkspace.role === 'admin' ? (
              <Button type="button" size="sm" onClick={() => void startCheckout('team_starter')}>
                Upgrade workspace
              </Button>
            ) : null}
          </div>
        ) : (
          <Button type="button" onClick={() => void startCollab()} disabled={loading}>
            {loading ? 'Starting…' : 'Start collaboration'}
          </Button>
        )
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => void copyLink()}>
            Copy web link
          </Button>
          <Button type="button" variant="ghost" onClick={stopCollab}>
            Stop
          </Button>
        </div>
      )}

      {documentId && reconnecting ? (
        <p className="text-xs text-amber-600" role="status">
          Reconnecting to session…
        </p>
      ) : null}

      {statusMessage ? <p className="text-xs text-muted">{statusMessage}</p> : null}
    </div>
  );
}
