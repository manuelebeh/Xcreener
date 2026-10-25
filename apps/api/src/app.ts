import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import sensible from '@fastify/sensible';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import Fastify from 'fastify';
import type Stripe from 'stripe';
import type * as schema from './db/schema';
import { env } from './env';
import { getAllowedCorsOrigins, isOriginAllowed } from './lib/cors';
import { serializeRequest } from './lib/log-redact';
import { registerCollabWebSocket } from './plugins/collab-ws';
import { registerOpenApiDocs } from './plugins/openapi-docs';
import { registerStripeRawBodyParser } from './plugins/stripe-webhook';
import { registerAccountRoutes } from './routes/account';
import { registerAffiliateRoutes } from './routes/affiliates';
import { registerApiKeyRoutes } from './routes/api-keys';
import { getStripeClient, registerBillingRoutes } from './routes/billing';
import { registerCollabRoutes } from './routes/collab';
import { registerCollectionRoutes } from './routes/collections';
import { registerEmbedRoutes } from './routes/embeds';
import { registerEntitlementRoutes } from './routes/entitlement';
import { registerHealthRoutes } from './routes/health';
import { registerIntegrationRoutes } from './routes/integrations';
import { registerLibraryRoutes } from './routes/library';
import { registerPublicCaptureRoutes } from './routes/public-captures';
import { registerShareRoutes } from './routes/shares';
import { registerSyncRoutes } from './routes/sync';
import { registerTemplateRoutes } from './routes/templates';
import { registerWorkspaceUsageRoutes } from './routes/workspace-usage';
import { registerWorkspaceRoutes } from './routes/workspaces';
import { StorageService } from './services/storage';

interface BuildAppOptions {
  db: PostgresJsDatabase<typeof schema>;
  storage?: StorageService;
  /** `null` turns Stripe off; omitted, it comes from `STRIPE_SECRET_KEY`. */
  stripe?: Stripe | null;
}

export async function buildApp(options: BuildAppOptions) {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test' && { serializers: { req: serializeRequest } },
    bodyLimit: 100 * 1024 * 1024,
  });

  const allowedOrigins = getAllowedCorsOrigins();

  await app.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV === 'production',
    crossOriginEmbedderPolicy: false,
    hsts: env.NODE_ENV === 'production',
  });

  await app.register(cors, {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin, allowedOrigins)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin not allowed by CORS'), false);
    },
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
  const stripe = options.stripe === undefined ? getStripeClient() : options.stripe;
  await storage.ensureBucket();

  await registerHealthRoutes(app, { db: options.db });
  await registerShareRoutes(app, { db: options.db, storage });
  await registerEmbedRoutes(app, { db: options.db, storage });
  await registerIntegrationRoutes(app, { db: options.db });
  await registerEntitlementRoutes(app, { db: options.db });
  await registerLibraryRoutes(app, { db: options.db, storage });
  await registerCollectionRoutes(app, { db: options.db });
  await registerWorkspaceRoutes(app, { db: options.db, storage, stripe });
  await registerWorkspaceUsageRoutes(app, { db: options.db });
  await registerBillingRoutes(app, { db: options.db, stripe });
  await registerAffiliateRoutes(app);
  await registerCollabRoutes(app, { db: options.db, storage });
  await registerCollabWebSocket(app, { db: options.db });
  await registerApiKeyRoutes(app, { db: options.db });
  await registerPublicCaptureRoutes(app, { db: options.db, storage });
  await registerTemplateRoutes(app, { db: options.db });
  await registerSyncRoutes(app, { db: options.db, storage });
  await registerAccountRoutes(app, { db: options.db, storage, stripe });
  if (env.NODE_ENV !== 'test') {
    await registerOpenApiDocs(app);
  }

  return app;
}
