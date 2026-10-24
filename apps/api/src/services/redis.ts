import { API_RATE_LIMITS } from '@snapglow/api-core';
import Redis from 'ioredis';
import { env } from '../env';

let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
  }
  return redisClient;
}

export async function checkRateLimit(
  scope: string,
  keyId: string,
  limit: number,
  windowSec: number
): Promise<{ allowed: boolean; retryAfterSec: number }> {
  const redis = getRedis();
  const redisKey = `rate:${scope}:${keyId}`;
  const count = await redis.incr(redisKey);
  if (count === 1) {
    await redis.expire(redisKey, windowSec);
  }

  const ttl = await redis.ttl(redisKey);
  const retryAfterSec = ttl > 0 ? ttl : windowSec;

  return {
    allowed: count <= limit,
    retryAfterSec,
  };
}

export async function checkUploadRateLimit(userId: string, limit = 20): Promise<boolean> {
  const result = await checkRateLimit('upload', userId, limit, 3600);
  return result.allowed;
}

export async function checkApiGeneralRateLimit(apiKeyId: string): Promise<{
  allowed: boolean;
  retryAfterSec: number;
}> {
  return checkRateLimit(
    'api:general',
    apiKeyId,
    env.API_RATE_LIMIT_GENERAL,
    API_RATE_LIMITS.general.windowSec
  );
}

export async function checkApiUploadRateLimit(apiKeyId: string): Promise<{
  allowed: boolean;
  retryAfterSec: number;
}> {
  return checkRateLimit(
    'api:upload',
    apiKeyId,
    env.API_RATE_LIMIT_UPLOAD,
    API_RATE_LIMITS.upload.windowSec
  );
}

export async function checkApiExportRateLimit(apiKeyId: string): Promise<{
  allowed: boolean;
  retryAfterSec: number;
}> {
  return checkRateLimit(
    'api:export',
    apiKeyId,
    env.API_RATE_LIMIT_EXPORT,
    API_RATE_LIMITS.export.windowSec
  );
}

export interface PendingIntegrationOAuth {
  userId: string;
  provider: string;
  codeVerifier: string;
}

const INTEGRATION_OAUTH_TTL_SEC = 600;

/** Binds an integration OAuth `state` to the user who started the flow (single use, 10 min). */
export async function savePendingIntegrationOAuth(
  state: string,
  pending: PendingIntegrationOAuth
): Promise<void> {
  const redis = getRedis();
  await redis.set(
    `integration:oauth:${state}`,
    JSON.stringify(pending),
    'EX',
    INTEGRATION_OAUTH_TTL_SEC
  );
}

export async function takePendingIntegrationOAuth(
  state: string
): Promise<PendingIntegrationOAuth | null> {
  const redis = getRedis();
  const raw = await redis.getdel(`integration:oauth:${state}`);
  return raw ? (JSON.parse(raw) as PendingIntegrationOAuth) : null;
}

export async function pingRedis(): Promise<boolean> {
  const redis = getRedis();
  const result = await redis.ping();
  return result === 'PONG';
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
