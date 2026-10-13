import type { FastifyInstance } from 'fastify';
import { env } from '../env';

/** Webhooks verify an HMAC over the exact bytes received, so they get the raw body. */
const RAW_BODY_ROUTES = new Set(['/v1/billing/webhook', '/v1/webhooks/rewardful']);

const JSON_BODY_LIMIT_BYTES = 2 * 1024 * 1024;

export function registerStripeRawBodyParser(app: FastifyInstance): void {
  // Fastify's default parser rejects __proto__ / constructor.prototype keys.
  const parseJson = app.getDefaultJsonParser('error', 'error');

  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer', bodyLimit: JSON_BODY_LIMIT_BYTES },
    (request, body, done) => {
      if (RAW_BODY_ROUTES.has(request.url.split('?')[0] ?? '')) {
        done(null, body);
        return;
      }

      parseJson(request, (body as Buffer).toString('utf8'), done);
    }
  );
}

export function isStripeConfigured(): boolean {
  return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET);
}
