import {
  ALLOWED_SHARE_MIME_TYPES,
  type CreateShareResponse,
  computeExpiresAt,
  isShareExpired,
  isShareExpiry,
  maxBytesForMime,
  type PublicShareResponse,
  type ShareMimeType,
} from '@snapglow/cloud-core';
import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { FastifyInstance } from 'fastify';
import { customAlphabet } from 'nanoid';
import * as schema from '../db/schema';
import { env } from '../env';
import { authenticateRequest, upsertAuthUser } from '../plugins/auth';
import { getActiveWorkspaceId, resolveMembership } from '../plugins/workspace-auth';
import { cacheShareMetadata, checkUploadRateLimit } from '../services/redis';
import type { StorageService } from '../services/storage';

const createToken = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12);

interface ShareRouteOptions {
  db: PostgresJsDatabase<typeof schema>;
  storage: StorageService;
}

function isAllowedMimeType(value: string): value is ShareMimeType {
  return (ALLOWED_SHARE_MIME_TYPES as readonly string[]).includes(value);
}

export async function registerShareRoutes(app: FastifyInstance, options: ShareRouteOptions) {
  app.post('/v1/shares', { preHandler: authenticateRequest }, async (request, reply) => {
    const authUser = request.authUser;
    if (!authUser) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const user = await upsertAuthUser(options.db, authUser.auth0Sub, authUser.email);
    const allowed = await checkUploadRateLimit(user.id);
    if (!allowed) {
      return reply.code(429).send({ error: 'Upload rate limit exceeded' });
    }

    const multipart = await request.file();
    if (!multipart) {
      return reply.code(400).send({ error: 'Missing file upload' });
    }

    const expiresField = multipart.fields.expiresIn;
    const expiresRaw =
      expiresField && 'value' in expiresField && typeof expiresField.value === 'string'
        ? expiresField.value
        : '24h';

    if (!isShareExpiry(expiresRaw)) {
      return reply.code(400).send({ error: 'Invalid expiresIn value' });
    }

    const mimeType = multipart.mimetype;
    if (!isAllowedMimeType(mimeType)) {
      return reply.code(400).send({ error: 'Unsupported file type' });
    }

    const buffer = await multipart.toBuffer();
    const maxBytes = maxBytesForMime(mimeType);
    if (buffer.byteLength > maxBytes) {
      return reply.code(413).send({ error: 'File too large' });
    }

    const token = createToken();
    const storageKey = `shares/${user.id}/${token}`;
    await options.storage.uploadObject(storageKey, buffer, mimeType);

    const workspaceId = getActiveWorkspaceId(request);
    if (workspaceId) {
      const role = await resolveMembership(options.db, workspaceId, user.id);
      if (!role) {
        return reply.code(403).send({ error: 'Forbidden' });
      }
    }

    const expiresAt = computeExpiresAt(expiresRaw);
    const [share] = await options.db
      .insert(schema.shares)
      .values({
        userId: user.id,
        workspaceId: workspaceId ?? null,
        token,
        storageKey,
        mimeType,
        byteSize: buffer.byteLength,
        expiresAt,
      })
      .returning();

    if (!share) {
      return reply.code(500).send({ error: 'Failed to create share' });
    }

    const response: CreateShareResponse = {
      token: share.token,
      url: `${env.WEB_PUBLIC_URL}/s/${share.token}`,
      expiresAt: share.expiresAt?.toISOString() ?? null,
    };

    await cacheShareMetadata(token, {
      mimeType: share.mimeType,
      byteSize: share.byteSize,
      expiresAt: share.expiresAt?.toISOString() ?? null,
      storageKey: share.storageKey,
    });

    return reply.code(201).send(response);
  });

  app.get('/v1/shares/:token', async (request, reply) => {
    const { token } = request.params as { token: string };

    const rows = await options.db
      .select()
      .from(schema.shares)
      .where(eq(schema.shares.token, token))
      .limit(1);
    const share = rows[0];

    if (!share) {
      return reply.code(404).send({ error: 'Share not found' });
    }

    if (isShareExpired(share.expiresAt)) {
      return reply.code(410).send({ error: 'Share expired' });
    }

    const assetUrl = await options.storage.getPresignedUrl(share.storageKey);

    const response: PublicShareResponse = {
      token: share.token,
      mimeType: share.mimeType as ShareMimeType,
      byteSize: share.byteSize,
      expiresAt: share.expiresAt?.toISOString() ?? null,
      assetUrl,
      title: share.title,
    };

    return reply.send(response);
  });
}
