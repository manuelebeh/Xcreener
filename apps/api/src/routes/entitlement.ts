import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { FastifyInstance } from 'fastify';
import type * as schema from '../db/schema';
import { authenticateRequest, upsertAuthUser } from '../plugins/auth';
import { bestPlanForUser, signEntitlement } from '../services/entitlement';

interface EntitlementRouteOptions {
  db: PostgresJsDatabase<typeof schema>;
}

export async function registerEntitlementRoutes(
  app: FastifyInstance,
  options: EntitlementRouteOptions
) {
  app.get('/v1/me/entitlement', { preHandler: authenticateRequest }, async (request, reply) => {
    const authUser = request.authUser;
    if (!authUser) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const user = await upsertAuthUser(options.db, authUser.auth0Sub, authUser.email);
    const plan = await bestPlanForUser(options.db, user.id);
    const token = await signEntitlement({ userId: user.id, plan });
    if (!token) {
      return reply.code(503).send({ error: 'Entitlements are not configured' });
    }

    return reply.send({ token, plan });
  });
}
