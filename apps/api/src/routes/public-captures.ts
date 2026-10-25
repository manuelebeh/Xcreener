import {
  beautifyCaptureSchema,
  type CaptureListResponse,
  type CaptureResponse,
  type ExportCaptureResponse,
  exportCaptureSchema,
  MAX_RENDER_PIXELS,
  type PublishCaptureResponse,
} from '@xcreener/api-core';
import {
  ALLOWED_SHARE_MIME_TYPES,
  MAX_LIBRARY_ITEM_BYTES,
  type ShareMimeType,
} from '@xcreener/cloud-core';
import { type CollabDocumentState, defaultCollabDocumentState } from '@xcreener/collab-core';
import { and, desc, eq, ilike, lt, or, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { FastifyInstance } from 'fastify';
import { customAlphabet } from 'nanoid';
import * as schema from '../db/schema';
import { env } from '../env';
import { parseOptionalDate } from '../lib/dates';
import { authenticateApiKey, sendRateLimitReply } from '../plugins/api-key-auth';
import { readImageDimensions } from '../services/image-dimensions';
import {
  checkApiExportRateLimit,
  checkApiGeneralRateLimit,
  checkApiUploadRateLimit,
} from '../services/redis';
import { loadBrandKitLogo } from '../services/render';
import { renderCaptureExportInWorker } from '../services/render-pool';
import type { StorageService } from '../services/storage';

const createShareToken = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12);

interface PublicCaptureRouteOptions {
  db: PostgresJsDatabase<typeof schema>;
  storage: StorageService;
}

function isAllowedMimeType(value: string): value is ShareMimeType {
  return (ALLOWED_SHARE_MIME_TYPES as readonly string[]).includes(value);
}

function parseTagsField(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string');
      }
    } catch {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
}

async function toCaptureResponse(
  storage: StorageService,
  capture: schema.ApiCapture
): Promise<CaptureResponse> {
  const exportUrl = capture.exportStorageKey
    ? await storage.getPresignedUrl(capture.exportStorageKey)
    : null;

  return {
    id: capture.id,
    workspaceId: capture.workspaceId,
    title: capture.title,
    mimeType: capture.mimeType,
    byteSize: capture.byteSize,
    tags: capture.tags ?? [],
    documentState: capture.documentState,
    screenshotUrl: await storage.getPresignedUrl(capture.storageKey),
    exportUrl,
    createdAt: capture.createdAt.toISOString(),
    updatedAt: capture.updatedAt.toISOString(),
  };
}

function exportMimeType(exportKey: string): string {
  if (exportKey.endsWith('.jpg')) {
    return 'image/jpeg';
  }
  if (exportKey.endsWith('.webp')) {
    return 'image/webp';
  }
  return 'image/png';
}

async function getBrandKitForWorkspace(db: PostgresJsDatabase<typeof schema>, workspaceId: string) {
  const rows = await db
    .select()
    .from(schema.brandKits)
    .where(eq(schema.brandKits.workspaceId, workspaceId))
    .limit(1);
  return rows[0] ?? null;
}

async function ensureCaptureExport(
  db: PostgresJsDatabase<typeof schema>,
  storage: StorageService,
  capture: schema.ApiCapture,
  workspaceId: string,
  format: 'png' | 'jpg' | 'webp' = 'png'
): Promise<{ exportKey: string; mimeType: string; byteSize: number }> {
  if (capture.exportStorageKey) {
    const buffer = await storage.getObject(capture.exportStorageKey);
    return {
      exportKey: capture.exportStorageKey,
      mimeType: exportMimeType(capture.exportStorageKey),
      byteSize: buffer.byteLength,
    };
  }

  const screenshotBuffer = await storage.getObject(capture.storageKey);
  const brandKit = await getBrandKitForWorkspace(db, workspaceId);
  const logoBuffer = await loadBrandKitLogo(storage, brandKit?.logoStorageKey);

  const rendered = await renderCaptureExportInWorker({
    documentState: capture.documentState,
    screenshotBuffer,
    format,
    quality: undefined,
    brandKitWatermark: brandKit?.watermark,
    brandKitLogoBuffer: logoBuffer,
  });

  const exportKey = `api-captures/${workspaceId}/${capture.id}/export.${format}`;
  await storage.uploadObject(exportKey, rendered.buffer, rendered.mimeType);

  await db
    .update(schema.apiCaptures)
    .set({ exportStorageKey: exportKey, updatedAt: new Date() })
    .where(eq(schema.apiCaptures.id, capture.id));

  return { exportKey, mimeType: rendered.mimeType, byteSize: rendered.buffer.byteLength };
}

