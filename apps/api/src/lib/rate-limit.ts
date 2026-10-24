import type { FastifyReply } from 'fastify';
import { checkRateLimit } from '../services/redis';

/**
 * Sends 429 and returns false when the caller exceeded `limit` requests per `windowSec`.
 * When Redis is down the request goes through, unless `failClosed` asks for a 503 instead.
 */
export async function allowOrReply(
  reply: FastifyReply,
  scope: string,
  keyId: string,
  limit: number,
  windowSec: number,
  options: { failClosed?: boolean } = {}
): Promise<boolean> {
  const result = await checkRateLimit(scope, keyId, limit, windowSec);
  if (result.unavailable && options.failClosed) {
    await reply.code(503).send({ error: 'Service temporarily unavailable' });
    return false;
  }
  if (result.allowed) {
    return true;
  }
  await reply
    .header('Retry-After', String(result.retryAfterSec))
    .code(429)
    .send({ error: 'Rate limit exceeded' });
  return false;
}
