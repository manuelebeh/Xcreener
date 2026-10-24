import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsStore } from '@/modules/settings/store';
import { useTeamStore } from '@/modules/team/store';
import { useCloudAuthStore } from './store';
import { flushLibrarySyncQueue, syncCaptureToLibrary } from './syncLibrary';

vi.mock('@tauri-apps/plugin-fs', () => ({
  readFile: vi.fn(async () => new Uint8Array([137, 80, 78, 71])),
}));

vi.mock('./auth', () => ({
  getValidAccessToken: vi.fn(async () => 'access-token'),
}));

vi.mock('./config', () => ({
  getApiUrl: () => 'https://api.test',
  isCloudConfigured: () => true,
}));

const fetchMock = vi.fn();

const input = {
  localId: 'uid-1',
  filepath: '/tmp/capture.png',
  filename: 'capture.png',
  mimeType: 'image/png',
  ocrText: 'bank login password',
};

describe('syncCaptureToLibrary', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    useCloudAuthStore.setState({ isAuthenticated: true });
    useTeamStore.setState({ activeWorkspaceId: 'team-1' });
  });

  it('uploads nothing when library backup is off, even when signed in', async () => {
    useSettingsStore.setState({ cloudLibrarySync: false });

    syncCaptureToLibrary(input);
    await flushLibrarySyncQueue();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uploads to the personal library without the workspace header when backup is on', async () => {
    useSettingsStore.setState({ cloudLibrarySync: true });

    syncCaptureToLibrary(input);
    await flushLibrarySyncQueue();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.test/v1/library');
    expect(init.headers).toEqual({ Authorization: 'Bearer access-token' });
    expect((init.body as FormData).get('localId')).toBe('uid-1');
  });
});
