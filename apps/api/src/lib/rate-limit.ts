import type { FastifyReply } from 'fastify';
import { checkRateLimit } from '../services/redis';

/** Sends 429 and returns false when the caller exceeded `limit` requests per `windowSec`. */
export async function allowOrReply(
  reply: FastifyReply,
  scope: string,
  keyId: string,
  limit: number,
  windowSec: number
): Promise<boolean> {
  const result = await checkRateLimit(scope, keyId, limit, windowSec);
  if (result.allowed) {
    return true;
  }
  await reply
    .header('Retry-After', String(result.retryAfterSec))
    .code(429)
    .send({ error: 'Rate limit exceeded' });
  return false;
}
