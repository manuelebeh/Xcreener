import {
  type ApiKeyResponse,
  apiKeyDisplayPrefix,
  buildApiKeyPlaintext,
  type CreateApiKeyResponse,
  createApiKeySchema,
} from '@snapglow/api-core';
import { generateApiKeySecret, hashApiKey } from '@snapglow/api-core/api-keys';
import { hasApiAccess } from '@snapglow/team-core';
import { and, desc, eq, isNull } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { FastifyInstance } from 'fastify';
import * as schema from '../db/schema';
import { authenticateRequest, upsertAuthUser } from '../plugins/auth';
import { requireWorkspaceRole } from '../plugins/workspace-auth';

interface ApiKeyRouteOptions {
  db: PostgresJsDatabase<typeof schema>;
}

function toApiKeyResponse(key: schema.ApiKey): ApiKeyResponse {
  return {
    id: key.id,
    name: key.name,
    keyPrefix: key.keyPrefix,
    createdAt: key.createdAt.toISOString(),
    lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
    revokedAt: key.revokedAt?.toISOString() ?? null,
  };
}

export async function registerApiKeyRoutes(app: FastifyInstance, options: ApiKeyRouteOptions) {
  app.get(
    '/v1/workspaces/:id/api-keys',
    { preHandler: [authenticateRequest, requireWorkspaceRole('admin')] },
    async (request, reply) => {
      const workspaceId = request.workspaceId;
      if (!workspaceId) {
        return reply.code(400).send({ error: 'Missing workspace id' });
      }

      const workspace = await options.db
        .select({ plan: schema.workspaces.plan })
        .from(schema.workspaces)
        .where(eq(schema.workspaces.id, workspaceId))
        .limit(1);

      if (!workspace[0] || !hasApiAccess(workspace[0].plan)) {
        return reply.code(403).send({ error: 'API access requires Team Pro plan' });
      }

      const keys = await options.db
        .select()
        .from(schema.apiKeys)
        .where(and(eq(schema.apiKeys.workspaceId, workspaceId), isNull(schema.apiKeys.revokedAt)))
        .orderBy(desc(schema.apiKeys.createdAt));

      return { items: keys.map(toApiKeyResponse) };
    }
  );

  app.post(
    '/v1/workspaces/:id/api-keys',
    { preHandler: [authenticateRequest, requireWorkspaceRole('admin')] },
    async (request, reply) => {
      const workspaceId = request.workspaceId;
      if (!workspaceId) {
        return reply.code(400).send({ error: 'Missing workspace id' });
      }

      const workspace = await options.db
        .select({ plan: schema.workspaces.plan })
        .from(schema.workspaces)
        .where(eq(schema.workspaces.id, workspaceId))
        .limit(1);

      if (!workspace[0] || !hasApiAccess(workspace[0].plan)) {
        return reply.code(403).send({ error: 'API access requires Team Pro plan' });
      }

      const parsed = createApiKeySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid request body' });
      }

      const authUser = request.authUser;
      if (!authUser) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const user = await upsertAuthUser(options.db, authUser.auth0Sub, authUser.email);
      const secret = generateApiKeySecret();
      const plaintext = buildApiKeyPlaintext(secret);
      const keyPrefix = apiKeyDisplayPrefix(plaintext);
      const keyHash = hashApiKey(plaintext);

      const rows = await options.db
        .insert(schema.apiKeys)
        .values({
          workspaceId,
          name: parsed.data.name,
          keyPrefix,
          keyHash,
          createdBy: user.id,
        })
        .returning();

      const created = rows[0];
      if (!created) {
        return reply.code(500).send({ error: 'Failed to create API key' });
      }

      const response: CreateApiKeyResponse = {
        id: created.id,
        name: created.name,
        key: plaintext,
        keyPrefix: created.keyPrefix,
        createdAt: created.createdAt.toISOString(),
      };

      return reply.code(201).send(response);
    }
  );

  app.delete(
    '/v1/workspaces/:id/api-keys/:keyId',
    { preHandler: [authenticateRequest, requireWorkspaceRole('admin')] },
    async (request, reply) => {
      const workspaceId = request.workspaceId;
      const { keyId } = request.params as { keyId: string };
      if (!workspaceId) {
        return reply.code(400).send({ error: 'Missing workspace id' });
      }

      const rows = await options.db
        .update(schema.apiKeys)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(schema.apiKeys.id, keyId),
            eq(schema.apiKeys.workspaceId, workspaceId),
            isNull(schema.apiKeys.revokedAt)
          )
        )
        .returning();

      if (!rows[0]) {
        return reply.code(404).send({ error: 'API key not found' });
      }

      return reply.code(204).send();
    }
  );
}
