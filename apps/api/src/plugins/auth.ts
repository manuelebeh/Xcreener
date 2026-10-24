import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import * as schema from '../db/schema';
import { env } from '../env';

export interface AuthUser {
  id: string;
  auth0Sub: string;
  email: string | null;
  auth0OrgId: string | null;
}

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: AuthUser;
    auth0OrgId?: string | null;
  }
}

const jwks = createRemoteJWKSet(new URL(`https://${env.AUTH0_DOMAIN}/.well-known/jwks.json`));

export async function authenticateRequest(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    await reply.code(401).send({ error: 'Unauthorized' });
    return;
  }

  const token = header.slice('Bearer '.length);

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `https://${env.AUTH0_DOMAIN}/`,
      audience: env.AUTH0_AUDIENCE,
    });

    const auth0Sub = payload.sub;
    if (!auth0Sub) {
      await reply.code(401).send({ error: 'Unauthorized' });
      return;
    }

    // Invitations match on email, so only an address Auth0 says is verified counts.
    // The post-login Action must add `email_verified` next to `email` (docs/guides/auth0-setup.md).
    const email =
      typeof payload.email === 'string' && payload.email_verified === true ? payload.email : null;
    const auth0OrgId =
      typeof payload.org_id === 'string'
        ? payload.org_id
        : typeof (payload as { orgId?: string }).orgId === 'string'
          ? ((payload as { orgId?: string }).orgId ?? null)
          : null;

    request.authUser = { id: '', auth0Sub, email, auth0OrgId };
    request.auth0OrgId = auth0OrgId;
  } catch {
    await reply.code(401).send({ error: 'Unauthorized' });
  }
}

export async function upsertAuthUser(
  db: PostgresJsDatabase<typeof schema>,
  auth0Sub: string,
  email: string | null
): Promise<AuthUser> {
  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.auth0Sub, auth0Sub))
    .limit(1);
  const user = existing[0];

  if (user) {
    if (email && user.email !== email) {
      const [updated] = await db
        .update(schema.users)
        .set({ email })
        .where(eq(schema.users.id, user.id))
        .returning();
      return {
        id: updated?.id ?? user.id,
        auth0Sub,
        email: updated?.email ?? email,
        auth0OrgId: null,
      };
    }

    return {
      id: user.id,
      auth0Sub: user.auth0Sub,
      email: user.email,
      auth0OrgId: null,
    };
  }

  const [created] = await db.insert(schema.users).values({ auth0Sub, email }).returning();

  if (!created) {
    throw new Error('Failed to create user');
  }

  return {
    id: created.id,
    auth0Sub: created.auth0Sub,
    email: created.email,
    auth0OrgId: null,
  };
}
