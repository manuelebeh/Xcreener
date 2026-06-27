import type {
  SettingsPatch,
  SyncLibraryResponse,
  UserSettingsResponse,
} from '@snapglow/sync-core';
import { SYNCABLE_SETTING_KEYS } from '@snapglow/sync-core';
import { and, desc, eq, gt, or, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { FastifyInstance } from 'fastify';
import * as schema from '../db/schema';
import { authenticateRequest, upsertAuthUser } from '../plugins/auth';
import type { StorageService } from '../services/storage';

interface SyncRouteOptions {
  db: PostgresJsDatabase<typeof schema>;
  storage: StorageService;
}

export async function registerSyncRoutes(app: FastifyInstance, options: SyncRouteOptions) {
  app.get('/v1/sync/library', { preHandler: authenticateRequest }, async (request, reply) => {
    const authUser = request.authUser;
    if (!authUser) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const user = await upsertAuthUser(options.db, authUser.auth0Sub, authUser.email);
    const query = request.query as { since?: string };
    const since = query.since ? new Date(query.since) : new Date(0);

    const rows = await options.db
      .select()
      .from(schema.libraryItems)
      .where(
        and(
          eq(schema.libraryItems.userId, user.id),
          or(
            gt(schema.libraryItems.updatedAt, since),
            gt(schema.libraryItems.createdAt, since)
          )
        )
      )
      .orderBy(desc(schema.libraryItems.updatedAt))
      .limit(100);

    const items = await Promise.all(
      rows.map(async (item) => ({
        id: item.id,
        title: item.title,
        mimeType: item.mimeType,
        byteSize: item.byteSize,
        tags: item.tags ?? [],
        localId: item.localId,
        syncVersion: item.syncVersion,
        deletedAt: item.deletedAt?.toISOString() ?? null,
        assetUrl: item.deletedAt ? '' : await options.storage.getPresignedUrl(item.storageKey),
        createdAt: item.createdAt.toISOString(),
        updatedAt: (item.updatedAt ?? item.createdAt).toISOString(),
      }))
    );

    const cursor =
      items[0]?.updatedAt ?? since.toISOString();

    const response: SyncLibraryResponse = { items, cursor };
    return reply.send(response);
  });

  app.delete('/v1/library/:id', { preHandler: authenticateRequest }, async (request, reply) => {
    const authUser = request.authUser;
    if (!authUser) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const user = await upsertAuthUser(options.db, authUser.auth0Sub, authUser.email);
    const { id } = request.params as { id: string };

    const rows = await options.db
      .select()
      .from(schema.libraryItems)
      .where(and(eq(schema.libraryItems.id, id), eq(schema.libraryItems.userId, user.id)))
      .limit(1);
    const item = rows[0];
    if (!item) {
      return reply.code(404).send({ error: 'Library item not found' });
    }

    await options.db
      .update(schema.libraryItems)
      .set({
        deletedAt: new Date(),
        syncVersion: item.syncVersion + 1,
        updatedAt: new Date(),
      })
      .where(eq(schema.libraryItems.id, id));

    return reply.send({ deleted: true });
  });

  app.get('/v1/users/me/settings', { preHandler: authenticateRequest }, async (request, reply) => {
    const authUser = request.authUser;
    if (!authUser) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const user = await upsertAuthUser(options.db, authUser.auth0Sub, authUser.email);
    const query = request.query as { since?: string };
    const since = query.since ? new Date(query.since) : new Date(0);

    const rows = await options.db
      .select()
      .from(schema.userSettings)
      .where(
        and(eq(schema.userSettings.userId, user.id), gt(schema.userSettings.updatedAt, since))
      );

    const settings: SettingsPatch[] = rows.map((row) => ({
      key: row.key,
      value: row.value,
      updatedAt: row.updatedAt.toISOString(),
    }));

    const cursor =
      settings.length > 0
        ? settings.reduce((latest, patch) =>
            new Date(patch.updatedAt) > new Date(latest) ? patch.updatedAt : latest
          , settings[0]!.updatedAt)
        : since.toISOString();

    const response: UserSettingsResponse = { settings, cursor };
    return reply.send(response);
  });

  app.put('/v1/users/me/settings', { preHandler: authenticateRequest }, async (request, reply) => {
    const authUser = request.authUser;
    if (!authUser) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const user = await upsertAuthUser(options.db, authUser.auth0Sub, authUser.email);
    const body = request.body as { settings?: SettingsPatch[] };
    const patches = body.settings ?? [];

    for (const patch of patches) {
      if (!(SYNCABLE_SETTING_KEYS as readonly string[]).includes(patch.key)) {
        continue;
      }

      await options.db
        .insert(schema.userSettings)
        .values({
          userId: user.id,
          key: patch.key,
          value: patch.value,
          updatedAt: new Date(patch.updatedAt),
        })
        .onConflictDoUpdate({
          target: [schema.userSettings.userId, schema.userSettings.key],
          set: {
            value: patch.value,
            updatedAt: new Date(patch.updatedAt),
          },
        });
    }

    return reply.send({ saved: patches.length });
  });
}
