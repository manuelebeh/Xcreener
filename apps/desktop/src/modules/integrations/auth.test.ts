import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const openUrl = vi.hoisted(() => vi.fn(async (_url: string) => {}));
const saveIntegrationToken = vi.hoisted(() => vi.fn(async () => {}));
const clearIntegrationToken = vi.hoisted(() => vi.fn(async () => {}));

vi.mock('@tauri-apps/plugin-opener', () => ({ openUrl }));
vi.mock('@/modules/cloud/auth', () => ({ getValidAccessToken: async () => 'cloud-token' }));
vi.mock('@/modules/cloud/config', () => ({ getApiUrl: () => 'https://api.test' }));
vi.mock('./config', () => ({
  isIntegrationsConfigured: () => true,
  getIntegrationsRedirectUri: () => 'snapglow://integrations/callback',
}));
vi.mock('./tokenStorage', () => ({ saveIntegrationToken, clearIntegrationToken }));

import { handleIntegrationCallback, refreshIntegrationToken, startIntegrationLogin } from './auth';

const SERVER_STATE = 'serverissuedstate0123456789';

function mockApi() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.endsWith('/authorize')) {
        return Response.json({
          authorizeUrl: `https://slack.com/oauth/v2/authorize?client_id=x&state=${SERVER_STATE}`,
          state: SERVER_STATE,
        });
      }
      return Response.json({
        accessToken: 'slack-token',
        refreshHandle: 'v1.sealed',
        workspaceName: 'Acme',
      });
    })
  );
}

describe('integration OAuth flow', () => {
  beforeEach(() => {
    openUrl.mockClear();
    saveIntegrationToken.mockClear();
    clearIntegrationToken.mockClear();
    mockApi();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('accepts a callback carrying the state the API issued', async () => {
    await startIntegrationLogin('slack');
    expect(openUrl).toHaveBeenCalledOnce();

    const stored = await handleIntegrationCallback(
      `snapglow://integrations/callback?code=abc&state=${SERVER_STATE}`
    );

    expect(stored?.accessToken).toBe('slack-token');
    expect(stored?.refreshHandle).toBe('v1.sealed');
    expect(saveIntegrationToken).toHaveBeenCalledOnce();
  });

  it('rejects a callback with a different state', async () => {
    await startIntegrationLogin('slack');

    await expect(
      handleIntegrationCallback('snapglow://integrations/callback?code=abc&state=attacker')
    ).rejects.toThrow('Invalid integration callback');
    expect(saveIntegrationToken).not.toHaveBeenCalled();
  });

  it('refreshes once for concurrent callers and keeps the rotated handle', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ accessToken: 'jira-2', refreshHandle: 'v1.rotated', expiresAt: null })
    );
    vi.stubGlobal('fetch', fetchMock);
    const token = { accessToken: 'jira-1', refreshHandle: 'v1.old', metadata: { cloudId: 'c' } };

    const [first, second] = await Promise.all([
      refreshIntegrationToken('jira', token),
      refreshIntegrationToken('jira', token),
    ]);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(first).toEqual({
      accessToken: 'jira-2',
      refreshHandle: 'v1.rotated',
      expiresAt: null,
      metadata: { cloudId: 'c' },
    });
    expect(second).toBe(first);
    expect(saveIntegrationToken).toHaveBeenCalledWith('jira', first);
  });

  it('forgets the token when the API asks to reconnect', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ error: 'Reconnect this integration' }, { status: 400 }))
    );

    const result = await refreshIntegrationToken('jira', {
      accessToken: 'jira-1',
      refreshHandle: 'v1.old',
    });

    expect(result).toBeNull();
    expect(clearIntegrationToken).toHaveBeenCalledWith('jira');
    expect(saveIntegrationToken).not.toHaveBeenCalled();
  });
});
