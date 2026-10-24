import { describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { shares, users } from '../db/schema';
import { presignedTtlForShare } from './shares';

describe('share routes', () => {
  it('returns 404 for unknown token', async () => {
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [],
          }),
        }),
      }),
    };

    const storage = {
      ensureBucket: async () => {},
      uploadObject: async () => {},
      getPresignedUrl: async () => 'https://example.com/asset',
    };

    const app = await buildApp({
      db: db as never,
      storage: storage as never,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/shares/unknown-token',
    });

    expect(response.statusCode).toBe(404);
    await app.close();
  });

  it('returns 401 without auth on create', async () => {
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [],
          }),
        }),
      }),
    };

    const storage = {
      ensureBucket: async () => {},
      uploadObject: async () => {},
      getPresignedUrl: async () => 'https://example.com/asset',
    };

    const app = await buildApp({
      db: db as never,
      storage: storage as never,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/shares',
    });

    expect(response.statusCode).toBe(401);
    await app.close();
  });
});

describe('schema exports', () => {
  it('defines users and shares tables', () => {
    expect(users).toBeDefined();
    expect(shares).toBeDefined();
  });

  it('caps the presigned TTL to the time left on the share', () => {
    const now = Date.parse('2026-10-24T12:00:00Z');
    expect(presignedTtlForShare(null, now)).toBe(900);
    expect(presignedTtlForShare(new Date(now + 3_600_000), now)).toBe(900);
    expect(presignedTtlForShare(new Date(now + 120_000), now)).toBe(120);
    expect(presignedTtlForShare(new Date(now + 200), now)).toBe(1);
  });
});
