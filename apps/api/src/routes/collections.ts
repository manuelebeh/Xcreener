import type { CollectionResponse, CreateCollectionResponse } from '@xcreener/cloud-core';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { FastifyInstance } from 'fastify';
import * as schema from '../db/schema';
import { authenticateRequest, upsertAuthUser } from '../plugins/auth';

interface CollectionRouteOptions {
  db: PostgresJsDatabase<typeof schema>;
}

async function toCollectionResponse(
  db: PostgresJsDatabase<typeof schema>,
  collection: schema.Collection
): Promise<CollectionResponse> {
  const counts = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.libraryItemCollections)
    .where(eq(schema.libraryItemCollections.collectionId, collection.id));

  return {
    id: collection.id,
    name: collection.name,
    createdAt: collection.createdAt.toISOString(),
    itemCount: Number(counts[0]?.count ?? 0),
  };
}

export async function registerCollectionRoutes(
  app: FastifyInstance,
  options: CollectionRouteOptions
) {
  app.get('/v1/collections', { preHandler: authenticateRequest }, async (request, reply) => {
    const authUser = request.authUser;
    if (!authUser) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const user = await upsertAuthUser(options.db, authUser.auth0Sub, authUser.email);
    const rows = await options.db
      .select()
      .from(schema.collections)
      .where(eq(schema.collections.userId, user.id))
      .orderBy(desc(schema.collections.createdAt));

    const items = await Promise.all(rows.map((row) => toCollectionResponse(options.db, row)));
    return reply.send({ items });
  });

  app.post('/v1/collections', { preHandler: authenticateRequest }, async (request, reply) => {
    const authUser = request.authUser;
    if (!authUser) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const user = await upsertAuthUser(options.db, authUser.auth0Sub, authUser.email);
    const body = request.body as { name?: string };
    const name = body?.name?.trim();

    if (!name) {
      return reply.code(400).send({ error: 'Collection name is required' });
    }

    const [collection] = await options.db
      .insert(schema.collections)
      .values({ userId: user.id, name })
      .returning();

    if (!collection) {
      return reply.code(500).send({ error: 'Failed to create collection' });
    }

    const response: CreateCollectionResponse = {
      id: collection.id,
      name: collection.name,
      createdAt: collection.createdAt.toISOString(),
    };

    return reply.code(201).send(response);
  });

  app.patch('/v1/collections/:id', { preHandler: authenticateRequest }, async (request, reply) => {
    const authUser = request.authUser;
    if (!authUser) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const user = await upsertAuthUser(options.db, authUser.auth0Sub, authUser.email);
    const { id } = request.params as { id: string };
    const body = request.body as { name?: string };
    const name = body?.name?.trim();

    if (!name) {
      return reply.code(400).send({ error: 'Collection name is required' });
    }

    const rows = await options.db
      .update(schema.collections)
      .set({ name })
      .where(and(eq(schema.collections.id, id), eq(schema.collections.userId, user.id)))
      .returning();

    const collection = rows[0];
    if (!collection) {
      return reply.code(404).send({ error: 'Collection not found' });
    }

    return reply.send(await toCollectionResponse(options.db, collection));
  });

  app.delete('/v1/collections/:id', { preHandler: authenticateRequest }, async (request, reply) => {
    const authUser = request.authUser;
    if (!authUser) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const user = await upsertAuthUser(options.db, authUser.auth0Sub, authUser.email);
    const { id } = request.params as { id: string };

    const rows = await options.db
      .select()
      .from(schema.collections)
      .where(eq(schema.collections.id, id))
      .limit(1);
    const collection = rows[0];

    if (!collection || collection.userId !== user.id) {
      return reply.code(404).send({ error: 'Collection not found' });
    }

    await options.db.delete(schema.collections).where(eq(schema.collections.id, id));
    return reply.code(204).send();
  });
}
