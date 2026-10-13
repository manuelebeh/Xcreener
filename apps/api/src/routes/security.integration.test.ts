/**
 * Authorization and input-handling regressions, run against a real Postgres.
 *
 * Skipped unless INTEGRATION_DATABASE_URL points to a migrated, disposable database:
 *   mise run api:infra
 *   createdb + DATABASE_URL=<url> pnpm --filter @snapglow/api db:migrate
 *   INTEGRATION_DATABASE_URL=<url> pnpm --filter @snapglow/api test
 */
import { createHmac } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import WebSocket from 'ws';

vi.hoisted(() => {
  process.env.REWARDFUL_WEBHOOK_SECRET = 'rewardful-test-secret';
});

// A bearer token is "<auth0Sub>" or "<auth0Sub>@<expiresAtSeconds>".
vi.mock('jose', () => ({
  createRemoteJWKSet: () => ({}),
  jwtVerify: async (token: string) => {
    const [sub, exp] = token.split('@');
    return { payload: { sub, exp: exp ? Number(exp) : Math.floor(Date.now() / 1000) + 3600 } };
  },
}));

vi.mock('../plugins/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../plugins/auth')>();
  return {
    ...actual,
    // "Bearer <auth0Sub>" stands in for a verified Auth0 token.
    authenticateRequest: async (
      request: { headers: { authorization?: string }; authUser?: unknown },
      reply: { code: (status: number) => { send: (payload: unknown) => Promise<void> } }
    ) => {
      const header = request.headers.authorization;
      if (!header?.startsWith('Bearer ')) {
        await reply.code(401).send({ error: 'Unauthorized' });
        return;
      }
      const auth0Sub = header.slice('Bearer '.length);
      request.authUser = { id: '', auth0Sub, email: `${auth0Sub}@test.dev`, auth0OrgId: null };
    },
  };
});

import { buildApp } from '../app';
import { createDb } from '../db/migrate';
import * as schema from '../db/schema';
import { upsertAuthUser } from '../plugins/auth';
import { applyAnnotationOpToDocument } from '../services/collab-ops';
import { purgeExpiredShares } from '../services/share-cleanup';

const databaseUrl = process.env.INTEGRATION_DATABASE_URL;

const deletedObjects: string[] = [];

const storage = {
  ensureBucket: async () => {},
  uploadObject: async () => {},
  getPresignedUrl: async () => 'https://storage.test/asset',
  getObject: async () => Buffer.from(''),
  deleteObject: async (key: string) => {
    deletedObjects.push(key);
  },
};

function nextMessage(socket: WebSocket): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    socket.once('message', (raw) => resolve(JSON.parse(raw.toString())));
  });
}

function multipartBody(fields: Record<string, string>, file: Buffer, mimeType: string) {
  const boundary = '----snapglowtest';
  const parts: Buffer[] = [];
  for (const [name, value] of Object.entries(fields)) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`
      )
    );
  }
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="a.png"\r\nContent-Type: ${mimeType}\r\n\r\n`
    ),
    file,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  );
  return {
    payload: Buffer.concat(parts),
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
  };
}

