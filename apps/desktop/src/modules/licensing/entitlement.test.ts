import { beforeEach, describe, expect, it, vi } from 'vitest';

const settings = vi.hoisted(() => new Map<string, string>());
// Tokens the fake Rust verifier accepts; anything else is "forged".
const signedTokens = vi.hoisted(
  () => new Map<string, { plan: 'free' | 'team_starter' | 'team_pro'; expiresAt: number }>()
);
const auth = vi.hoisted(() => ({ accessToken: 'access' as string | null }));

vi.mock('@/db', () => ({
  getSetting: async (key: string) => settings.get(key) ?? null,
  setSetting: async (key: string, value: string) => {
    settings.set(key, value);
  },
}));
vi.mock('@/tauri/commands', () => ({
  verifyEntitlement: async (token: string) => signedTokens.get(token) ?? null,
}));
vi.mock('@/modules/cloud/auth', () => ({ getValidAccessToken: async () => auth.accessToken }));
vi.mock('@/modules/cloud/config', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/cloud/config')>()),
  getApiUrl: () => 'https://api.test',
}));

import { useSettingsStore } from '@/modules/settings/store';
import { DEFAULT_APP_SETTINGS } from '@/shared/types/settings';
import { loadStoredEntitlement, refreshEntitlement, useEntitlementStore } from './entitlement';
import { hasPremiumAccess } from './premiumAccess';

const IN_A_WEEK = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;

function mockFetch(response: Response | Error) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      if (response instanceof Error) {
        throw response;
      }
      return response;
    })
  );
}

describe('entitlement', () => {
  beforeEach(() => {
    settings.clear();
    signedTokens.clear();
    auth.accessToken = 'access';
    useEntitlementStore.setState({ entitlement: null });
    useSettingsStore.getState().hydrate(DEFAULT_APP_SETTINGS);
    vi.unstubAllGlobals();
  });

  it('grants premium from a verified paid token', async () => {
    signedTokens.set('pro-token', { plan: 'team_pro', expiresAt: IN_A_WEEK });
    settings.set('entitlementToken', 'pro-token');

    await loadStoredEntitlement();

    expect(hasPremiumAccess()).toBe(true);
  });

  it('treats an edited or forged stored token as free', async () => {
    settings.set('entitlementToken', 'eyJhbGciOiJub25lIn0.eyJwbGFuIjoidGVhbV9wcm8ifQ.');

    await loadStoredEntitlement();

    expect(hasPremiumAccess()).toBe(false);
  });

  it('ignores a licenseSource edited in the settings table', () => {
    useSettingsStore.getState().hydrate({ ...DEFAULT_APP_SETTINGS, licenseSource: 'setapp' });
    expect(hasPremiumAccess()).toBe(false);
  });

  it('stores and applies a fresh token from the API', async () => {
    signedTokens.set('starter-token', { plan: 'team_starter', expiresAt: IN_A_WEEK });
    mockFetch(new Response(JSON.stringify({ token: 'starter-token', plan: 'team_starter' })));

    await refreshEntitlement();

    expect(settings.get('entitlementToken')).toBe('starter-token');
    expect(hasPremiumAccess()).toBe(true);
  });

  it('keeps the cached token when offline', async () => {
    signedTokens.set('pro-token', { plan: 'team_pro', expiresAt: IN_A_WEEK });
    settings.set('entitlementToken', 'pro-token');
    await loadStoredEntitlement();
    mockFetch(new TypeError('Network unreachable'));

    await refreshEntitlement();

    expect(settings.get('entitlementToken')).toBe('pro-token');
    expect(hasPremiumAccess()).toBe(true);
  });

  it('clears the plan when the API rejects the session', async () => {
    signedTokens.set('pro-token', { plan: 'team_pro', expiresAt: IN_A_WEEK });
    settings.set('entitlementToken', 'pro-token');
    await loadStoredEntitlement();
    mockFetch(new Response('{}', { status: 401 }));

    await refreshEntitlement();

    expect(settings.get('entitlementToken')).toBe('');
    expect(hasPremiumAccess()).toBe(false);
  });

  it('treats an expired paid token as free', async () => {
    signedTokens.set('old-token', { plan: 'team_pro', expiresAt: 1_000 });
    settings.set('entitlementToken', 'old-token');

    await loadStoredEntitlement();

    expect(hasPremiumAccess()).toBe(false);
  });
});
