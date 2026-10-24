import { collabDocumentStateSchema } from '@snapglow/api-core';
import {
  ALLOWED_SHARE_MIME_TYPES,
  maxBytesForMime,
  type ShareMimeType,
} from '@snapglow/cloud-core';
import {
  buildCollabUrl,
  type CollabDocumentResponse,
  type CollabDocumentState,
  type CommentResponse,
  type CreateCollabDocumentResponse,
  defaultCollabDocumentState,
  type NotificationResponse,
  parseMentionEmails,
} from '@snapglow/collab-core';
import { can, isPaidPlan, type WorkspaceRole } from '@snapglow/team-core';
import { and, desc, eq, isNull } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as schema from '../db/schema';
import { env } from '../env';
import { allowOrReply } from '../lib/rate-limit';
import { authenticateRequest, upsertAuthUser } from '../plugins/auth';
import { getActiveWorkspaceId, resolveMembership } from '../plugins/workspace-auth';
import { applyAnnotationOp } from '../services/collab-ops';
import { collabRoomHub } from '../services/collab-room';
import {
  notifyDocumentParticipants,
  sendCommentNotificationEmails,
} from '../services/notifications';
import type { StorageService } from '../services/storage';

interface CollabRouteOptions {
  db: PostgresJsDatabase<typeof schema>;
  storage: StorageService;
}

const commentBodySchema = z.string().trim().min(1).max(5000);

const commentCreateSchema = z.object({
  body: commentBodySchema,
  parentId: z.string().uuid().nullish(),
  anchor: z.object({ x: z.number().finite(), y: z.number().finite() }).nullish(),
});

const commentUpdateSchema = z.object({ body: commentBodySchema });

const documentTitleSchema = z.string().max(200).nullable();

const documentPatchSchema = z.object({
  documentState: collabDocumentStateSchema.optional(),
  title: documentTitleSchema.optional(),
  /** When sent, the snapshot is refused (409) if another write landed since the client read it. */
  expectedVersion: z.number().int().min(0).optional(),
});

const linkLibrarySchema = z.object({ libraryItemId: z.string().uuid() });

/** Same bounds as the WebSocket and public API paths (2026-10-24 audit, FINDING-004). */
function parseDocumentState(value: unknown): CollabDocumentState | null {
  const parsed = collabDocumentStateSchema.safeParse(value);
  return parsed.success ? (parsed.data as unknown as CollabDocumentState) : null;
}

function isAllowedMimeType(value: string): value is ShareMimeType {
  return (ALLOWED_SHARE_MIME_TYPES as readonly string[]).includes(value);
}

