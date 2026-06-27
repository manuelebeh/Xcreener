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

export async function checkUploadRateLimit(userId: string, limit = 20): Promise<boolean> {
  const redis = getRedis();
  const key = `rate:upload:${userId}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 3600);
  }
  return count <= limit;
}

export async function cacheShareMetadata(
  token: string,
  payload: Record<string, string | number | null>,
  ttlSeconds = 300
): Promise<void> {
  const redis = getRedis();
  await redis.set(`share:meta:${token}`, JSON.stringify(payload), 'EX', ttlSeconds);
}

export async function getCachedShareMetadata(
  token: string
): Promise<Record<string, string | number | null> | null> {
  const redis = getRedis();
  const raw = await redis.get(`share:meta:${token}`);
  if (!raw) {
    return null;
  }
  return JSON.parse(raw) as Record<string, string | number | null>;
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
