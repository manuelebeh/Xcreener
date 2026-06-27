import type { FastifyInstance } from 'fastify';
import { env } from '../env';

export function registerStripeRawBodyParser(app: FastifyInstance): void {
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (request, body, done) => {
    if (request.url === '/v1/billing/webhook') {
      done(null, body);
      return;
    }

    try {
      done(null, JSON.parse(body.toString('utf8')));
    } catch (error) {
      done(error as Error);
    }
  });
}

export function isStripeConfigured(): boolean {
  return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET);
}
