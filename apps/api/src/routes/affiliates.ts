import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { env } from '../env';

interface RewardfulWebhookPayload {
  event: string;
  object?: {
    id?: string;
    email?: string;
    referral?: { id?: string; token?: string };
    sale?: { amount?: number; currency?: string };
  };
}

function verifyRewardfulSignature(rawBody: string, signature: string | undefined): boolean {
  const secret = env.REWARDFUL_WEBHOOK_SECRET;
  if (!secret || !signature) {
    return env.NODE_ENV === 'development';
  }

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

async function capturePostHogEvent(
  event: string,
  properties: Record<string, unknown>
): Promise<void> {
  if (!env.POSTHOG_API_KEY) {
    return;
  }

  await fetch(`${env.POSTHOG_HOST}/capture/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: env.POSTHOG_API_KEY,
      event,
      properties: { ...properties, $lib: 'api' },
      distinct_id: String(properties.affiliate_token ?? properties.referral_id ?? 'affiliate'),
    }),
  }).catch(() => undefined);
}

export async function registerAffiliateRoutes(app: FastifyInstance) {
  app.post('/v1/webhooks/rewardful', async (request, reply) => {
    const rawBody =
      request.body instanceof Buffer
        ? request.body.toString('utf8')
        : JSON.stringify(request.body ?? {});
    const signature = request.headers['x-rewardful-signature'] as string | undefined;

    if (!verifyRewardfulSignature(rawBody, signature)) {
      return reply.code(401).send({ error: 'Invalid webhook signature' });
    }

    let payload: RewardfulWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as RewardfulWebhookPayload;
    } catch {
      return reply.code(400).send({ error: 'Invalid JSON payload' });
    }

    if (payload.event === 'referral.converted' || payload.event === 'sale.created') {
      await capturePostHogEvent('affiliate_conversion', {
        affiliate_token: payload.object?.referral?.token,
        referral_id: payload.object?.referral?.id,
        sale_amount: payload.object?.sale?.amount,
        currency: payload.object?.sale?.currency,
      });
    }

    if (payload.event === 'referral.created') {
      await capturePostHogEvent('affiliate_referred', {
        affiliate_token: payload.object?.referral?.token,
        referral_id: payload.object?.referral?.id,
        email: payload.object?.email,
      });
    }

    request.log.info({ event: payload.event }, 'Rewardful webhook processed');
    return reply.send({ received: true });
  });
}
