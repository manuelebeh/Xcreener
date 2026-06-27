import { hashApiKey, isApiKeyPlaintext } from '@snapglow/api-core';
import { hasApiAccess } from '@snapglow/team-core';
import { and, eq, isNull } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { FastifyReply, FastifyRequest } from 'fastify';
import * as schema from '../db/schema';

declare module 'fastify' {
  interface FastifyRequest {
    apiKey?: schema.ApiKey;
    apiWorkspaceId?: string;
  }
}

function extractBearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return null;
  }
  const token = header.slice('Bearer '.length).trim();
  return token || null;
}

export function authenticateApiKey(db: PostgresJsDatabase<typeof schema>) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const token = extractBearerToken(request);
    if (!token || !isApiKeyPlaintext(token)) {
      await reply.code(401).send({ error: 'Invalid API key' });
      return;
    }

    const keyHash = hashApiKey(token);
    const rows = await db
      .select({
        key: schema.apiKeys,
        workspace: schema.workspaces,
      })
      .from(schema.apiKeys)
      .innerJoin(schema.workspaces, eq(schema.apiKeys.workspaceId, schema.workspaces.id))
      .where(and(eq(schema.apiKeys.keyHash, keyHash), isNull(schema.apiKeys.revokedAt)))
      .limit(1);

    const row = rows[0];
    if (!row) {
      await reply.code(401).send({ error: 'Invalid API key' });
      return;
    }

    if (!hasApiAccess(row.workspace.plan)) {
      await reply.code(403).send({ error: 'API access requires Team Pro plan' });
      return;
    }

    request.apiKey = row.key;
    request.apiWorkspaceId = row.workspace.id;

    void db
      .update(schema.apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(schema.apiKeys.id, row.key.id));
  };
}

export async function sendRateLimitReply(
  reply: FastifyReply,
  retryAfterSec: number
): Promise<void> {
  await reply
    .header('Retry-After', String(retryAfterSec))
    .code(429)
    .send({ error: 'Rate limit exceeded' });
}
