import { beforeEach, describe, expect, it, vi } from 'vitest';

const secrets = vi.hoisted(() => new Map<string, string>());

vi.mock('@/shared/lib/secureStorage', () => ({
  readSecret: async (name: string) => secrets.get(name) ?? null,
  writeSecret: async (name: string, _legacyKey: string, value: string) => {
    secrets.set(name, value);
  },
}));

import { loadIntegrationTokens } from './tokenStorage';

describe('integration token storage', () => {
  beforeEach(() => {
    secrets.clear();
  });

  it('drops raw refresh tokens kept by older versions and keeps the sealed handle', async () => {
    secrets.set(
      'integrations.tokens',
      JSON.stringify({
        slack: { accessToken: 'a', refreshToken: 'r', refreshHandle: 'v1.h', accountLabel: 'Acme' },
        notion: { accessToken: 'b', refreshToken: null },
      })
    );

    const tokens = await loadIntegrationTokens();

    expect(tokens).toEqual({
      slack: { accessToken: 'a', refreshHandle: 'v1.h', accountLabel: 'Acme' },
      notion: { accessToken: 'b' },
    });
    expect(secrets.get('integrations.tokens')).not.toContain('refreshToken');
  });
});
