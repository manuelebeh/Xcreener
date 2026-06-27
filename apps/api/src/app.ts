import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import sensible from '@fastify/sensible';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import Fastify from 'fastify';
import type * as schema from './db/schema';
import { registerBillingRoutes } from './routes/billing';
import { registerCollabRoutes } from './routes/collab';
import { registerCollectionRoutes } from './routes/collections';
import { registerHealthRoutes } from './routes/health';
import { registerIntegrationRoutes } from './routes/integrations';
import { registerLibraryRoutes } from './routes/library';
import { registerShareRoutes } from './routes/shares';
import { registerWorkspaceRoutes } from './routes/workspaces';
import { registerStripeRawBodyParser } from './plugins/stripe-webhook';
import { registerCollabWebSocket } from './plugins/collab-ws';
import { StorageService } from './services/storage';

interface BuildAppOptions {
  db: PostgresJsDatabase<typeof schema>;
  storage?: StorageService;
}

export async function buildApp(options: BuildAppOptions) {
  const app = Fastify({
    logger: process.env.NODE_ENV === 'test' ? false : true,
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

  registerStripeRawBodyParser(app);

  const storage = options.storage ?? new StorageService();
  await storage.ensureBucket();

  await registerHealthRoutes(app, { db: options.db });
  await registerShareRoutes(app, { db: options.db, storage });
  await registerIntegrationRoutes(app);
  await registerLibraryRoutes(app, { db: options.db, storage });
  await registerCollectionRoutes(app, { db: options.db });
  await registerWorkspaceRoutes(app, { db: options.db, storage });
  await registerBillingRoutes(app, { db: options.db });
  await registerCollabRoutes(app, { db: options.db, storage });
  await registerCollabWebSocket(app, { db: options.db });

  return app;
}
