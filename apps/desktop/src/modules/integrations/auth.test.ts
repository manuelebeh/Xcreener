import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const openUrl = vi.hoisted(() => vi.fn(async (_url: string) => {}));
const saveIntegrationToken = vi.hoisted(() => vi.fn(async () => {}));

vi.mock('@tauri-apps/plugin-opener', () => ({ openUrl }));
vi.mock('@/modules/cloud/auth', () => ({ getValidAccessToken: async () => 'cloud-token' }));
vi.mock('@/modules/cloud/config', () => ({ getApiUrl: () => 'https://api.test' }));
vi.mock('./config', () => ({
  isIntegrationsConfigured: () => true,
  getIntegrationsRedirectUri: () => 'snapglow://integrations/callback',
}));
vi.mock('./tokenStorage', () => ({ saveIntegrationToken }));

import { handleIntegrationCallback, startIntegrationLogin } from './auth';

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
      return Response.json({ accessToken: 'slack-token', workspaceName: 'Acme' });
    })
  );
}

describe('integration OAuth flow', () => {
  beforeEach(() => {
    openUrl.mockClear();
    saveIntegrationToken.mockClear();
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
    expect(saveIntegrationToken).toHaveBeenCalledOnce();
  });

  it('rejects a callback with a different state', async () => {
    await startIntegrationLogin('slack');

    await expect(
      handleIntegrationCallback('snapglow://integrations/callback?code=abc&state=attacker')
    ).rejects.toThrow('Invalid integration callback');
    expect(saveIntegrationToken).not.toHaveBeenCalled();
  });
});
