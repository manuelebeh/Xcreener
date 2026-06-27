import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { FastifyInstance } from 'fastify';
import type * as schema from '../db/schema';
import { pingRedis } from '../services/redis';

interface HealthRouteOptions {
  db: PostgresJsDatabase<typeof schema>;
}

export async function registerHealthRoutes(app: FastifyInstance, options: HealthRouteOptions) {
  app.get('/health', async () => {
    const [dbResult, redisOk] = await Promise.all([
      options.db.execute(sql`select 1 as ok`),
      pingRedis().catch(() => false),
    ]);

    const postgresOk = dbResult.length > 0;
    const ok = postgresOk && redisOk;

    return {
      ok,
      services: {
        postgres: postgresOk,
        redis: redisOk,
      },
    };
  });
}
