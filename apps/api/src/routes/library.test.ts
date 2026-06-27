import { describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { collections, libraryItems, users } from '../db/schema';

describe('library routes', () => {
  it('returns 401 without auth on list', async () => {
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
      url: '/v1/library',
    });

    expect(response.statusCode).toBe(401);
    await app.close();
  });
});

describe('integration routes', () => {
  it('returns 401 without auth on authorize', async () => {
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
      url: '/v1/integrations/slack/authorize',
    });

    expect(response.statusCode).toBe(401);
    await app.close();
  });
});

describe('schema exports', () => {
  it('defines library and collection tables', () => {
    expect(users).toBeDefined();
    expect(libraryItems).toBeDefined();
    expect(collections).toBeDefined();
  });
});