async function toDocumentResponse(
  _db: PostgresJsDatabase<typeof schema>,
  storage: StorageService,
  doc: schema.CollabDocument
): Promise<CollabDocumentResponse> {
  return {
    id: doc.id,
    workspaceId: doc.workspaceId,
    libraryItemId: doc.libraryItemId,
    title: doc.title,
    createdBy: doc.createdBy,
    documentState: doc.documentState,
    version: doc.version,
    screenshotUrl: await storage.getPresignedUrl(doc.screenshotStorageKey),
    collabUrl: buildCollabUrl(env.WEB_PUBLIC_URL, doc.id),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

async function toCommentResponse(
  db: PostgresJsDatabase<typeof schema>,
  comment: schema.Comment
): Promise<CommentResponse> {
  const users = await db
    .select({ email: schema.users.email })
    .from(schema.users)
    .where(eq(schema.users.id, comment.userId))
    .limit(1);

  return {
    id: comment.id,
    documentId: comment.documentId,
    userId: comment.userId,
    userEmail: users[0]?.email ?? null,
    parentId: comment.parentId,
    body: comment.body,
    anchor: comment.anchor ?? null,
    mentionUserIds: comment.mentionUserIds ?? [],
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  };
}

async function resolveDocumentAccess(
  db: PostgresJsDatabase<typeof schema>,
  documentId: string,
  userId: string
): Promise<{ doc: schema.CollabDocument; role: WorkspaceRole } | null> {
  const rows = await db
    .select()
    .from(schema.collabDocuments)
    .where(eq(schema.collabDocuments.id, documentId))
    .limit(1);
  const doc = rows[0];
  if (!doc) {
    return null;
  }

  const role = await resolveMembership(db, doc.workspaceId, userId);
  if (!role || !can(role, 'collab:read')) {
    return null;
  }

  return { doc, role };
}

async function ensurePaidWorkspace(
  db: PostgresJsDatabase<typeof schema>,
  workspaceId: string
): Promise<boolean> {
  const rows = await db
    .select({ plan: schema.workspaces.plan })
    .from(schema.workspaces)
    .where(eq(schema.workspaces.id, workspaceId))
    .limit(1);
  const plan = rows[0]?.plan;
  return plan ? isPaidPlan(plan) : false;
}

async function resolveMentionUserIds(
  db: PostgresJsDatabase<typeof schema>,
  workspaceId: string,
  body: string
): Promise<string[]> {
  const emails = parseMentionEmails(body);
  if (emails.length === 0) {
    return [];
  }

  const members = await db
    .select({ userId: schema.workspaceMembers.userId, email: schema.users.email })
    .from(schema.workspaceMembers)
    .innerJoin(schema.users, eq(schema.workspaceMembers.userId, schema.users.id))
    .where(eq(schema.workspaceMembers.workspaceId, workspaceId));

  const ids = new Set<string>();
  for (const member of members) {
    if (member.email && emails.includes(member.email.toLowerCase())) {
      ids.add(member.userId);
    }
  }
  return [...ids];
}

export async function registerCollabRoutes(app: FastifyInstance, options: CollabRouteOptions) {
  app.post('/v1/collab/documents', { preHandler: authenticateRequest }, async (request, reply) => {
    const authUser = request.authUser;
    if (!authUser) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const workspaceId = getActiveWorkspaceId(request);
    if (!workspaceId) {
      return reply.code(400).send({ error: 'Missing X-Workspace-Id header' });
    }

    const user = await upsertAuthUser(options.db, authUser.auth0Sub, authUser.email);
    const role = await resolveMembership(options.db, workspaceId, user.id);
    if (!role || !can(role, 'collab:edit')) {
      return reply.code(403).send({ error: 'Forbidden' });
    }
    if (!(await allowOrReply(reply, 'collab-create', user.id, 60, 3600))) {
      return reply;
    }

    if (!(await ensurePaidWorkspace(options.db, workspaceId))) {
      return reply.code(402).send({ error: 'Collaboration requires a paid team plan' });
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
    if (buffer.byteLength > maxBytesForMime(mimeType)) {
      return reply.code(413).send({ error: 'File too large' });
    }
    const titleField = multipart.fields.title;
    const stateField = multipart.fields.documentState;
    const widthField = multipart.fields.screenshotWidth;
    const heightField = multipart.fields.screenshotHeight;

    const parsedTitle = documentTitleSchema.safeParse(
      titleField && 'value' in titleField && typeof titleField.value === 'string'
        ? titleField.value
        : null
    );
    if (!parsedTitle.success) {
      return reply.code(400).send({ error: 'Invalid title' });
    }
    const title = parsedTitle.data;

    let rawState: unknown = defaultCollabDocumentState(800, 600);
    if (stateField && 'value' in stateField && typeof stateField.value === 'string') {
      try {
        rawState = JSON.parse(stateField.value);
      } catch {
        return reply.code(400).send({ error: 'Invalid documentState JSON' });
      }
    }

    if (rawState && typeof rawState === 'object') {
      const state = rawState as Partial<CollabDocumentState>;
      if (widthField && 'value' in widthField && typeof widthField.value === 'string') {
        state.screenshotWidth = Number(widthField.value) || state.screenshotWidth;
      }
      if (heightField && 'value' in heightField && typeof heightField.value === 'string') {
        state.screenshotHeight = Number(heightField.value) || state.screenshotHeight;
      }
    }

    const documentState = parseDocumentState(rawState);
    if (!documentState) {
      return reply.code(400).send({ error: 'Invalid documentState' });
    }

    const storageKey = `collab/${workspaceId}/${crypto.randomUUID()}`;
    await options.storage.uploadObject(storageKey, buffer, mimeType);

    const [doc] = await options.db
      .insert(schema.collabDocuments)
      .values({
        workspaceId,
        createdBy: user.id,
        title,
        screenshotStorageKey: storageKey,
        screenshotMimeType: mimeType,
        screenshotByteSize: buffer.byteLength,
        documentState,
        version: 0,
      })
      .returning();

    if (!doc) {
      return reply.code(500).send({ error: 'Failed to create collab document' });
    }

    const response: CreateCollabDocumentResponse = {
      id: doc.id,
      collabUrl: buildCollabUrl(env.WEB_PUBLIC_URL, doc.id),
      createdAt: doc.createdAt.toISOString(),
    };

    return reply.code(201).send(response);
  });

  app.get(
    '/v1/collab/documents/:id',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const authUser = request.authUser;
      if (!authUser) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const user = await upsertAuthUser(options.db, authUser.auth0Sub, authUser.email);
      const { id } = request.params as { id: string };
      const access = await resolveDocumentAccess(options.db, id, user.id);
      if (!access) {
        return reply.code(404).send({ error: 'Document not found' });
      }

      return reply.send(await toDocumentResponse(options.db, options.storage, access.doc));
    }
  );

  app.patch(
    '/v1/collab/documents/:id',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const authUser = request.authUser;
      if (!authUser) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const user = await upsertAuthUser(options.db, authUser.auth0Sub, authUser.email);
      const { id } = request.params as { id: string };
      const access = await resolveDocumentAccess(options.db, id, user.id);
      if (!access) {
        return reply.code(404).send({ error: 'Document not found' });
      }
      if (!can(access.role, 'collab:edit')) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      const parsed = documentPatchSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid request body' });
      }
      const body = parsed.data;

      // Same lock as the WebSocket op path, so a snapshot and a concurrent op cannot both
      // write version N + 1.
      const result = await options.db.transaction(async (tx) => {
        const [current] = await tx
          .select()
          .from(schema.collabDocuments)
          .where(eq(schema.collabDocuments.id, id))
          .limit(1)
          .for('update');
        if (!current) {
          return { status: 404 as const };
        }
        if (body.expectedVersion !== undefined && body.expectedVersion !== current.version) {
          return { status: 409 as const, version: current.version };
        }

        const updates: Partial<typeof schema.collabDocuments.$inferInsert> = {
          updatedAt: new Date(),
        };
        if (body.title !== undefined) {
          updates.title = body.title;
        }
        if (body.documentState) {
          updates.documentState = body.documentState as unknown as CollabDocumentState;
          updates.version = current.version + 1;
        }

        const [row] = await tx
          .update(schema.collabDocuments)
          .set(updates)
          .where(eq(schema.collabDocuments.id, id))
          .returning();
        return { status: 200 as const, row };
      });

      if (result.status === 409) {
        return reply.code(409).send({ error: 'Document changed', version: result.version });
      }
      const updated = result.status === 200 ? result.row : undefined;
      if (!updated) {
        return reply.code(404).send({ error: 'Document not found' });
      }

      return reply.send(await toDocumentResponse(options.db, options.storage, updated));
    }
  );

  app.post(
    '/v1/collab/documents/:id/link-library',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const authUser = request.authUser;
      if (!authUser) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const user = await upsertAuthUser(options.db, authUser.auth0Sub, authUser.email);
      const { id } = request.params as { id: string };
      const parsedBody = linkLibrarySchema.safeParse(request.body);
      if (!parsedBody.success) {
        return reply.code(400).send({ error: 'Invalid request body' });
      }
      const body = parsedBody.data;
      const access = await resolveDocumentAccess(options.db, id, user.id);
      if (!access) {
        return reply.code(404).send({ error: 'Document not found' });
      }
      if (!can(access.role, 'collab:edit')) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      const items = await options.db
        .select()
        .from(schema.libraryItems)
        .where(eq(schema.libraryItems.id, body.libraryItemId))
        .limit(1);
      const item = items[0];
      if (!item || item.workspaceId !== access.doc.workspaceId) {
        return reply.code(400).send({ error: 'Invalid library item for workspace' });
      }

      const [updated] = await options.db
        .update(schema.collabDocuments)
        .set({ libraryItemId: body.libraryItemId, updatedAt: new Date() })
        .where(eq(schema.collabDocuments.id, id))
        .returning();

      if (!updated) {
        return reply.code(404).send({ error: 'Document not found' });
      }

      return reply.send(await toDocumentResponse(options.db, options.storage, updated));
    }
  );

  app.get(
    '/v1/collab/documents/:id/comments',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const authUser = request.authUser;
      if (!authUser) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const user = await upsertAuthUser(options.db, authUser.auth0Sub, authUser.email);
      const { id } = request.params as { id: string };
      const access = await resolveDocumentAccess(options.db, id, user.id);
      if (!access) {
        return reply.code(404).send({ error: 'Document not found' });
      }

      const rows = await options.db
        .select()
        .from(schema.comments)
        .where(and(eq(schema.comments.documentId, id), isNull(schema.comments.deletedAt)))
        .orderBy(desc(schema.comments.createdAt));

      const comments = await Promise.all(rows.map((row) => toCommentResponse(options.db, row)));
      return reply.send({ comments });
    }
  );

  app.post(
    '/v1/collab/documents/:id/comments',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const authUser = request.authUser;
      if (!authUser) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const user = await upsertAuthUser(options.db, authUser.auth0Sub, authUser.email);
      const { id } = request.params as { id: string };
      const parsedBody = commentCreateSchema.safeParse(request.body);
      if (!parsedBody.success) {
        return reply.code(400).send({ error: 'Invalid comment' });
      }
      const body = parsedBody.data;

      const access = await resolveDocumentAccess(options.db, id, user.id);
      if (!access) {
        return reply.code(404).send({ error: 'Document not found' });
      }
      if (!can(access.role, 'comments:create')) {
        return reply.code(403).send({ error: 'Forbidden' });
      }
      if (!(await allowOrReply(reply, 'comment', user.id, 60, 60))) {
        return reply;
      }
      if (body.parentId) {
        const parents = await options.db
          .select({ id: schema.comments.id })
          .from(schema.comments)
          .where(and(eq(schema.comments.id, body.parentId), eq(schema.comments.documentId, id)))
          .limit(1);
        if (!parents[0]) {
          return reply.code(400).send({ error: 'Invalid parent comment' });
        }
      }

      const mentionUserIds = await resolveMentionUserIds(
        options.db,
        access.doc.workspaceId,
        body.body
      );

      const [comment] = await options.db
        .insert(schema.comments)
        .values({
          documentId: id,
          userId: user.id,
          parentId: body.parentId ?? null,
          body: body.body,
          anchor: body.anchor ?? null,
          mentionUserIds,
        })
        .returning();

      if (!comment) {
        return reply.code(500).send({ error: 'Failed to create comment' });
      }

      const response = await toCommentResponse(options.db, comment);
      await collabRoomHub.publish(id, { type: 'comment:created', comment: response });

      const collabUrl = buildCollabUrl(env.WEB_PUBLIC_URL, id);
      await notifyDocumentParticipants(options.db, {
        documentId: id,
        workspaceId: access.doc.workspaceId,
        actorUserId: user.id,
        type: mentionUserIds.length > 0 ? 'mention' : 'comment',
        payload: {
          documentId: id,
          commentId: comment.id,
          title: access.doc.title ?? 'Collaboration',
          collabUrl,
          body: body.body,
        },
        mentionUserIds,
      });

      await sendCommentNotificationEmails(options.db, {
        mentionUserIds,
        actorEmail: user.email,
        documentTitle: access.doc.title ?? 'Collaboration',
        collabUrl,
        body: body.body,
      });

      return reply.code(201).send(response);
    }
  );

  app.patch(
    '/v1/collab/documents/:id/comments/:commentId',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const authUser = request.authUser;
      if (!authUser) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const user = await upsertAuthUser(options.db, authUser.auth0Sub, authUser.email);
      const { id, commentId } = request.params as { id: string; commentId: string };
      const parsedBody = commentUpdateSchema.safeParse(request.body);
      if (!parsedBody.success) {
        return reply.code(400).send({ error: 'Invalid comment' });
      }
      const body = parsedBody.data;

      const access = await resolveDocumentAccess(options.db, id, user.id);
      if (!access) {
        return reply.code(404).send({ error: 'Document not found' });
      }

      const rows = await options.db
        .select()
        .from(schema.comments)
        .where(and(eq(schema.comments.id, commentId), eq(schema.comments.documentId, id)))
        .limit(1);
      const existing = rows[0];
      if (!existing || existing.deletedAt) {
        return reply.code(404).send({ error: 'Comment not found' });
      }
      if (existing.userId !== user.id && access.role !== 'admin') {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      const mentionUserIds = await resolveMentionUserIds(
        options.db,
        access.doc.workspaceId,
        body.body
      );

      const [updated] = await options.db
        .update(schema.comments)
        .set({ body: body.body, mentionUserIds, updatedAt: new Date() })
        .where(eq(schema.comments.id, commentId))
        .returning();

      if (!updated) {
        return reply.code(404).send({ error: 'Comment not found' });
      }

      const response = await toCommentResponse(options.db, updated);
      await collabRoomHub.publish(id, { type: 'comment:updated', comment: response });
      return reply.send(response);
    }
  );

  app.delete(
    '/v1/collab/documents/:id/comments/:commentId',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const authUser = request.authUser;
      if (!authUser) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const user = await upsertAuthUser(options.db, authUser.auth0Sub, authUser.email);
      const { id, commentId } = request.params as { id: string; commentId: string };
      const access = await resolveDocumentAccess(options.db, id, user.id);
      if (!access) {
        return reply.code(404).send({ error: 'Document not found' });
      }

      const rows = await options.db
        .select()
        .from(schema.comments)
        .where(and(eq(schema.comments.id, commentId), eq(schema.comments.documentId, id)))
        .limit(1);
      const existing = rows[0];
      if (!existing || existing.deletedAt) {
        return reply.code(404).send({ error: 'Comment not found' });
      }
      if (existing.userId !== user.id && access.role !== 'admin') {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      await options.db
        .update(schema.comments)
        .set({ deletedAt: new Date() })
        .where(eq(schema.comments.id, commentId));

      await collabRoomHub.publish(id, { type: 'comment:deleted', commentId });
      return reply.code(204).send();
    }
  );

  app.get('/v1/notifications', { preHandler: authenticateRequest }, async (request, reply) => {
    const authUser = request.authUser;
    if (!authUser) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const user = await upsertAuthUser(options.db, authUser.auth0Sub, authUser.email);
    const rows = await options.db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.userId, user.id))
      .orderBy(desc(schema.notifications.createdAt))
      .limit(50);

    const notifications: NotificationResponse[] = rows.map((row) => ({
      id: row.id,
      type: row.type,
      payload: row.payload ?? {},
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    }));

    return reply.send({ notifications });
  });

  app.patch(
    '/v1/notifications/:id/read',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const authUser = request.authUser;
      if (!authUser) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const user = await upsertAuthUser(options.db, authUser.auth0Sub, authUser.email);
      const { id } = request.params as { id: string };

      const [updated] = await options.db
        .update(schema.notifications)
        .set({ readAt: new Date() })
        .where(and(eq(schema.notifications.id, id), eq(schema.notifications.userId, user.id)))
        .returning();

      if (!updated) {
        return reply.code(404).send({ error: 'Notification not found' });
      }

      const response: NotificationResponse = {
        id: updated.id,
        type: updated.type,
        payload: updated.payload ?? {},
        readAt: updated.readAt?.toISOString() ?? null,
        createdAt: updated.createdAt.toISOString(),
      };

      return reply.send(response);
    }
  );

  app.post(
    '/v1/notifications/read-all',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const authUser = request.authUser;
      if (!authUser) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const user = await upsertAuthUser(options.db, authUser.auth0Sub, authUser.email);
      await options.db
        .update(schema.notifications)
        .set({ readAt: new Date() })
        .where(and(eq(schema.notifications.userId, user.id), isNull(schema.notifications.readAt)));

      return reply.code(204).send();
    }
  );
}

export { applyAnnotationOp, ensurePaidWorkspace, resolveDocumentAccess };