describe.skipIf(!databaseUrl)('API security regressions (Postgres)', () => {
  const { db, client } = createDb(databaseUrl);
  let app: Awaited<ReturnType<typeof buildApp>>;
  const run = crypto.randomUUID().slice(0, 8);
  const alice = `auth0|alice-${run}`;
  const bob = `auth0|bob-${run}`;

  beforeAll(async () => {
    app = await buildApp({ db, storage: storage as never });
  });

  afterAll(async () => {
    await app.close();
    await client.end();
  });

  it('does not let a user rename another user collection', async () => {
    const owner = await upsertAuthUser(db, alice, null);
    const [collection] = await db
      .insert(schema.collections)
      .values({ userId: owner.id, name: `alice-${run}` })
      .returning();

    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/collections/${collection?.id}`,
      headers: { authorization: `Bearer ${bob}` },
      payload: { name: 'pwned' },
    });

    expect(response.statusCode).toBe(404);
    const [after] = await db
      .select()
      .from(schema.collections)
      .where(eq(schema.collections.id, collection?.id ?? ''));
    expect(after?.name).toBe(`alice-${run}`);
  });

  it('does not let a user file items into another user collection', async () => {
    const owner = await upsertAuthUser(db, alice, null);
    const [collection] = await db
      .insert(schema.collections)
      .values({ userId: owner.id, name: `alice-target-${run}` })
      .returning();
    const collectionId = collection?.id ?? '';

    const upload = multipartBody(
      { collectionIds: JSON.stringify([collectionId]) },
      Buffer.from('png'),
      'image/png'
    );
    const created = await app.inject({
      method: 'POST',
      url: '/v1/library',
      headers: { authorization: `Bearer ${bob}`, ...upload.headers },
      payload: upload.payload,
    });
    expect(created.statusCode).toBe(400);

    const bobUser = await upsertAuthUser(db, bob, null);
    const [item] = await db
      .insert(schema.libraryItems)
      .values({ userId: bobUser.id, storageKey: `k-${run}`, mimeType: 'image/png', byteSize: 3 })
      .returning();
    const patched = await app.inject({
      method: 'PATCH',
      url: `/v1/library/${item?.id}`,
      headers: { authorization: `Bearer ${bob}` },
      payload: { collectionIds: [collectionId] },
    });
    expect(patched.statusCode).toBe(400);

    const links = await db
      .select()
      .from(schema.libraryItemCollections)
      .where(eq(schema.libraryItemCollections.collectionId, collectionId));
    expect(links).toHaveLength(0);
  });

  it('does not expose template author emails publicly', async () => {
    const author = await upsertAuthUser(db, alice, `alice-${run}@private.dev`);
    await db.insert(schema.templateListings).values({
      slug: `tpl-${run}`,
      title: 'Public template',
      authorId: author.id,
      status: 'approved',
      style: {} as never,
    });

    const list = await app.inject({ method: 'GET', url: '/v1/templates' });
    expect(list.statusCode).toBe(200);
    expect(list.body).not.toContain('@private.dev');

    const detail = await app.inject({ method: 'GET', url: `/v1/templates/tpl-${run}` });
    expect(detail.statusCode).toBe(200);
    expect(detail.body).not.toContain('@private.dev');
  });

  it('rejects non-https template preview URLs', async () => {
    const submit = (previewUrl: string) =>
      app.inject({
        method: 'POST',
        url: '/v1/templates',
        headers: { authorization: `Bearer ${alice}` },
        payload: {
          title: `Preview ${run}`,
          style: {
            background: { type: 'solid', color: '#fff' },
            padding: 24,
            borderRadius: 8,
            shadow: { opacity: 0.2, blur: 16, offsetX: 0, offsetY: 4, color: '#000' },
            frame: null,
          },
          tags: [],
          previewUrl,
        },
      });

    expect((await submit('https://cdn.example/preview.png')).statusCode).toBe(201);
    expect((await submit('http://tracker.example/pixel.gif')).statusCode).toBe(400);
    expect((await submit('javascript:alert(1)')).statusCode).toBe(400);
  });

  it('verifies Rewardful signatures over the raw request body', async () => {
    const raw = '{ "event": "referral.created",  "object": {} }';
    const signature = createHmac('sha256', 'rewardful-test-secret').update(raw).digest('hex');
    const response = await app.inject({
      method: 'POST',
      url: '/v1/webhooks/rewardful',
      headers: { 'content-type': 'application/json', 'x-rewardful-signature': signature },
      payload: raw,
    });
    expect(response.statusCode).toBe(200);
  });

  it('rejects JSON bodies with __proto__ keys', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/collections',
      headers: { authorization: `Bearer ${alice}`, 'content-type': 'application/json' },
      payload: '{"name":"x","__proto__":{"polluted":true}}',
    });
    expect(response.statusCode).toBe(400);
  });

  it('returns 400 on malformed sync cursors instead of a server error', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/sync/library?since=not-a-date',
      headers: { authorization: `Bearer ${alice}` },
    });
    expect(response.statusCode).toBe(400);
  });

  it('applies concurrent collab annotation ops without losing any', async () => {
    const owner = await upsertAuthUser(db, alice, null);
    const [workspace] = await db
      .insert(schema.workspaces)
      .values({ name: 'ws', slug: `ws-${run}`, plan: 'team_pro', createdBy: owner.id })
      .returning();
    const [doc] = await db
      .insert(schema.collabDocuments)
      .values({
        workspaceId: workspace?.id ?? '',
        createdBy: owner.id,
        screenshotStorageKey: `collab-${run}`,
        screenshotMimeType: 'image/png',
        screenshotByteSize: 1,
        documentState: {
          screenshotWidth: 10,
          screenshotHeight: 10,
          annotations: [],
        } as never,
        version: 0,
      })
      .returning();
    const documentId = doc?.id ?? '';

    await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        applyAnnotationOpToDocument(db, documentId, {
          op: 'add',
          annotation: { id: `a-${index}`, type: 'rect' } as never,
        })
      )
    );

    const [after] = await db
      .select()
      .from(schema.collabDocuments)
      .where(eq(schema.collabDocuments.id, documentId));
    expect(after?.version).toBe(20);
    expect(after?.documentState.annotations).toHaveLength(20);
  });

  it('lets owners revoke shares and keeps others out', async () => {
    const owner = await upsertAuthUser(db, alice, null);
    const [share] = await db
      .insert(schema.shares)
      .values({
        userId: owner.id,
        token: `tok${run}`,
        storageKey: `shares/${owner.id}/tok${run}`,
        mimeType: 'image/png',
        byteSize: 3,
      })
      .returning();

    const denied = await app.inject({
      method: 'DELETE',
      url: `/v1/shares/${share?.token}`,
      headers: { authorization: `Bearer ${bob}` },
    });
    expect(denied.statusCode).toBe(404);
    expect(
      (await app.inject({ method: 'GET', url: `/v1/shares/${share?.token}` })).statusCode
    ).toBe(200);

    const revoked = await app.inject({
      method: 'DELETE',
      url: `/v1/shares/${share?.token}`,
      headers: { authorization: `Bearer ${alice}` },
    });
    expect(revoked.statusCode).toBe(204);
    expect(deletedObjects).toContain(share?.storageKey);
    expect(
      (await app.inject({ method: 'GET', url: `/v1/shares/${share?.token}` })).statusCode
    ).toBe(404);
  });

  it('purges expired shares', async () => {
    const owner = await upsertAuthUser(db, alice, null);
    await db.insert(schema.shares).values({
      userId: owner.id,
      token: `old${run}`,
      storageKey: `shares/${owner.id}/old${run}`,
      mimeType: 'image/png',
      byteSize: 3,
      expiresAt: new Date(Date.now() - 1000),
    });

    expect(await purgeExpiredShares(db, storage as never)).toBeGreaterThanOrEqual(1);
    expect(deletedObjects).toContain(`shares/${owner.id}/old${run}`);
  });

  it('validates comments and settings payloads', async () => {
    const owner = await upsertAuthUser(db, alice, null);
    const [workspace] = await db
      .insert(schema.workspaces)
      .values({ name: 'ws2', slug: `ws2-${run}`, plan: 'team_pro', createdBy: owner.id })
      .returning();
    await db
      .insert(schema.workspaceMembers)
      .values({ workspaceId: workspace?.id ?? '', userId: owner.id, role: 'admin' });
    const [doc] = await db
      .insert(schema.collabDocuments)
      .values({
        workspaceId: workspace?.id ?? '',
        createdBy: owner.id,
        screenshotStorageKey: `c2-${run}`,
        screenshotMimeType: 'image/png',
        screenshotByteSize: 1,
        documentState: { screenshotWidth: 1, screenshotHeight: 1, annotations: [] } as never,
        version: 0,
      })
      .returning();

    const comment = (payload: unknown) =>
      app.inject({
        method: 'POST',
        url: `/v1/collab/documents/${doc?.id}/comments`,
        headers: { authorization: `Bearer ${alice}` },
        payload: payload as never,
      });

    expect((await comment({ body: 42 })).statusCode).toBe(400);
    expect((await comment({ body: 'x'.repeat(5001) })).statusCode).toBe(400);
    expect((await comment({ body: 'hi', parentId: crypto.randomUUID() })).statusCode).toBe(400);
    expect((await comment({ body: 'hello' })).statusCode).toBe(201);

    const future = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
    const saved = await app.inject({
      method: 'PUT',
      url: '/v1/users/me/settings',
      headers: { authorization: `Bearer ${alice}` },
      payload: { settings: [{ key: 'theme', value: 'dark', updatedAt: future }] },
    });
    expect(saved.statusCode).toBe(200);
    const rows = await db
      .select()
      .from(schema.userSettings)
      .where(eq(schema.userSettings.userId, owner.id));
    expect(rows.find((row) => row.key === 'theme')?.updatedAt.getTime()).toBeLessThanOrEqual(
      Date.now()
    );
  });

  it('drops collab sockets whose membership was revoked or token expired', async () => {
    const owner = await upsertAuthUser(db, alice, null);
    const [workspace] = await db
      .insert(schema.workspaces)
      .values({ name: 'ws3', slug: `ws3-${run}`, plan: 'team_pro', createdBy: owner.id })
      .returning();
    const workspaceId = workspace?.id ?? '';
    await db
      .insert(schema.workspaceMembers)
      .values({ workspaceId, userId: owner.id, role: 'admin' });
    const [doc] = await db
      .insert(schema.collabDocuments)
      .values({
        workspaceId,
        createdBy: owner.id,
        screenshotStorageKey: `c3-${run}`,
        screenshotMimeType: 'image/png',
        screenshotByteSize: 1,
        documentState: { screenshotWidth: 1, screenshotHeight: 1, annotations: [] } as never,
        version: 0,
      })
      .returning();

    await app.listen({ port: 0, host: '127.0.0.1' });
    const { port } = app.server.address() as AddressInfo;
    const connect = async (token: string) => {
      const socket = new WebSocket(`ws://127.0.0.1:${port}/v1/collab/ws`);
      await new Promise((resolve) => socket.once('open', resolve));
      const reply = nextMessage(socket);
      socket.send(JSON.stringify({ type: 'auth', token, documentId: doc?.id }));
      return { socket, first: await reply };
    };

    // Revoked membership: the next edit is refused and the socket closed.
    const editor = await connect(alice);
    expect(editor.first.type).toBe('auth:ok');
    await db.delete(schema.workspaceMembers).where(eq(schema.workspaceMembers.userId, owner.id));
    const closed = new Promise<number>((resolve) => editor.socket.once('close', resolve));
    const refusal = nextMessage(editor.socket);
    editor.socket.send(
      JSON.stringify({
        type: 'annotation:op',
        op: { op: 'add', annotation: { id: 'x1', type: 'rect' } },
      })
    );
    expect((await refusal).error).toBe('Access revoked');
    expect(await closed).toBe(4403);

    // Expired token: any message after the expiry is refused.
    await db
      .insert(schema.workspaceMembers)
      .values({ workspaceId, userId: owner.id, role: 'admin' });
    const soon = Math.floor(Date.now() / 1000) + 1;
    const short = await connect(`${alice}@${soon}`);
    expect(short.first.type).toBe('auth:ok');
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const expiredClose = new Promise<number>((resolve) => short.socket.once('close', resolve));
    short.socket.send(JSON.stringify({ type: 'presence:update', presence: {} }));
    expect(await expiredClose).toBe(4401);
  });
});
