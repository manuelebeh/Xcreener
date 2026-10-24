import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.GITHUB_CLIENT_ID = 'gh-client';
  process.env.GITHUB_CLIENT_SECRET = 'gh-secret';
  process.env.LINEAR_CLIENT_ID = 'linear-client';
  process.env.LINEAR_CLIENT_SECRET = 'linear-secret';
  process.env.INTEGRATION_TOKEN_KEY = Buffer.alloc(32, 7).toString('base64');
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

  async function authorize(user: string, provider = 'github') {
    const response = await app.inject({
      method: 'GET',
      url: `/v1/integrations/${provider}/authorize`,
      headers: { authorization: `Bearer ${user}` },
    });
    expect(response.statusCode).toBe(200);
    return response.json() as { authorizeUrl: string; state: string };
  }

  function exchange(user: string, payload: Record<string, unknown>, provider = 'github') {
    return app.inject({
      method: 'POST',
      url: `/v1/integrations/${provider}/token`,
      headers: { authorization: `Bearer ${user}` },
      payload,
    });
  }

  function refresh(user: string, payload: Record<string, unknown>, provider = 'linear') {
    return app.inject({
      method: 'POST',
      url: `/v1/integrations/${provider}/refresh`,
      headers: { authorization: `Bearer ${user}` },
      payload,
    });
  }

  async function connectLinear(user: string): Promise<string> {
    fetchMock.mockResolvedValueOnce(
      Response.json({ access_token: 'lin-1', refresh_token: 'lin-refresh-1', expires_in: 3600 })
    );
    const { state } = await authorize(user, 'linear');
    const response = await exchange(user, { code: 'c1', state }, 'linear');
    expect(response.statusCode).toBe(200);
    return (response.json() as { refreshHandle: string }).refreshHandle;
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

  it('keeps provider error text out of the response', async () => {
    fetchMock.mockResolvedValue(
      new Response('{"error":"internal provider detail"}', { status: 500 })
    );
    const { state } = await authorize('alice');

    const response = await exchange('alice', { code: 'c1', state });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({ error: 'Token exchange failed' });
  });

  it('bounds the provider call with a timeout', async () => {
    const { state } = await authorize('alice');
    await exchange('alice', { code: 'c1', state });

    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('refuses an exchange without state', async () => {
    expect((await exchange('alice', { code: 'c1' })).statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns a sealed refresh handle, never the provider refresh token', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ access_token: 'lin-1', refresh_token: 'lin-refresh-1', expires_in: 3600 })
    );
    const { state } = await authorize('alice', 'linear');

    const response = await exchange('alice', { code: 'c1', state }, 'linear');

    expect(response.statusCode).toBe(200);
    const body = response.json() as Record<string, unknown>;
    expect(body.accessToken).toBe('lin-1');
    expect(body.refreshHandle).toMatch(/^v1\./);
    expect(body).not.toHaveProperty('refreshToken');
    expect(response.body).not.toContain('lin-refresh-1');
  });

  it('refreshes with the handle and rotates it', async () => {
    const handle = await connectLinear('alice');
    fetchMock.mockResolvedValueOnce(
      Response.json({ access_token: 'lin-2', refresh_token: 'lin-refresh-2', expires_in: 3600 })
    );

    const response = await refresh('alice', { refreshHandle: handle });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { accessToken: string; refreshHandle: string };
    expect(body.accessToken).toBe('lin-2');
    expect(body.refreshHandle).not.toBe(handle);
    expect(response.body).not.toContain('lin-refresh-2');
    const sent = fetchMock.mock.calls.at(-1)?.[1]?.body as URLSearchParams;
    expect(sent.get('grant_type')).toBe('refresh_token');
    expect(sent.get('refresh_token')).toBe('lin-refresh-1');
    expect(sent.get('client_secret')).toBe('linear-secret');
  });

  it('refuses a handle used by another account', async () => {
    const handle = await connectLinear('alice');
    fetchMock.mockClear();

    const response = await refresh('mallory', { refreshHandle: handle });

    expect(response.statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('asks to reconnect when the provider refuses the refresh token', async () => {
    const handle = await connectLinear('alice');
    fetchMock.mockResolvedValueOnce(Response.json({ error: 'invalid_grant' }, { status: 400 }));

    const response = await refresh('alice', { refreshHandle: handle });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: 'Reconnect this integration' });
  });

  it('refuses refresh for providers without expiring tokens', async () => {
    const response = await refresh('alice', { refreshHandle: 'v1.x' }, 'github');
    expect(response.statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
