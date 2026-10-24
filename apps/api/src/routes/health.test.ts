import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

const pingRedis = vi.fn();
vi.mock('../services/redis', () => ({ pingRedis: () => pingRedis() }));

import { registerHealthRoutes } from './health';

async function healthWith(dbExecute: () => Promise<unknown[]>, redisUp: boolean) {
  pingRedis.mockImplementation(async () => {
    if (!redisUp) {
      throw new Error('ECONNREFUSED');
    }
    return true;
  });
  const app = Fastify();
  await registerHealthRoutes(app, { db: { execute: dbExecute } as never });
  const response = await app.inject({ method: 'GET', url: '/health' });
  await app.close();
  return response;
}

describe('/health', () => {
  it('answers 200 when every service is up', async () => {
    const response = await healthWith(async () => [{ ok: 1 }], true);
    expect(response.statusCode).toBe(200);
    expect(response.json().ok).toBe(true);
  });

  it('answers 503 when Redis is down', async () => {
    const response = await healthWith(async () => [{ ok: 1 }], false);
    expect(response.statusCode).toBe(503);
    expect(response.json().services).toEqual({ postgres: true, redis: false });
  });

  it('answers 503 instead of throwing when Postgres is down', async () => {
    const response = await healthWith(async () => {
      throw new Error('connection refused');
    }, true);
    expect(response.statusCode).toBe(503);
    expect(response.json().services.postgres).toBe(false);
  });
});
