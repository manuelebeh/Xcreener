import {
  ALLOWED_SHARE_MIME_TYPES,
  type CreateLibraryItemResponse,
  type LibraryItemResponse,
  type LibrarySearchResponse,
  MAX_LIBRARY_ITEM_BYTES,
  type ShareMimeType,
} from '@snapglow/cloud-core';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { FastifyInstance } from 'fastify';
import * as schema from '../db/schema';
import { authenticateRequest, upsertAuthUser } from '../plugins/auth';
import { getActiveWorkspaceId, resolveMembership } from '../plugins/workspace-auth';
import type { StorageService } from '../services/storage';

interface LibraryRouteOptions {
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

async function getCollectionIdsForItem(
  db: PostgresJsDatabase<typeof schema>,
  itemId: string
): Promise<string[]> {
  const rows = await db
    .select({ collectionId: schema.libraryItemCollections.collectionId })
    .from(schema.libraryItemCollections)
    .where(eq(schema.libraryItemCollections.libraryItemId, itemId));
  return rows.map((row) => row.collectionId);
}

async function toLibraryItemResponse(
  db: PostgresJsDatabase<typeof schema>,
  storage: StorageService,
  item: schema.LibraryItem
): Promise<LibraryItemResponse> {
  const collectionIds = await getCollectionIdsForItem(db, item.id);
  return {
    id: item.id,
    title: item.title,
    mimeType: item.mimeType,
    byteSize: item.byteSize,
    ocrText: item.ocrText,
    tags: item.tags ?? [],
    localId: item.localId,
    collectionIds,
    assetUrl: await storage.getPresignedUrl(item.storageKey),
    createdAt: item.createdAt.toISOString(),
  };
}

export async function registerLibraryRoutes(app: FastifyInstance, options: LibraryRouteOptions) {
  app.post('/v1/library', { preHandler: authenticateRequest }, async (request, reply) => {
    const authUser = request.authUser;
    if (!authUser) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const user = await upsertAuthUser(options.db, authUser.auth0Sub, authUser.email);
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

    const ocrTextField = multipart.fields.ocrText;
    const titleField = multipart.fields.title;
    const tagsField = multipart.fields.tags;
    const localIdField = multipart.fields.localId;
    const collectionIdsField = multipart.fields.collectionIds;

    const ocrText =
      ocrTextField && 'value' in ocrTextField && typeof ocrTextField.value === 'string'
        ? ocrTextField.value
        : null;
    const title =
      titleField && 'value' in titleField && typeof titleField.value === 'string'
        ? titleField.value
        : null;
    const localId =
      localIdField && 'value' in localIdField && typeof localIdField.value === 'string'
        ? localIdField.value
        : null;
    const tags = parseTagsField(
      tagsField && 'value' in tagsField ? tagsField.value : undefined
    );
    const collectionIds = parseTagsField(
      collectionIdsField && 'value' in collectionIdsField ? collectionIdsField.value : undefined
    );

    if (localId) {
      const existing = await options.db
        .select()
        .from(schema.libraryItems)
        .where(and(eq(schema.libraryItems.userId, user.id), eq(schema.libraryItems.localId, localId)))
        .limit(1);
      const found = existing[0];
      if (found) {
        const response: CreateLibraryItemResponse = {
          id: found.id,
          localId: found.localId,
          createdAt: found.createdAt.toISOString(),
        };
        return reply.code(200).send(response);
      }
    }

    const storageKey = `library/${user.id}/${localId ?? crypto.randomUUID()}`;
    await options.storage.uploadObject(storageKey, buffer, mimeType);

    const workspaceId = getActiveWorkspaceId(request);
    if (workspaceId) {
      const role = await resolveMembership(options.db, workspaceId, user.id);
      if (!role) {
        return reply.code(403).send({ error: 'Forbidden' });
      }
    }

    const [item] = await options.db
      .insert(schema.libraryItems)
      .values({
        userId: user.id,
        workspaceId: workspaceId ?? null,
        storageKey,
        mimeType,
        byteSize: buffer.byteLength,
        ocrText,
        title,
        tags,
        localId,
      })
      .returning();

    if (!item) {
      return reply.code(500).send({ error: 'Failed to create library item' });
    }

    if (collectionIds.length > 0) {
      await options.db.insert(schema.libraryItemCollections).values(
        collectionIds.map((collectionId) => ({
          libraryItemId: item.id,
          collectionId,
        }))
      );
    }

    const response: CreateLibraryItemResponse = {
      id: item.id,
      localId: item.localId,
      createdAt: item.createdAt.toISOString(),
    };

    return reply.code(201).send(response);
  });

  app.get('/v1/library', { preHandler: authenticateRequest }, async (request, reply) => {
    const authUser = request.authUser;
    if (!authUser) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const user = await upsertAuthUser(options.db, authUser.auth0Sub, authUser.email);
    const query = request.query as { q?: string; tag?: string; collection?: string };
    const workspaceId = getActiveWorkspaceId(request);

    const conditions = [];

    if (workspaceId) {
      const role = await resolveMembership(options.db, workspaceId, user.id);
      if (!role) {
        return reply.code(403).send({ error: 'Forbidden' });
      }
      conditions.push(eq(schema.libraryItems.workspaceId, workspaceId));
    } else {
      conditions.push(eq(schema.libraryItems.userId, user.id));
    }

    if (query.q?.trim()) {
      conditions.push(
        sql`to_tsvector('english', coalesce(${schema.libraryItems.ocrText}, '')) @@ plainto_tsquery('english', ${query.q.trim()})`
      );
    }

    if (query.tag?.trim()) {
      conditions.push(sql`${schema.libraryItems.tags} @> ${JSON.stringify([query.tag.trim()])}::jsonb`);
    }

    if (query.collection?.trim()) {
      const rows = await options.db
        .select({ libraryItemId: schema.libraryItemCollections.libraryItemId })
        .from(schema.libraryItemCollections)
        .where(eq(schema.libraryItemCollections.collectionId, query.collection.trim()));
      const ids = rows.map((row) => row.libraryItemId);
      if (ids.length === 0) {
        const empty: LibrarySearchResponse = { items: [], total: 0 };
        return reply.send(empty);
      }
      conditions.push(sql`${schema.libraryItems.id} = ANY(${ids})`);
    }

    const items = await options.db
      .select()
      .from(schema.libraryItems)
      .where(and(...conditions))
      .orderBy(desc(schema.libraryItems.createdAt))
      .limit(50);

    const responseItems = await Promise.all(
      items.map((item) => toLibraryItemResponse(options.db, options.storage, item))
    );

    const response: LibrarySearchResponse = {
      items: responseItems,
      total: responseItems.length,
    };

    return reply.send(response);
  });

  app.get('/v1/library/:id', { preHandler: authenticateRequest }, async (request, reply) => {
    const authUser = request.authUser;
    if (!authUser) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const user = await upsertAuthUser(options.db, authUser.auth0Sub, authUser.email);
    const { id } = request.params as { id: string };

    const rows = await options.db
      .select()
      .from(schema.libraryItems)
      .where(eq(schema.libraryItems.id, id))
      .limit(1);
    const item = rows[0];

    if (!item) {
      return reply.code(404).send({ error: 'Library item not found' });
    }

    if (item.userId !== user.id) {
      if (!item.workspaceId) {
        return reply.code(404).send({ error: 'Library item not found' });
      }
      const role = await resolveMembership(options.db, item.workspaceId, user.id);
      if (!role) {
        return reply.code(404).send({ error: 'Library item not found' });
      }
    }

    return reply.send(await toLibraryItemResponse(options.db, options.storage, item));
  });

  app.patch('/v1/library/:id', { preHandler: authenticateRequest }, async (request, reply) => {
    const authUser = request.authUser;
    if (!authUser) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const user = await upsertAuthUser(options.db, authUser.auth0Sub, authUser.email);
    const { id } = request.params as { id: string };
    const body = request.body as { tags?: string[]; title?: string; collectionIds?: string[] };

    const rows = await options.db
      .select()
      .from(schema.libraryItems)
      .where(and(eq(schema.libraryItems.id, id), eq(schema.libraryItems.userId, user.id)))
      .limit(1);
    const item = rows[0];

    if (!item) {
      return reply.code(404).send({ error: 'Library item not found' });
    }

    const updates: Partial<typeof schema.libraryItems.$inferInsert> = {};
    if (body.tags) {
      updates.tags = body.tags;
    }
    if (body.title !== undefined) {
      updates.title = body.title;
    }

    if (Object.keys(updates).length > 0) {
      await options.db.update(schema.libraryItems).set(updates).where(eq(schema.libraryItems.id, id));
    }

    if (body.collectionIds) {
      await options.db
        .delete(schema.libraryItemCollections)
        .where(eq(schema.libraryItemCollections.libraryItemId, id));
      if (body.collectionIds.length > 0) {
        await options.db.insert(schema.libraryItemCollections).values(
          body.collectionIds.map((collectionId) => ({
            libraryItemId: id,
            collectionId,
          }))
        );
      }
    }

    const updated = await options.db
      .select()
      .from(schema.libraryItems)
      .where(eq(schema.libraryItems.id, id))
      .limit(1);

    const next = updated[0];
    if (!next) {
      return reply.code(404).send({ error: 'Library item not found' });
    }

    return reply.send(await toLibraryItemResponse(options.db, options.storage, next));
  });
}
