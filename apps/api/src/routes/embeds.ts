import { isShareExpired, type PublicEmbedResponse, type ShareMimeType } from '@xcreener/cloud-core';
import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { FastifyInstance } from 'fastify';
import * as schema from '../db/schema';
import type { StorageService } from '../services/storage';
import { presignedTtlForShare } from './shares';

interface EmbedRouteOptions {
  db: PostgresJsDatabase<typeof schema>;
  storage: StorageService;
}

export async function registerEmbedRoutes(app: FastifyInstance, options: EmbedRouteOptions) {
  app.get('/v1/embeds/:token', async (request, reply) => {
    const { token } = request.params as { token: string };

    const rows = await options.db
      .select()
      .from(schema.shares)
      .where(eq(schema.shares.token, token))
      .limit(1);
    const share = rows[0];

    if (!share) {
      return reply.code(404).send({ error: 'Embed not found' });
    }

    if (isShareExpired(share.expiresAt)) {
      return reply.code(410).send({ error: 'Embed expired' });
    }

    const assetUrl = await options.storage.getPresignedUrl(
      share.storageKey,
      presignedTtlForShare(share.expiresAt)
    );

    const response: PublicEmbedResponse = {
      token: share.token,
      mimeType: share.mimeType as ShareMimeType,
      byteSize: share.byteSize,
      expiresAt: share.expiresAt?.toISOString() ?? null,
      assetUrl,
      title: share.title ?? null,
    };

    return reply.send(response);
  });
}
