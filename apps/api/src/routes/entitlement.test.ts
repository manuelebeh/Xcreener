import { exportPKCS8, generateKeyPair, jwtVerify } from 'jose';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  whereCapture: {} as Record<string, unknown>,
  currentAuthUser: { id: 'user-admin', auth0Sub: 'auth0|admin', email: 'admin@test.com' },
  envOverrides: {} as Record<string, string>,
}));

vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return {
    ...actual,
    eq: (column: { name: string }, value: unknown) => {
      // Join conditions compare two columns; only value comparisons are row filters.
      if (typeof value !== 'object' || value === null) {
        testContext.whereCapture[column.name] = value;
      }
      return actual.eq(column as never, value);
    },
  };
});

vi.mock('../env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../env')>();
  return {
    env: new Proxy(actual.env, {
      get: (target, key) =>
        typeof key === 'string' && key in testContext.envOverrides
          ? testContext.envOverrides[key]
          : Reflect.get(target, key),
    }),
  };
});

vi.mock('../plugins/auth', () => ({
  authenticateRequest: async (
    request: {
      headers: { authorization?: string };
      authUser?: { id: string; auth0Sub: string; email: string | null };
    },
    reply: { code: (status: number) => { send: (payload: unknown) => Promise<void> } }
  ) => {
    if (!request.headers.authorization) {
      await reply.code(401).send({ error: 'Unauthorized' });
      return;
    }
    request.authUser = {
      id: '',
      auth0Sub: testContext.currentAuthUser.auth0Sub,
      email: testContext.currentAuthUser.email,
    };
  },
  upsertAuthUser: async () => testContext.currentAuthUser,
}));

import type { WorkspacePlan } from '@snapglow/team-core';
import { buildTestApp, type MemoryState, resetMemoryState } from './workspaces.test-helpers';

const AUTH = { authorization: 'Bearer test-token' };
let publicKey: CryptoKey;
let privatePem: string;

function addWorkspace(
  state: MemoryState,
  id: string,
  plan: WorkspacePlan,
  role: 'admin' | 'editor' | 'viewer' = 'admin'
) {
  const at = new Date('2026-06-27T12:00:00.000Z');
  state.workspaces.push({
    id,
    name: id,
    slug: id,
    plan,
    auth0OrgId: null,
    createdBy: 'user-admin',
    createdAt: at,
    updatedAt: at,
  });
  state.members.push({ workspaceId: id, userId: 'user-admin', role, joinedAt: at });
}

describe('entitlement and enterprise integration checks', () => {
  let state = resetMemoryState();

  beforeAll(async () => {
    const pair = await generateKeyPair('EdDSA', { extractable: true });
    publicKey = pair.publicKey;
    privatePem = await exportPKCS8(pair.privateKey);
  });

  beforeEach(() => {
    state = resetMemoryState();
    testContext.envOverrides = {
      ENTITLEMENT_PRIVATE_KEY: privatePem,
      ATLASSIAN_CLIENT_ID: 'atlassian-id',
      ATLASSIAN_CLIENT_SECRET: 'atlassian-secret',
      SLACK_CLIENT_ID: 'slack-id',
      SLACK_CLIENT_SECRET: 'slack-secret',
    };
    for (const key of Object.keys(testContext.whereCapture)) {
      delete testContext.whereCapture[key];
    }
  });

  it('requires auth', async () => {
    const app = await buildTestApp(state, testContext.whereCapture);
    const response = await app.inject({ method: 'GET', url: '/v1/me/entitlement' });
    expect(response.statusCode).toBe(401);
  });

  it('signs the best plan across workspaces', async () => {
    addWorkspace(state, 'ws-free', 'free');
    addWorkspace(state, 'ws-pro', 'team_pro');
    const app = await buildTestApp(state, testContext.whereCapture);

    const response = await app.inject({ method: 'GET', url: '/v1/me/entitlement', headers: AUTH });

    expect(response.statusCode).toBe(200);
    const { token, plan, userId } = response.json() as {
      token: string;
      plan: string;
      userId: string;
    };
    expect(plan).toBe('team_pro');
    expect(userId).toBe('user-admin');
    const { payload, protectedHeader } = await jwtVerify(token, publicKey);
    expect(protectedHeader.alg).toBe('EdDSA');
    expect(payload).toMatchObject({ sub: 'user-admin', plan: 'team_pro' });
    expect((payload.exp ?? 0) - (payload.iat ?? 0)).toBe(7 * 24 * 60 * 60);
  });

  it('does not give a paid plan to a viewer', async () => {
    addWorkspace(state, 'ws-pro', 'team_pro', 'viewer');
    addWorkspace(state, 'ws-starter', 'team_starter', 'editor');
    const app = await buildTestApp(state, testContext.whereCapture);

    const response = await app.inject({ method: 'GET', url: '/v1/me/entitlement', headers: AUTH });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ plan: 'team_starter' });
  });

  it('signs free without a workspace', async () => {
    const app = await buildTestApp(state, testContext.whereCapture);
    const response = await app.inject({ method: 'GET', url: '/v1/me/entitlement', headers: AUTH });
    expect(response.json()).toMatchObject({ plan: 'free' });
  });

  it('answers 503 when no signing key is configured', async () => {
    testContext.envOverrides.ENTITLEMENT_PRIVATE_KEY = '';
    const app = await buildTestApp(state, testContext.whereCapture);
    const response = await app.inject({ method: 'GET', url: '/v1/me/entitlement', headers: AUTH });
    expect(response.statusCode).toBe(503);
  });

  it.each([
    ['free', 403],
    ['team_starter', 403],
    ['team_pro', 200],
  ] as const)('gates Jira authorize on %s with %i', async (plan, status) => {
    addWorkspace(state, 'ws', plan);
    const app = await buildTestApp(state, testContext.whereCapture);

    const authorize = await app.inject({
      method: 'GET',
      url: '/v1/integrations/jira/authorize',
      headers: AUTH,
    });
    expect(authorize.statusCode).toBe(status);

    const token = await app.inject({
      method: 'POST',
      url: '/v1/integrations/jira/token',
      headers: AUTH,
      payload: {},
    });
    // Pro gets past the plan check and fails on the missing code instead.
    expect(token.statusCode).toBe(status === 200 ? 400 : 403);
  });

  it('leaves standard integrations open to free plans', async () => {
    addWorkspace(state, 'ws', 'free');
    const app = await buildTestApp(state, testContext.whereCapture);
    const response = await app.inject({
      method: 'GET',
      url: '/v1/integrations/slack/authorize',
      headers: AUTH,
    });
    expect(response.statusCode).toBe(200);
  });
});
