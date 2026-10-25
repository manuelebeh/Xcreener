import type { SyncLibraryItem } from '@xcreener/sync-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { importSyncedLibraryItem } from './syncPull';

const getCapture = vi.fn();
const captureUidExists = vi.fn();
const insertCapture = vi.fn();

vi.mock('@/db', () => ({ setSetting: vi.fn() }));

vi.mock('@/db/captures', () => ({
  getCapture: (...args: unknown[]) => getCapture(...args),
  captureUidExists: (...args: unknown[]) => captureUidExists(...args),
  insertCapture: (...args: unknown[]) => insertCapture(...args),
  pruneCaptures: vi.fn(async () => []),
}));

vi.mock('./config', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./config')>()),
  getApiUrl: () => 'https://api.test',
}));

vi.mock('@/modules/history/utils/captureFiles', () => ({
  writeCaptureFiles: vi.fn(async () => ({
    capturePath: '/tmp/c.png',
    thumbnailPath: '/tmp/t.webp',
  })),
}));

function item(localId: string | null): SyncLibraryItem {
  return {
    id: `cloud-${localId}`,
    title: 'capture.png',
    mimeType: 'image/png',
    byteSize: 4,
    tags: [],
    localId,
    syncVersion: 1,
    deletedAt: null,
    assetUrl: 'https://assets.test/c.png',
    createdAt: '2026-10-24T00:00:00.000Z',
    updatedAt: '2026-10-24T00:00:00.000Z',
  };
}

const headers = { Authorization: 'Bearer token', 'X-Workspace-Id': 'ws-1' };

describe('importSyncedLibraryItem', () => {
  beforeEach(() => {
    getCapture.mockReset();
    captureUidExists.mockReset();
    insertCapture.mockReset();
    insertCapture.mockResolvedValue(1);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(new Uint8Array([137, 80, 78, 71]), { status: 200 }))
    );
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 10, height: 10, close: () => {} }))
    );
  });

  it("imports another device's capture even when its numeric id exists locally", async () => {
    getCapture.mockResolvedValue({ id: 5 });
    captureUidExists.mockResolvedValue(false);

    const imported = await importSyncedLibraryItem(item('uid-from-device-b'), new Set(), headers);

    expect(imported).toBe(true);
    expect(getCapture).not.toHaveBeenCalled();
    expect(insertCapture).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'uid-from-device-b' })
    );
  });

  it('downloads the asset through the API with the auth headers', async () => {
    captureUidExists.mockResolvedValue(false);

    await importSyncedLibraryItem(item('uid-api'), new Set(), headers);

    expect(fetch).toHaveBeenCalledWith('https://api.test/v1/library/cloud-uid-api/content', {
      headers,
    });
  });

  it('skips a capture whose uid is already stored locally', async () => {
    captureUidExists.mockResolvedValue(true);
    const pulledIds = new Set<string>();

    const imported = await importSyncedLibraryItem(item('uid-known'), pulledIds, headers);

    expect(imported).toBe(false);
    expect(insertCapture).not.toHaveBeenCalled();
    expect(pulledIds.has('cloud-uid-known')).toBe(true);
  });

  it('keeps matching legacy numeric local ids by local capture id', async () => {
    getCapture.mockResolvedValue({ id: 5 });

    const imported = await importSyncedLibraryItem(item('5'), new Set(), headers);

    expect(imported).toBe(false);
    expect(getCapture).toHaveBeenCalledWith(5);
    expect(captureUidExists).not.toHaveBeenCalled();
  });
});