export async function registerPublicCaptureRoutes(
  app: FastifyInstance,
  options: PublicCaptureRouteOptions
) {
  const apiKeyAuth = authenticateApiKey(options.db);

  app.post('/v1/public/captures', { preHandler: apiKeyAuth }, async (request, reply) => {
    const apiKey = request.apiKey;
    const workspaceId = request.apiWorkspaceId;
    if (!apiKey || !workspaceId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const generalLimit = await checkApiGeneralRateLimit(apiKey.id);
    if (!generalLimit.allowed) {
      return sendRateLimitReply(reply, generalLimit.retryAfterSec);
    }

    const uploadLimit = await checkApiUploadRateLimit(apiKey.id);
    if (!uploadLimit.allowed) {
      return sendRateLimitReply(reply, uploadLimit.retryAfterSec);
    }

    const multipart = await request.file();
    if (!multipart) {
      return reply.code(400).send({ error: 'Missing file upload' });
    }

    const mimeType = multipart.mimetype;
    if (!isAllowedMimeType(mimeType)) {
      return reply.code(400).send({ error: 'Unsupported file type' });
    }

    const buffer = await multipart.toBuffer();
    if (buffer.byteLength > MAX_LIBRARY_ITEM_BYTES) {
      return reply.code(413).send({ error: 'File too large' });
    }

    const titleField = multipart.fields.title;
    const tagsField = multipart.fields.tags;
    const title =
      titleField && 'value' in titleField && typeof titleField.value === 'string'
        ? titleField.value.trim() || null
        : null;
    const tags = tagsField
      ? parseTagsField('value' in tagsField ? tagsField.value : tagsField)
      : [];

    const dims = readImageDimensions(buffer);
    if (!dims) {
      return reply.code(400).send({ error: 'Unsupported or corrupt image' });
    }
    if (dims.width * dims.height > MAX_RENDER_PIXELS) {
      return reply.code(413).send({ error: 'Image too large to render' });
    }

    const captureId = crypto.randomUUID();
    const storageKey = `api-captures/${workspaceId}/${captureId}`;

    await options.storage.uploadObject(storageKey, buffer, mimeType);

    const state = defaultCollabDocumentState(dims.width, dims.height);

    const rows = await options.db
      .insert(schema.apiCaptures)
      .values({
        id: captureId,
        workspaceId,
        apiKeyId: apiKey.id,
        storageKey,
        mimeType,
        byteSize: buffer.byteLength,
        title,
        tags,
        documentState: state,
      })
      .returning();

    const created = rows[0];
    if (!created) {
      return reply.code(500).send({ error: 'Failed to create capture' });
    }

    return reply.code(201).send(await toCaptureResponse(options.storage, created));
  });

  app.get('/v1/public/captures', { preHandler: apiKeyAuth }, async (request, reply) => {
    const apiKey = request.apiKey;
    const workspaceId = request.apiWorkspaceId;
    if (!apiKey || !workspaceId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const generalLimit = await checkApiGeneralRateLimit(apiKey.id);
    if (!generalLimit.allowed) {
      return sendRateLimitReply(reply, generalLimit.retryAfterSec);
    }

    const query = request.query as { cursor?: string; limit?: string; q?: string; tag?: string };
    const limit = Math.min(Math.max(Number.parseInt(query.limit ?? '50', 10) || 50, 1), 50);
    const conditions = [eq(schema.apiCaptures.workspaceId, workspaceId)];

    const cursor = parseOptionalDate(query.cursor);
    if (cursor === null) {
      return reply.code(400).send({ error: 'Invalid cursor' });
    }
    if (cursor) {
      conditions.push(lt(schema.apiCaptures.createdAt, cursor));
    }

    if (query.tag) {
      conditions.push(sql`${schema.apiCaptures.tags} @> ${JSON.stringify([query.tag])}::jsonb`);
    }

    if (query.q) {
      const pattern = `%${query.q}%`;
      const searchCondition = or(
        ilike(schema.apiCaptures.title, pattern),
        sql`exists (
            select 1 from jsonb_array_elements_text(${schema.apiCaptures.tags}) as tag
            where tag ilike ${pattern}
          )`
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    const rows = await options.db
      .select()
      .from(schema.apiCaptures)
      .where(and(...conditions))
      .orderBy(desc(schema.apiCaptures.createdAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? (items[items.length - 1]?.createdAt.toISOString() ?? null) : null;

    const response: CaptureListResponse = {
      items: await Promise.all(items.map((item) => toCaptureResponse(options.storage, item))),
      nextCursor,
    };

    return response;
  });

  app.get('/v1/public/captures/:id', { preHandler: apiKeyAuth }, async (request, reply) => {
    const apiKey = request.apiKey;
    const workspaceId = request.apiWorkspaceId;
    const { id } = request.params as { id: string };
    if (!apiKey || !workspaceId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const generalLimit = await checkApiGeneralRateLimit(apiKey.id);
    if (!generalLimit.allowed) {
      return sendRateLimitReply(reply, generalLimit.retryAfterSec);
    }

    const rows = await options.db
      .select()
      .from(schema.apiCaptures)
      .where(and(eq(schema.apiCaptures.id, id), eq(schema.apiCaptures.workspaceId, workspaceId)))
      .limit(1);

    const capture = rows[0];
    if (!capture) {
      return reply.code(404).send({ error: 'Capture not found' });
    }

    return toCaptureResponse(options.storage, capture);
  });

  // Plugins whose network allowlist only covers the API origin download exports here.
  app.get(
    '/v1/public/captures/:id/export/content',
    { preHandler: apiKeyAuth },
    async (request, reply) => {
      const apiKey = request.apiKey;
      const workspaceId = request.apiWorkspaceId;
      const { id } = request.params as { id: string };
      if (!apiKey || !workspaceId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const generalLimit = await checkApiGeneralRateLimit(apiKey.id);
      if (!generalLimit.allowed) {
        return sendRateLimitReply(reply, generalLimit.retryAfterSec);
      }

      const rows = await options.db
        .select({ exportStorageKey: schema.apiCaptures.exportStorageKey })
        .from(schema.apiCaptures)
        .where(and(eq(schema.apiCaptures.id, id), eq(schema.apiCaptures.workspaceId, workspaceId)))
        .limit(1);

      const exportKey = rows[0]?.exportStorageKey;
      if (!exportKey) {
        return reply.code(404).send({ error: 'Export not found' });
      }

      const body = await options.storage.getObject(exportKey);
      return reply
        .header('Content-Type', exportMimeType(exportKey))
        .header('Cache-Control', 'private, no-store')
        .send(body);
    }
  );

  app.patch('/v1/public/captures/:id', { preHandler: apiKeyAuth }, async (request, reply) => {
    const apiKey = request.apiKey;
    const workspaceId = request.apiWorkspaceId;
    const { id } = request.params as { id: string };
    if (!apiKey || !workspaceId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const generalLimit = await checkApiGeneralRateLimit(apiKey.id);
    if (!generalLimit.allowed) {
      return sendRateLimitReply(reply, generalLimit.retryAfterSec);
    }

    const parsed = beautifyCaptureSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid request body' });
    }

    const updates: {
      documentState: CollabDocumentState;
      updatedAt: Date;
      exportStorageKey: null;
      title?: string | null;
      tags?: string[];
    } = {
      documentState: parsed.data.documentState as unknown as CollabDocumentState,
      updatedAt: new Date(),
      exportStorageKey: null,
    };

    if (parsed.data.title !== undefined) {
      updates.title = parsed.data.title;
    }
    if (parsed.data.tags !== undefined) {
      updates.tags = parsed.data.tags;
    }

    const rows = await options.db
      .update(schema.apiCaptures)
      .set(updates)
      .where(and(eq(schema.apiCaptures.id, id), eq(schema.apiCaptures.workspaceId, workspaceId)))
      .returning();

    const capture = rows[0];
    if (!capture) {
      return reply.code(404).send({ error: 'Capture not found' });
    }

    return toCaptureResponse(options.storage, capture);
  });

  app.post('/v1/public/captures/:id/export', { preHandler: apiKeyAuth }, async (request, reply) => {
    const apiKey = request.apiKey;
    const workspaceId = request.apiWorkspaceId;
    const { id } = request.params as { id: string };
    if (!apiKey || !workspaceId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const generalLimit = await checkApiGeneralRateLimit(apiKey.id);
    if (!generalLimit.allowed) {
      return sendRateLimitReply(reply, generalLimit.retryAfterSec);
    }

    const exportLimit = await checkApiExportRateLimit(apiKey.id);
    if (!exportLimit.allowed) {
      return sendRateLimitReply(reply, exportLimit.retryAfterSec);
    }

    const parsed = exportCaptureSchema.safeParse(request.body ?? { format: 'png' });
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid request body' });
    }

    const rows = await options.db
      .select()
      .from(schema.apiCaptures)
      .where(and(eq(schema.apiCaptures.id, id), eq(schema.apiCaptures.workspaceId, workspaceId)))
      .limit(1);

    const capture = rows[0];
    if (!capture) {
      return reply.code(404).send({ error: 'Capture not found' });
    }

    const screenshotBuffer = await options.storage.getObject(capture.storageKey);
    const brandKit = await getBrandKitForWorkspace(options.db, workspaceId);
    const logoBuffer = await loadBrandKitLogo(options.storage, brandKit?.logoStorageKey);

    const rendered = await renderCaptureExportInWorker({
      documentState: capture.documentState,
      screenshotBuffer,
      format: parsed.data.format,
      quality: parsed.data.quality,
      brandKitWatermark: brandKit?.watermark,
      brandKitLogoBuffer: logoBuffer,
    });

    const exportKey = `api-captures/${workspaceId}/${capture.id}/export.${parsed.data.format}`;
    await options.storage.uploadObject(exportKey, rendered.buffer, rendered.mimeType);

    await options.db
      .update(schema.apiCaptures)
      .set({ exportStorageKey: exportKey, updatedAt: new Date() })
      .where(eq(schema.apiCaptures.id, capture.id));

    const response: ExportCaptureResponse = {
      exportUrl: await options.storage.getPresignedUrl(exportKey),
      format: parsed.data.format,
      byteSize: rendered.buffer.byteLength,
      width: rendered.width,
      height: rendered.height,
    };

    return response;
  });

  app.post(
    '/v1/public/captures/:id/publish',
    { preHandler: apiKeyAuth },
    async (request, reply) => {
      const apiKey = request.apiKey;
      const workspaceId = request.apiWorkspaceId;
      const { id } = request.params as { id: string };
      if (!apiKey || !workspaceId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const generalLimit = await checkApiGeneralRateLimit(apiKey.id);
      if (!generalLimit.allowed) {
        return sendRateLimitReply(reply, generalLimit.retryAfterSec);
      }

      const exportLimit = await checkApiExportRateLimit(apiKey.id);
      if (!exportLimit.allowed) {
        return sendRateLimitReply(reply, exportLimit.retryAfterSec);
      }

      const rows = await options.db
        .select()
        .from(schema.apiCaptures)
        .where(and(eq(schema.apiCaptures.id, id), eq(schema.apiCaptures.workspaceId, workspaceId)))
        .limit(1);

      const capture = rows[0];
      if (!capture) {
        return reply.code(404).send({ error: 'Capture not found' });
      }

      const keyRows = await options.db
        .select({ createdBy: schema.apiKeys.createdBy })
        .from(schema.apiKeys)
        .where(eq(schema.apiKeys.id, apiKey.id))
        .limit(1);

      const keyOwner = keyRows[0];
      if (!keyOwner) {
        return reply.code(500).send({ error: 'API key not found' });
      }

      const exported = await ensureCaptureExport(options.db, options.storage, capture, workspaceId);

      const exportBuffer = await options.storage.getObject(exported.exportKey);
      const token = createShareToken();
      const shareStorageKey = `shares/${keyOwner.createdBy}/${token}`;
      await options.storage.uploadObject(shareStorageKey, exportBuffer, exported.mimeType);

      const [share] = await options.db
        .insert(schema.shares)
        .values({
          userId: keyOwner.createdBy,
          workspaceId,
          token,
          storageKey: shareStorageKey,
          mimeType: exported.mimeType,
          byteSize: exported.byteSize,
          title: capture.title,
          expiresAt: null,
        })
        .returning();

      if (!share) {
        return reply.code(500).send({ error: 'Failed to publish capture' });
      }

      const response: PublishCaptureResponse = {
        token: share.token,
        shareUrl: `${env.WEB_PUBLIC_URL}/s/${share.token}`,
        embedUrl: `${env.WEB_PUBLIC_URL}/e/${share.token}`,
        expiresAt: null,
      };

      return reply.code(201).send(response);
    }
  );

  app.delete('/v1/public/captures/:id', { preHandler: apiKeyAuth }, async (request, reply) => {
    const apiKey = request.apiKey;
    const workspaceId = request.apiWorkspaceId;
    const { id } = request.params as { id: string };
    if (!apiKey || !workspaceId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const generalLimit = await checkApiGeneralRateLimit(apiKey.id);
    if (!generalLimit.allowed) {
      return sendRateLimitReply(reply, generalLimit.retryAfterSec);
    }

    const rows = await options.db
      .select()
      .from(schema.apiCaptures)
      .where(and(eq(schema.apiCaptures.id, id), eq(schema.apiCaptures.workspaceId, workspaceId)))
      .limit(1);

    const capture = rows[0];
    if (!capture) {
      return reply.code(404).send({ error: 'Capture not found' });
    }

    await options.storage.deleteObject(capture.storageKey);
    if (capture.exportStorageKey) {
      await options.storage.deleteObject(capture.exportStorageKey);
    }

    await options.db.delete(schema.apiCaptures).where(eq(schema.apiCaptures.id, capture.id));

    return reply.code(204).send();
  });
}
