import { can, hasMinRole, type WorkspaceRole } from '@xcreener/team-core';
import { and, eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { FastifyReply, FastifyRequest } from 'fastify';
import * as schema from '../db/schema';
import { upsertAuthUser } from './auth';

declare module 'fastify' {
  interface FastifyRequest {
    workspaceId?: string;
    workspaceRole?: WorkspaceRole;
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function resolveMembership(
  db: PostgresJsDatabase<typeof schema>,
  workspaceId: string,
  userId: string
): Promise<WorkspaceRole | null> {
  if (!UUID_PATTERN.test(workspaceId)) {
    return null;
  }

  const rows = await db
    .select({ role: schema.workspaceMembers.role })
    .from(schema.workspaceMembers)
    .where(
      and(
        eq(schema.workspaceMembers.workspaceId, workspaceId),
        eq(schema.workspaceMembers.userId, userId)
      )
    )
    .limit(1);

  return rows[0]?.role ?? null;
}

function resolveWorkspaceIdFromRequest(request: FastifyRequest): string | undefined {
  const params = request.params as { id?: string };
  if (params.id) {
    return params.id;
  }

  const header = request.headers['x-workspace-id'];
  if (typeof header === 'string' && header.trim()) {
    return header.trim();
  }

  return undefined;
}

export function requireWorkspaceRole(minRole: WorkspaceRole) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const authUser = request.authUser;
    if (!authUser) {
      await reply.code(401).send({ error: 'Unauthorized' });
      return;
    }

    const workspaceId = resolveWorkspaceIdFromRequest(request);
    if (!workspaceId) {
      await reply.code(400).send({ error: 'Missing workspace id' });
      return;
    }

    const db = request.server.db as PostgresJsDatabase<typeof schema>;
    const user = await upsertAuthUser(db, authUser.auth0Sub, authUser.email);
    const role = await resolveMembership(db, workspaceId, user.id);

    if (!role) {
      await reply.code(403).send({ error: 'Forbidden' });
      return;
    }

    if (!hasMinRole(role, minRole)) {
      await reply.code(403).send({ error: 'Forbidden' });
      return;
    }

    request.workspaceId = workspaceId;
    request.workspaceRole = role;
  };
}

export function requireWorkspaceAction(action: Parameters<typeof can>[1]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const authUser = request.authUser;
    if (!authUser) {
      await reply.code(401).send({ error: 'Unauthorized' });
      return;
    }

    const workspaceId = resolveWorkspaceIdFromRequest(request);
    if (!workspaceId) {
      await reply.code(400).send({ error: 'Missing workspace id' });
      return;
    }

    const db = request.server.db as PostgresJsDatabase<typeof schema>;
    const user = await upsertAuthUser(db, authUser.auth0Sub, authUser.email);
    const role = await resolveMembership(db, workspaceId, user.id);

    if (!role || !can(role, action)) {
      await reply.code(403).send({ error: 'Forbidden' });
      return;
    }

    request.workspaceId = workspaceId;
    request.workspaceRole = role;
  };
}

export function getActiveWorkspaceId(request: FastifyRequest): string | undefined {
  const header = request.headers['x-workspace-id'];
  if (typeof header === 'string' && header.trim()) {
    return header.trim();
  }
  return undefined;
}

declare module 'fastify' {
  interface FastifyInstance {
    db: PostgresJsDatabase<typeof schema>;
  }
}
