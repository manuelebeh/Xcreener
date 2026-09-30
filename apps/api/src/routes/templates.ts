import {
  createTemplateSubmissionSchema,
  moderateTemplateSchema,
  slugifyTemplateTitle,
  type TemplateListingResponse,
  type TemplateListResponse,
} from '@snapglow/marketplace-core';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import * as schema from '../db/schema';
import { env } from '../env';
import { authenticateRequest, upsertAuthUser } from '../plugins/auth';

interface TemplateRouteOptions {
  db: PostgresJsDatabase<typeof schema>;
}

function getModeratorSubs(): Set<string> {
  const raw = env.MARKETPLACE_MODERATOR_SUBS;
  if (!raw.trim()) {
    return new Set();
  }
  return new Set(
    raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function isModerator(auth0Sub: string): boolean {
  return getModeratorSubs().has(auth0Sub);
}

async function toTemplateResponse(
  db: PostgresJsDatabase<typeof schema>,
  listing: schema.TemplateListing
): Promise<TemplateListingResponse> {
  const authorRows = await db
    .select({ email: schema.users.email })
    .from(schema.users)
    .where(eq(schema.users.id, listing.authorId))
    .limit(1);

  return {
    id: listing.id,
    slug: listing.slug,
    title: listing.title,
    description: listing.description,
    authorId: listing.authorId,
    authorEmail: authorRows[0]?.email ?? null,
    status: listing.status,
    style: listing.style,
    tags: listing.tags ?? [],
    previewUrl: listing.previewUrl,
    downloadCount: listing.downloadCount,
    featured: listing.featured,
    createdAt: listing.createdAt.toISOString(),
    updatedAt: listing.updatedAt.toISOString(),
  };
}

async function ensureUniqueSlug(
  db: PostgresJsDatabase<typeof schema>,
  baseSlug: string
): Promise<string> {
  let slug = baseSlug;
  let attempt = 0;
  while (attempt < 5) {
    const existing = await db
      .select({ id: schema.templateListings.id })
      .from(schema.templateListings)
      .where(eq(schema.templateListings.slug, slug))
      .limit(1);
    if (!existing[0]) {
      return slug;
    }
    slug = `${baseSlug}-${nanoid(6).toLowerCase()}`;
    attempt += 1;
  }
  return `${baseSlug}-${Date.now()}`;
}

export async function registerTemplateRoutes(app: FastifyInstance, options: TemplateRouteOptions) {
  app.get('/v1/templates', async (request, reply) => {
    const query = request.query as {
      tag?: string;
      featured?: string;
      limit?: string;
      offset?: string;
    };
    const limit = Math.min(Number.parseInt(query.limit ?? '24', 10) || 24, 100);
    const offset = Number.parseInt(query.offset ?? '0', 10) || 0;

    const conditions = [eq(schema.templateListings.status, 'approved')];
    if (query.featured === 'true') {
      conditions.push(eq(schema.templateListings.featured, true));
    }
    if (query.tag?.trim()) {
      conditions.push(
        sql`${schema.templateListings.tags} @> ${JSON.stringify([query.tag.trim()])}::jsonb`
      );
    }

    const whereClause = conditions.length === 1 ? conditions[0]! : and(...conditions);

    const rows = await options.db
      .select()
      .from(schema.templateListings)
      .where(whereClause)
      .orderBy(desc(schema.templateListings.featured), desc(schema.templateListings.downloadCount))
      .limit(limit)
      .offset(offset);

    const countRows = await options.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.templateListings)
      .where(whereClause);

    const items = await Promise.all(rows.map((row) => toTemplateResponse(options.db, row)));
    const response: TemplateListResponse = {
      items,
      total: countRows[0]?.count ?? items.length,
    };

    return reply.send(response);
  });

  app.get('/v1/templates/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };

    const rows = await options.db
      .select()
      .from(schema.templateListings)
      .where(
        and(eq(schema.templateListings.slug, slug), eq(schema.templateListings.status, 'approved'))
      )
      .limit(1);
    const listing = rows[0];

    if (!listing) {
      return reply.code(404).send({ error: 'Template not found' });
    }

    await options.db
      .update(schema.templateListings)
      .set({ downloadCount: listing.downloadCount + 1 })
      .where(eq(schema.templateListings.id, listing.id));

    return reply.send(
      await toTemplateResponse(options.db, { ...listing, downloadCount: listing.downloadCount + 1 })
    );
  });

  app.post('/v1/templates', { preHandler: authenticateRequest }, async (request, reply) => {
    const authUser = request.authUser;
    if (!authUser) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const parsed = createTemplateSubmissionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid submission', details: parsed.error.flatten() });
    }

    const user = await upsertAuthUser(options.db, authUser.auth0Sub, authUser.email);
    const baseSlug =
      slugifyTemplateTitle(parsed.data.title) || `template-${nanoid(8).toLowerCase()}`;
    const slug = await ensureUniqueSlug(options.db, baseSlug);

    const inserted = await options.db
      .insert(schema.templateListings)
      .values({
        slug,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        authorId: user.id,
        status: 'pending',
        style: parsed.data.style,
        tags: parsed.data.tags,
        previewUrl: parsed.data.previewUrl ?? null,
      })
      .returning();

    const listing = inserted[0];
    if (!listing) {
      return reply.code(500).send({ error: 'Failed to create template' });
    }

    return reply.code(201).send(await toTemplateResponse(options.db, listing));
  });

  app.patch(
    '/v1/templates/:id/moderate',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const authUser = request.authUser;
      if (!authUser) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      if (!isModerator(authUser.auth0Sub)) {
        return reply.code(403).send({ error: 'Moderator access required' });
      }

      const { id } = request.params as { id: string };
      const parsed = moderateTemplateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid moderation payload' });
      }

      const rows = await options.db
        .select()
        .from(schema.templateListings)
        .where(eq(schema.templateListings.id, id))
        .limit(1);
      const listing = rows[0];
      if (!listing) {
        return reply.code(404).send({ error: 'Template not found' });
      }

      const updated = await options.db
        .update(schema.templateListings)
        .set({
          status: parsed.data.status,
          featured: parsed.data.featured ?? listing.featured,
          rejectionReason: parsed.data.rejectionReason ?? null,
          updatedAt: new Date(),
        })
        .where(eq(schema.templateListings.id, id))
        .returning();

      const result = updated[0];
      if (!result) {
        return reply.code(500).send({ error: 'Failed to update template' });
      }

      return reply.send(await toTemplateResponse(options.db, result));
    }
  );

  app.get(
    '/v1/templates/admin/pending',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const authUser = request.authUser;
      if (!authUser) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      if (!isModerator(authUser.auth0Sub)) {
        return reply.code(403).send({ error: 'Moderator access required' });
      }

      const rows = await options.db
        .select()
        .from(schema.templateListings)
        .where(eq(schema.templateListings.status, 'pending'))
        .orderBy(desc(schema.templateListings.createdAt));

      const items = await Promise.all(rows.map((row) => toTemplateResponse(options.db, row)));
      return reply.send({ items, total: items.length });
    }
  );
}
