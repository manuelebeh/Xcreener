import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.GITHUB_CLIENT_ID = 'gh-client';
  process.env.GITHUB_CLIENT_SECRET = 'gh-secret';
});

const pendingStates = new Map<string, string>();

vi.mock('../services/redis', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/redis')>();
  return {
    ...actual,
    savePendingIntegrationOAuth: async (state: string, pending: unknown) => {
      pendingStates.set(state, JSON.stringify(pending));
    },
    takePendingIntegrationOAuth: async (state: string) => {
      const raw = pendingStates.get(state);
      pendingStates.delete(state);
      return raw ? JSON.parse(raw) : null;
    },
  };
});

// "Bearer <auth0Sub>" stands in for a verified Auth0 token; the internal user id is the sub.
vi.mock('../plugins/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../plugins/auth')>();
  return {
    ...actual,
    authenticateRequest: async (
      request: { headers: { authorization?: string }; authUser?: unknown },
      reply: { code: (status: number) => { send: (payload: unknown) => Promise<void> } }
    ) => {
      const header = request.headers.authorization;
      if (!header?.startsWith('Bearer ')) {
        await reply.code(401).send({ error: 'Unauthorized' });
        return;
      }
      const auth0Sub = header.slice('Bearer '.length);
      request.authUser = { id: '', auth0Sub, email: null, auth0OrgId: null };
    },
    upsertAuthUser: async (_db: unknown, auth0Sub: string) => ({ id: auth0Sub }),
  };
});

import { buildApp } from '../app';

describe('integration OAuth state binding', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  const fetchMock = vi.fn();
  const realFetch = globalThis.fetch;

  beforeAll(async () => {
    const storage = { ensureBucket: async () => {} };
    app = await buildApp({ db: {} as never, storage: storage as never });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ access_token: 'gh-token', scope: 'repo' }), { status: 200 })
    );
    globalThis.fetch = fetchMock as typeof fetch;
    return () => {
      globalThis.fetch = realFetch;
    };
  });

  async function authorize(user: string) {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/integrations/github/authorize',
      headers: { authorization: `Bearer ${user}` },
    });
    expect(response.statusCode).toBe(200);
    return response.json() as { authorizeUrl: string; state: string };
  }

  function exchange(user: string, payload: Record<string, unknown>) {
    return app.inject({
      method: 'POST',
      url: '/v1/integrations/github/token',
      headers: { authorization: `Bearer ${user}` },
      payload,
    });
  }

  it('sends a PKCE challenge and the verifier on exchange', async () => {
    const { authorizeUrl, state } = await authorize('alice');
    const url = new URL(authorizeUrl);
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toBeTruthy();

    const response = await exchange('alice', { code: 'c1', state });
    expect(response.statusCode).toBe(200);
    const body = fetchMock.mock.calls[0]?.[1]?.body as URLSearchParams;
    expect(body.get('code_verifier')).toBeTruthy();
  });

  it('refuses a code redeemed by another account', async () => {
    const { state } = await authorize('alice');

    const response = await exchange('mallory', { code: 'intercepted', state });

    expect(response.statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a replayed state', async () => {
    const { state } = await authorize('alice');
    expect((await exchange('alice', { code: 'c1', state })).statusCode).toBe(200);

    expect((await exchange('alice', { code: 'c2', state })).statusCode).toBe(400);
  });

  it('refuses an exchange without state', async () => {
    expect((await exchange('alice', { code: 'c1' })).statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
