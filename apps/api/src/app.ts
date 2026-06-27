import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import sensible from '@fastify/sensible';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import Fastify from 'fastify';
import type * as schema from './db/schema';
import { registerHealthRoutes } from './routes/health';
import { registerShareRoutes } from './routes/shares';
import { StorageService } from './services/storage';

interface BuildAppOptions {
  db: PostgresJsDatabase<typeof schema>;
  storage?: StorageService;
}

export async function buildApp(options: BuildAppOptions) {
  const app = Fastify({
    logger: true,
    bodyLimit: 100 * 1024 * 1024,
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });
  await app.register(sensible);
  await app.register(multipart, {
    limits: {
      fileSize: 100 * 1024 * 1024,
    },
  });

  const storage = options.storage ?? new StorageService();
  await storage.ensureBucket();

  await registerHealthRoutes(app, { db: options.db });
  await registerShareRoutes(app, { db: options.db, storage });

  return app;
}
