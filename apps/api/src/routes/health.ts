import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { FastifyInstance } from 'fastify';
import type * as schema from '../db/schema';
import { pingRedis } from '../services/redis';

interface HealthRouteOptions {
  db: PostgresJsDatabase<typeof schema>;
}

export async function registerHealthRoutes(app: FastifyInstance, options: HealthRouteOptions) {
  app.get('/health', async (_request, reply) => {
    const [postgresOk, redisOk] = await Promise.all([
      options.db
        .execute(sql`select 1 as ok`)
        .then((rows) => rows.length > 0)
        .catch(() => false),
      pingRedis().catch(() => false),
    ]);

    const ok = postgresOk && redisOk;
    // 503 so a load balancer probing the status code takes a degraded instance out of rotation.
    reply.code(ok ? 200 : 503);

    return {
      ok,
      services: {
        postgres: postgresOk,
        redis: redisOk,
      },
    };
  });
}
