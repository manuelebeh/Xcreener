import { readFile } from '@tauri-apps/plugin-fs';
import type { LibraryItemResponse } from '@xcreener/cloud-core';
import { useSettingsStore } from '@/modules/settings/store';
import { getValidAccessToken } from './auth';
import { getApiUrl } from './config';
import { useCloudAuthStore } from './store';

export interface SyncLibraryInput {
  /** The capture's `uid`, stable across devices (not the per-installation numeric id). */
  localId: string;
  filepath: string;
  filename: string;
  ocrText?: string | null;
  tags?: string[];
  mimeType?: string;
}

let syncQueue: Promise<void> = Promise.resolve();

function enqueueSync(task: () => Promise<void>): void {
  syncQueue = syncQueue.then(task).catch((error) => {
    console.error('[cloud] library sync failed', error);
  });
}

/**
 * Background backup of a new capture. Runs only when the user turned on library backup, and
 * always targets the personal library: sharing into a workspace is an explicit per-item action.
 */
export function syncCaptureToLibrary(input: SyncLibraryInput): void {
  if (!useCloudAuthStore.getState().isAuthenticated) {
    return;
  }
  if (!useSettingsStore.getState().cloudLibrarySync) {
    return;
  }

  enqueueSync(async () => {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      return;
    }

    const bytes = await readFile(input.filepath);
    const blob = new Blob([bytes], { type: input.mimeType ?? 'image/png' });
    const formData = new FormData();
    formData.append('file', blob, input.filename);
    formData.append('localId', input.localId);
    if (input.ocrText) {
      formData.append('ocrText', input.ocrText);
    }
    if (input.tags?.length) {
      formData.append('tags', JSON.stringify(input.tags));
    }
    formData.append('title', input.filename);

    const response = await fetch(`${getApiUrl()}/v1/library`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      const message = payload?.error ?? `Library sync failed (${response.status})`;
      useCloudAuthStore.getState().setLibrarySyncStatus({ error: message });
      throw new Error(message);
    }

    useCloudAuthStore.getState().setLibrarySyncStatus({
      at: new Date().toISOString(),
      error: null,
    });
  });
}

export async function searchCloudLibrary(query: string): Promise<LibraryItemResponse[]> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return [];
  }

  const params = new URLSearchParams();
  if (query.trim()) {
    params.set('q', query.trim());
  }

  const response = await fetch(`${getApiUrl()}/v1/library?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { items: LibraryItemResponse[] };
  return payload.items;
}

/** @internal Test helper to await queued sync. */
export function flushLibrarySyncQueue(): Promise<void> {
  return syncQueue;
}
