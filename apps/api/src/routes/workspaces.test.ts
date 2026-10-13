import { beforeEach, describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  whereCapture: {} as Record<string, unknown>,
  currentAuthUser: {
    id: 'user-admin',
    auth0Sub: 'auth0|admin',
    email: 'admin@test.com',
  },
}));

vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return {
    ...actual,
    eq: (column: { name: string }, value: unknown) => {
      testContext.whereCapture[column.name] = value;
      return actual.eq(column as never, value);
    },
    and: (...conditions: unknown[]) => actual.and(...(conditions as never[])),
    count: () => ({ as: () => 'count' }),
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

import { invitations, workspaceMembers, workspaces } from '../db/schema';
import { buildTestApp, resetMemoryState } from './workspaces.test-helpers';

describe('workspace routes', () => {
  let state = resetMemoryState();

  beforeEach(() => {
    state = resetMemoryState();
    testContext.currentAuthUser = {
      id: 'user-admin',
      auth0Sub: 'auth0|admin',
      email: 'admin@test.com',
    };
    Object.keys(testContext.whereCapture).forEach((key) => {
      delete testContext.whereCapture[key];
    });
  });

  it('returns 401 without auth on list', async () => {
    const app = await buildTestApp(state, testContext.whereCapture);

    const response = await app.inject({
      method: 'GET',
      url: '/v1/workspaces',
    });

    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it('creates a workspace and assigns creator as admin', async () => {
    const app = await buildTestApp(state, testContext.whereCapture);

    const response = await app.inject({
      method: 'POST',
      url: '/v1/workspaces',
      headers: { authorization: 'Bearer test-token' },
      payload: { name: 'Design Team' },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.name).toBe('Design Team');
    expect(body.slug).toBe('design-team');
    expect(body.role).toBe('admin');
    expect(body.memberCount).toBe(1);
    expect(state.workspaces).toHaveLength(1);
    expect(state.members).toHaveLength(1);
    expect(state.members[0]?.role).toBe('admin');

    await app.close();
  });

  it('creates, accepts invitation, and adds member', async () => {
    state.workspaces.push({
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Acme',
      slug: 'acme',
      plan: 'team_pro',
      auth0OrgId: null,
      createdBy: 'user-admin',
      createdAt: new Date('2026-06-27T12:00:00.000Z'),
      updatedAt: new Date('2026-06-27T12:00:00.000Z'),
    });
    state.members.push({
      workspaceId: '00000000-0000-4000-8000-000000000001',
      userId: 'user-admin',
      role: 'admin',
      joinedAt: new Date('2026-06-27T12:00:00.000Z'),
    });

    const app = await buildTestApp(state, testContext.whereCapture);

    const inviteResponse = await app.inject({
      method: 'POST',
      url: '/v1/workspaces/00000000-0000-4000-8000-000000000001/invitations',
      headers: { authorization: 'Bearer test-token' },
      payload: { email: 'viewer@test.com', role: 'viewer' },
    });

    expect(inviteResponse.statusCode).toBe(201);
    const invitation = inviteResponse.json();
    expect(invitation.inviteUrl).toContain('snapglow://team/invite?token=');
    expect(state.invitations).toHaveLength(1);

    testContext.currentAuthUser = {
      id: 'user-viewer',
      auth0Sub: 'auth0|viewer',
      email: 'viewer@test.com',
    };

    const acceptResponse = await app.inject({
      method: 'POST',
      url: `/v1/invitations/${invitation.token}/accept`,
      headers: { authorization: 'Bearer test-token' },
    });

    expect(acceptResponse.statusCode).toBe(200);
    expect(acceptResponse.json().role).toBe('viewer');
    expect(state.members).toHaveLength(2);
    expect(state.invitations[0]?.acceptedAt).not.toBeNull();

    await app.close();
  });

  it('enforces admin role for workspace rename', async () => {
    state.workspaces.push({
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Acme',
      slug: 'acme',
      plan: 'free',
      auth0OrgId: null,
      createdBy: 'user-admin',
      createdAt: new Date('2026-06-27T12:00:00.000Z'),
      updatedAt: new Date('2026-06-27T12:00:00.000Z'),
    });
    state.members.push({
      workspaceId: '00000000-0000-4000-8000-000000000001',
      userId: 'user-viewer',
      role: 'viewer',
      joinedAt: new Date('2026-06-27T12:00:00.000Z'),
    });

    testContext.currentAuthUser = {
      id: 'user-viewer',
      auth0Sub: 'auth0|viewer',
      email: 'viewer@test.com',
    };

    const app = await buildTestApp(state, testContext.whereCapture);

    const response = await app.inject({
      method: 'PATCH',
      url: '/v1/workspaces/00000000-0000-4000-8000-000000000001',
      headers: { authorization: 'Bearer test-token' },
      payload: { name: 'Renamed' },
    });

    expect(response.statusCode).toBe(403);
    await app.close();
  });

  it('blocks invitations when team starter member limit is reached', async () => {
    state.workspaces.push({
      id: '00000000-0000-4000-8000-000000000002',
      name: 'Starter Team',
      slug: 'starter-team',
      plan: 'team_starter',
      auth0OrgId: null,
      createdBy: 'user-admin',
      createdAt: new Date('2026-06-27T12:00:00.000Z'),
      updatedAt: new Date('2026-06-27T12:00:00.000Z'),
    });

    for (let index = 0; index < 5; index += 1) {
      state.members.push({
        workspaceId: '00000000-0000-4000-8000-000000000002',
        userId: index === 0 ? 'user-admin' : `user-${index}`,
        role: index === 0 ? 'admin' : 'viewer',
        joinedAt: new Date('2026-06-27T12:00:00.000Z'),
      });
    }

    const app = await buildTestApp(state, testContext.whereCapture);

    const response = await app.inject({
      method: 'POST',
      url: '/v1/workspaces/00000000-0000-4000-8000-000000000002/invitations',
      headers: { authorization: 'Bearer test-token' },
      payload: { role: 'viewer' },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error).toBe('Member limit reached for workspace plan');
    await app.close();
  });
});

describe('schema exports', () => {
  it('defines workspace tables', () => {
    expect(workspaces).toBeDefined();
    expect(workspaceMembers).toBeDefined();
    expect(invitations).toBeDefined();
  });
});
