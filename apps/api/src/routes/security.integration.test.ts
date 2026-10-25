/**
 * Authorization and input-handling regressions, run against a real Postgres.
 *
 * Skipped unless INTEGRATION_DATABASE_URL points to a migrated, disposable database:
 *   mise run api:infra
 *   createdb + DATABASE_URL=<url> pnpm --filter @xcreener/api db:migrate
 *   INTEGRATION_DATABASE_URL=<url> pnpm --filter @xcreener/api test
 */
import { createHmac } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { eq, inArray } from 'drizzle-orm';
import Stripe from 'stripe';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import WebSocket from 'ws';

vi.hoisted(() => {
  process.env.REWARDFUL_WEBHOOK_SECRET = 'rewardful-test-secret';
  process.env.STRIPE_SECRET_KEY = 'sk_test_offline';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  process.env.STRIPE_PRICE_TEAM_PRO = 'price_team_pro';
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

import { apiKeyDisplayPrefix, buildApiKeyPlaintext } from '@xcreener/api-core';
import { generateApiKeySecret, hashApiKey } from '@xcreener/api-core/api-keys';
import { defaultCollabDocumentState } from '@xcreener/collab-core';
import { buildApp } from '../app';
import { createDb } from '../db/migrate';
import * as schema from '../db/schema';
import { upsertAuthUser } from '../plugins/auth';
import { BillingCancellationError, deleteUserAccount } from '../services/account-deletion';
import { applyAnnotationOpToDocument } from '../services/collab-ops';
import { purgeExpiredShares } from '../services/share-cleanup';

const databaseUrl = process.env.INTEGRATION_DATABASE_URL;

const deletedObjects: string[] = [];

const storage = {
  ensureBucket: async () => {},
  uploadObject: async () => {},
  getPresignedUrl: async () => 'https://storage.test/asset',
  getObject: async (key: string) => Buffer.from(`object:${key}`),
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
  const boundary = '----xcreenertest';
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

  it('streams library assets only to the owner and workspace members', async () => {
    const owner = await upsertAuthUser(db, alice, null);
    const outsider = await upsertAuthUser(db, bob, null);
    const [item] = await db
      .insert(schema.libraryItems)
      .values({ userId: owner.id, storageKey: `lib-${run}`, mimeType: 'image/png', byteSize: 3 })
      .returning();
    const [gone] = await db
      .insert(schema.libraryItems)
      .values({
        userId: owner.id,
        storageKey: `gone-${run}`,
        mimeType: 'image/png',
        byteSize: 3,
        deletedAt: new Date(),
      })
      .returning();

    const own = await app.inject({
      method: 'GET',
      url: `/v1/library/${item?.id}/content`,
      headers: { authorization: `Bearer ${alice}` },
    });
    expect(own.statusCode).toBe(200);
    expect(own.headers['content-type']).toBe('image/png');
    expect(own.body).toBe(`object:lib-${run}`);

    const foreign = await app.inject({
      method: 'GET',
      url: `/v1/library/${item?.id}/content`,
      headers: { authorization: `Bearer ${bob}` },
    });
    expect(foreign.statusCode).toBe(404);
    expect(outsider.id).not.toBe(owner.id);

    const deleted = await app.inject({
      method: 'GET',
      url: `/v1/library/${gone?.id}/content`,
      headers: { authorization: `Bearer ${alice}` },
    });
    expect(deleted.statusCode).toBe(404);
  });

  it('streams public API exports only to keys of the capture workspace', async () => {
    const owner = await upsertAuthUser(db, alice, null);
    async function workspaceWithKey(slug: string) {
      const [workspace] = await db
        .insert(schema.workspaces)
        .values({ name: slug, slug: `${slug}-${run}`, plan: 'team_pro', createdBy: owner.id })
        .returning();
      const secret = buildApiKeyPlaintext(generateApiKeySecret());
      const [key] = await db
        .insert(schema.apiKeys)
        .values({
          workspaceId: workspace?.id ?? '',
          name: slug,
          keyPrefix: apiKeyDisplayPrefix(secret),
          keyHash: hashApiKey(secret),
          createdBy: owner.id,
        })
        .returning();
      return { workspaceId: workspace?.id ?? '', keyId: key?.id ?? '', secret };
    }
    const mine = await workspaceWithKey('export-a');
    const other = await workspaceWithKey('export-b');
    const [exported, pending] = await db
      .insert(schema.apiCaptures)
      .values([
        {
          workspaceId: mine.workspaceId,
          apiKeyId: mine.keyId,
          storageKey: `api-src-${run}`,
          exportStorageKey: `api-captures/${mine.workspaceId}/x/export.webp`,
          documentState: defaultCollabDocumentState(10, 10) as never,
          mimeType: 'image/png',
          byteSize: 3,
        },
        {
          workspaceId: mine.workspaceId,
          apiKeyId: mine.keyId,
          storageKey: `api-src2-${run}`,
          documentState: defaultCollabDocumentState(10, 10) as never,
          mimeType: 'image/png',
          byteSize: 3,
        },
      ])
      .returning();

    function download(id: string | undefined, secret: string) {
      return app.inject({
        method: 'GET',
        url: `/v1/public/captures/${id}/export/content`,
        headers: { authorization: `Bearer ${secret}` },
      });
    }

    const ok = await download(exported?.id, mine.secret);
    expect(ok.statusCode).toBe(200);
    expect(ok.headers['content-type']).toBe('image/webp');
    expect(ok.body).toBe(`object:api-captures/${mine.workspaceId}/x/export.webp`);
    expect((await download(exported?.id, other.secret)).statusCode).toBe(404);
    expect((await download(pending?.id, mine.secret)).statusCode).toBe(404);
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

  it('keeps purging when an object delete keeps failing', async () => {
    const owner = await upsertAuthUser(db, alice, null);
    await db.insert(schema.shares).values([
      {
        userId: owner.id,
        token: `stuck${run}`,
        storageKey: `shares/${owner.id}/stuck${run}`,
        mimeType: 'image/png',
        byteSize: 3,
        expiresAt: new Date(Date.now() - 2000),
      },
      {
        userId: owner.id,
        token: `next${run}`,
        storageKey: `shares/${owner.id}/next${run}`,
        mimeType: 'image/png',
        byteSize: 3,
        expiresAt: new Date(Date.now() - 1000),
      },
    ]);
    const failingStorage = {
      ...storage,
      deleteObject: async () => {
        throw new Error('S3 down');
      },
    };

    await purgeExpiredShares(db, failingStorage as never);

    const left = await db
      .select({ token: schema.shares.token })
      .from(schema.shares)
      .where(inArray(schema.shares.token, [`stuck${run}`, `next${run}`]));
    expect(left).toEqual([]);
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

  describe('collab REST validation', () => {
    async function editableDocument(slug: string) {
      const owner = await upsertAuthUser(db, alice, null);
      const [workspace] = await db
        .insert(schema.workspaces)
        .values({ name: 'collab', slug: `${slug}-${run}`, plan: 'team_pro', createdBy: owner.id })
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
          screenshotStorageKey: `collab-${slug}-${run}`,
          screenshotMimeType: 'image/png',
          screenshotByteSize: 1,
          documentState: defaultCollabDocumentState(10, 10),
          version: 3,
        })
        .returning();
      return { workspaceId, documentId: doc?.id ?? '' };
    }

    function patch(documentId: string, payload: unknown) {
      return app.inject({
        method: 'PATCH',
        url: `/v1/collab/documents/${documentId}`,
        headers: { authorization: `Bearer ${alice}` },
        payload: payload as Record<string, unknown>,
      });
    }

    it('refuses snapshots over the annotation cap or with malformed fields', async () => {
      const { documentId } = await editableDocument('patch');
      const state = defaultCollabDocumentState(10, 10);
      const annotations = Array.from({ length: 501 }, (_, index) => ({
        id: `a-${index}`,
        type: 'rect',
      }));

      expect(
        (await patch(documentId, { documentState: { ...state, annotations } })).statusCode
      ).toBe(400);
      expect(
        (await patch(documentId, { documentState: { ...state, screenshotWidth: 'NaN' } }))
          .statusCode
      ).toBe(400);
      expect((await patch(documentId, { title: { nested: 1 } })).statusCode).toBe(400);

      const [after] = await db
        .select()
        .from(schema.collabDocuments)
        .where(eq(schema.collabDocuments.id, documentId));
      expect(after?.version).toBe(3);
      expect(after?.title).toBeNull();
    });

    it('rejects a snapshot based on a stale version', async () => {
      const { documentId } = await editableDocument('stale');
      const state = defaultCollabDocumentState(10, 10);

      const stale = await patch(documentId, { documentState: state, expectedVersion: 2 });
      expect(stale.statusCode).toBe(409);

      const fresh = await patch(documentId, { documentState: state, expectedVersion: 3 });
      expect(fresh.statusCode).toBe(200);
      expect(fresh.json().version).toBe(4);
    });

    it('refuses to create a document with an invalid state', async () => {
      const { workspaceId } = await editableDocument('create');
      const upload = multipartBody(
        { documentState: JSON.stringify({ junk: true, annotations: 'not-an-array' }) },
        Buffer.from('png'),
        'image/png'
      );
      const response = await app.inject({
        method: 'POST',
        url: '/v1/collab/documents',
        headers: {
          authorization: `Bearer ${alice}`,
          'x-workspace-id': workspaceId,
          ...upload.headers,
        },
        payload: upload.payload,
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe('workspace admin and invitations', () => {
    it('refuses to demote or remove the last admin', async () => {
      const owner = await upsertAuthUser(db, alice, null);
      const [workspace] = await db
        .insert(schema.workspaces)
        .values({ name: 'admins', slug: `admins-${run}`, createdBy: owner.id })
        .returning();
      const workspaceId = workspace?.id ?? '';
      await db
        .insert(schema.workspaceMembers)
        .values({ workspaceId, userId: owner.id, role: 'admin' });

      const demote = await app.inject({
        method: 'PATCH',
        url: `/v1/workspaces/${workspaceId}/members/${owner.id}`,
        headers: { authorization: `Bearer ${alice}` },
        payload: { role: 'viewer' },
      });
      expect(demote.statusCode).toBe(409);

      const remove = await app.inject({
        method: 'DELETE',
        url: `/v1/workspaces/${workspaceId}/members/${owner.id}`,
        headers: { authorization: `Bearer ${alice}` },
      });
      expect(remove.statusCode).toBe(409);
    });

    it('lets only one user join through a link invitation accepted concurrently', async () => {
      const owner = await upsertAuthUser(db, alice, null);
      const [workspace] = await db
        .insert(schema.workspaces)
        .values({ name: 'link', slug: `link-${run}`, plan: 'team_pro', createdBy: owner.id })
        .returning();
      const workspaceId = workspace?.id ?? '';
      await db
        .insert(schema.workspaceMembers)
        .values({ workspaceId, userId: owner.id, role: 'admin' });
      const token = `link${run}`;
      await db.insert(schema.invitations).values({
        workspaceId,
        role: 'viewer',
        token,
        invitedBy: owner.id,
        expiresAt: new Date(Date.now() + 3600_000),
      });

      const joiners = Array.from({ length: 5 }, (_, index) => `auth0|joiner-${index}-${run}`);
      const responses = await Promise.all(
        joiners.map((sub) =>
          app.inject({
            method: 'POST',
            url: `/v1/invitations/${token}/accept`,
            headers: { authorization: `Bearer ${sub}` },
          })
        )
      );

      expect(responses.filter((response) => response.statusCode === 200)).toHaveLength(1);
      const members = await db
        .select()
        .from(schema.workspaceMembers)
        .where(eq(schema.workspaceMembers.workspaceId, workspaceId));
      expect(members).toHaveLength(2);
    });

    /** Team Starter at its limit of 5 paid seats (alice + 4 editors), plus one free viewer. */
    async function fullStarterWorkspace(slug: string) {
      const owner = await upsertAuthUser(db, alice, null);
      const [workspace] = await db
        .insert(schema.workspaces)
        .values({ name: slug, slug: `${slug}-${run}`, plan: 'team_starter', createdBy: owner.id })
        .returning();
      const workspaceId = workspace?.id ?? '';
      const editors = await Promise.all(
        Array.from({ length: 4 }, (_, index) =>
          upsertAuthUser(db, `auth0|${slug}-editor-${index}-${run}`, null)
        )
      );
      const viewer = await upsertAuthUser(db, `auth0|${slug}-viewer-${run}`, null);
      await db
        .insert(schema.workspaceMembers)
        .values([
          { workspaceId, userId: owner.id, role: 'admin' as const },
          ...editors.map((editor) => ({ workspaceId, userId: editor.id, role: 'editor' as const })),
          { workspaceId, userId: viewer.id, role: 'viewer' as const },
        ]);
      return { workspaceId, owner, editors, viewer };
    }

    it('refuses to promote a viewer past the paid seat limit', async () => {
      const { workspaceId, editors, viewer } = await fullStarterWorkspace('promote');

      const promote = await app.inject({
        method: 'PATCH',
        url: `/v1/workspaces/${workspaceId}/members/${viewer.id}`,
        headers: { authorization: `Bearer ${alice}` },
        payload: { role: 'editor' },
      });
      expect(promote.statusCode).toBe(403);

      const demote = await app.inject({
        method: 'PATCH',
        url: `/v1/workspaces/${workspaceId}/members/${editors[0]?.id}`,
        headers: { authorization: `Bearer ${alice}` },
        payload: { role: 'viewer' },
      });
      expect(demote.statusCode).toBe(200);

      const retry = await app.inject({
        method: 'PATCH',
        url: `/v1/workspaces/${workspaceId}/members/${viewer.id}`,
        headers: { authorization: `Bearer ${alice}` },
        payload: { role: 'editor' },
      });
      expect(retry.statusCode).toBe(200);
    });

    it('lets viewers join a full workspace but not editors', async () => {
      const { workspaceId, owner } = await fullStarterWorkspace('accept');
      const expiresAt = new Date(Date.now() + 3600_000);
      await db.insert(schema.invitations).values([
        { workspaceId, role: 'viewer', token: `v${run}`, invitedBy: owner.id, expiresAt },
        { workspaceId, role: 'editor', token: `e${run}`, invitedBy: owner.id, expiresAt },
      ]);

      const asViewer = await app.inject({
        method: 'POST',
        url: `/v1/invitations/v${run}/accept`,
        headers: { authorization: `Bearer auth0|accept-v-${run}` },
      });
      expect(asViewer.statusCode).toBe(200);

      const asEditor = await app.inject({
        method: 'POST',
        url: `/v1/invitations/e${run}/accept`,
        headers: { authorization: `Bearer auth0|accept-e-${run}` },
      });
      expect(asEditor.statusCode).toBe(403);
    });

    it('bills seats for editors and admins only', async () => {
      const { workspaceId } = await fullStarterWorkspace('seats');
      await db
        .insert(schema.workspaceSubscriptions)
        .values({ workspaceId, status: 'active', seatCount: 5 });

      const response = await app.inject({
        method: 'GET',
        url: `/v1/workspaces/${workspaceId}/billing`,
        headers: { authorization: `Bearer ${alice}` },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ seatCount: 5, memberCount: 6, seatMismatch: false });
    });

    /** A Stripe stand-in holding one subscription item, so retrieve sees what update set. */
    function fakeStripe(quantity: number) {
      const item = { id: 'si_seat', quantity };
      const retrieve = vi.fn(async (id: string) => ({ id, items: { data: [item] } }));
      const update = vi.fn(async (_id: string, params: { items: { quantity: number }[] }) => {
        item.quantity = params.items[0]?.quantity ?? item.quantity;
        return {};
      });
      return { client: { subscriptions: { retrieve, update } } as never, retrieve, update };
    }

    async function storedSeatCount(workspaceId: string) {
      const [row] = await db
        .select({ seatCount: schema.workspaceSubscriptions.seatCount })
        .from(schema.workspaceSubscriptions)
        .where(eq(schema.workspaceSubscriptions.workspaceId, workspaceId));
      return row?.seatCount;
    }

    it('resyncs the Stripe quantity with proration when billable members change', async () => {
      const { workspaceId, owner, editors, viewer } = await fullStarterWorkspace('resync');
      const subscriptionId = `sub_resync_${run}`;
      await db.insert(schema.workspaceSubscriptions).values({
        workspaceId,
        stripeSubscriptionId: subscriptionId,
        status: 'active',
        seatCount: 5,
      });
      const stripe = fakeStripe(5);
      const billed = await buildApp({ db, storage: storage as never, stripe: stripe.client });
      const headers = { authorization: `Bearer ${alice}` };
      const seatUpdate = (quantity: number) => [
        subscriptionId,
        { items: [{ id: 'si_seat', quantity }], proration_behavior: 'create_prorations' },
      ];

      try {
        const removeViewer = await billed.inject({
          method: 'DELETE',
          url: `/v1/workspaces/${workspaceId}/members/${viewer.id}`,
          headers,
        });
        expect(removeViewer.statusCode).toBe(204);
        expect(stripe.retrieve).not.toHaveBeenCalled();

        const demote = await billed.inject({
          method: 'PATCH',
          url: `/v1/workspaces/${workspaceId}/members/${editors[0]?.id}`,
          headers,
          payload: { role: 'viewer' },
        });
        expect(demote.statusCode).toBe(200);
        expect(stripe.update).toHaveBeenLastCalledWith(...seatUpdate(4));

        const remove = await billed.inject({
          method: 'DELETE',
          url: `/v1/workspaces/${workspaceId}/members/${editors[1]?.id}`,
          headers,
        });
        expect(remove.statusCode).toBe(204);
        expect(stripe.update).toHaveBeenLastCalledWith(...seatUpdate(3));
        expect(await storedSeatCount(workspaceId)).toBe(3);

        // Stripe down: the member still joins, and the next change catches the quantity up.
        stripe.update.mockRejectedValueOnce(new Error('Stripe unavailable'));
        await db.insert(schema.invitations).values({
          workspaceId,
          role: 'editor',
          token: `resync${run}`,
          invitedBy: owner.id,
          expiresAt: new Date(Date.now() + 3600_000),
        });
        const accept = await billed.inject({
          method: 'POST',
          url: `/v1/invitations/resync${run}/accept`,
          headers: { authorization: `Bearer auth0|resync-joiner-${run}` },
        });
        expect(accept.statusCode).toBe(200);
        expect(await storedSeatCount(workspaceId)).toBe(3);

        const promote = await billed.inject({
          method: 'PATCH',
          url: `/v1/workspaces/${workspaceId}/members/${editors[0]?.id}`,
          headers,
          payload: { role: 'editor' },
        });
        expect(promote.statusCode).toBe(200);
        expect(stripe.update).toHaveBeenLastCalledWith(...seatUpdate(5));
        expect(await storedSeatCount(workspaceId)).toBe(5);
      } finally {
        await billed.close();
      }
    });
  });

  describe('Stripe webhook', () => {
    async function paidWorkspace(slug: string) {
      const owner = await upsertAuthUser(db, alice, null);
      const [workspace] = await db
        .insert(schema.workspaces)
        .values({ name: 'billing', slug: `${slug}-${run}`, plan: 'team_pro', createdBy: owner.id })
        .returning();
      return workspace?.id ?? '';
    }

    function sendEvent(
      type: 'customer.subscription.updated' | 'customer.subscription.deleted',
      workspaceId: string,
      status: Stripe.Subscription.Status,
      created: number,
      id = `evt_${crypto.randomUUID()}`
    ) {
      const payload = JSON.stringify({
        id,
        object: 'event',
        type,
        created,
        data: {
          object: {
            id: `sub_${workspaceId}`,
            object: 'subscription',
            status,
            customer: 'cus_test',
            metadata: { workspaceId },
            items: { data: [{ price: { id: 'price_team_pro' }, quantity: 3 }] },
          },
        },
      });
      const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_test' });
      return app.inject({
        method: 'POST',
        url: '/v1/billing/webhook',
        headers: { 'content-type': 'application/json', 'stripe-signature': signature },
        payload,
      });
    }

    async function planOf(workspaceId: string) {
      const [row] = await db
        .select({ plan: schema.workspaces.plan })
        .from(schema.workspaces)
        .where(eq(schema.workspaces.id, workspaceId));
      return row?.plan;
    }

    it('drops paid features when the subscription becomes unpaid', async () => {
      const workspaceId = await paidWorkspace('unpaid');
      const now = Math.floor(Date.now() / 1000);

      const response = await sendEvent('customer.subscription.updated', workspaceId, 'unpaid', now);

      expect(response.statusCode).toBe(200);
      expect(await planOf(workspaceId)).toBe('free');
    });

    it('ignores an older event that arrives after a cancellation', async () => {
      const workspaceId = await paidWorkspace('late');
      const now = Math.floor(Date.now() / 1000);

      await sendEvent('customer.subscription.updated', workspaceId, 'active', now - 100);
      await sendEvent('customer.subscription.deleted', workspaceId, 'canceled', now);
      const late = await sendEvent(
        'customer.subscription.updated',
        workspaceId,
        'active',
        now - 50
      );

      expect(late.statusCode).toBe(200);
      expect(await planOf(workspaceId)).toBe('free');
    });

    it('treats a replayed event as a no-op', async () => {
      const workspaceId = await paidWorkspace('replay');
      const now = Math.floor(Date.now() / 1000);

      await sendEvent('customer.subscription.updated', workspaceId, 'active', now, 'evt_same');
      await sendEvent('customer.subscription.updated', workspaceId, 'active', now, 'evt_same');

      expect(await planOf(workspaceId)).toBe('team_pro');
      const subscriptions = await db
        .select()
        .from(schema.workspaceSubscriptions)
        .where(eq(schema.workspaceSubscriptions.workspaceId, workspaceId));
      expect(subscriptions).toHaveLength(1);
      expect(subscriptions[0]?.status).toBe('active');
    });
  });

  describe('account deletion', () => {
    async function workspace(
      slug: string,
      createdBy: string,
      members: [string, 'admin' | 'viewer'][]
    ) {
      const [row] = await db
        .insert(schema.workspaces)
        .values({ name: slug, slug: `${slug}-${run}`, plan: 'team_pro', createdBy })
        .returning();
      const id = row?.id ?? '';
      await db
        .insert(schema.workspaceMembers)
        .values(members.map(([userId, role]) => ({ workspaceId: id, userId, role })));
      return id;
    }

    async function collabDocument(workspaceId: string, createdBy: string) {
      const [doc] = await db
        .insert(schema.collabDocuments)
        .values({
          workspaceId,
          createdBy,
          screenshotStorageKey: `collab/${workspaceId}/${crypto.randomUUID()}`,
          screenshotMimeType: 'image/png',
          screenshotByteSize: 1,
          documentState: defaultCollabDocumentState(10, 10) as never,
        })
        .returning();
      return doc;
    }

    async function apiKey(workspaceId: string, createdBy: string) {
      const plaintext = buildApiKeyPlaintext(generateApiKeySecret());
      const [key] = await db
        .insert(schema.apiKeys)
        .values({
          workspaceId,
          name: 'key',
          keyPrefix: apiKeyDisplayPrefix(plaintext),
          keyHash: hashApiKey(plaintext),
          createdBy,
        })
        .returning();
      return key;
    }

    it('erases the user, their solo workspace and objects, and hands team data to an admin', async () => {
      const user = await upsertAuthUser(db, `auth0|erase-${run}`, null);
      const heir = await upsertAuthUser(db, `auth0|heir-${run}`, null);
      const [item] = await db
        .insert(schema.libraryItems)
        .values({
          userId: user.id,
          storageKey: `library/${user.id}/a`,
          mimeType: 'image/png',
          byteSize: 3,
        })
        .returning();
      await db.insert(schema.shares).values({
        userId: user.id,
        token: `erase${run}`,
        storageKey: `shares/${user.id}/erase${run}`,
        mimeType: 'image/png',
        byteSize: 3,
      });

      const solo = await workspace('solo', user.id, [[user.id, 'admin']]);
      await db.insert(schema.workspaceSubscriptions).values({
        workspaceId: solo,
        stripeSubscriptionId: `sub_${run}`,
        status: 'active',
      });
      const soloDoc = await collabDocument(solo, user.id);
      const soloKey = await apiKey(solo, user.id);
      await db.insert(schema.apiCaptures).values({
        workspaceId: solo,
        apiKeyId: soloKey?.id ?? '',
        storageKey: `api-captures/${solo}/c`,
        exportStorageKey: `api-captures/${solo}/c/export.png`,
        documentState: defaultCollabDocumentState(10, 10) as never,
        mimeType: 'image/png',
        byteSize: 3,
      });

      const team = await workspace('team', user.id, [
        [user.id, 'admin'],
        [heir.id, 'admin'],
      ]);
      const teamDoc = await collabDocument(team, user.id);
      const teamKey = await apiKey(team, user.id);
      await db.insert(schema.invitations).values({
        workspaceId: team,
        role: 'viewer',
        token: `inv-${run}`,
        invitedBy: user.id,
        expiresAt: new Date(Date.now() + 3_600_000),
      });
      await db
        .insert(schema.comments)
        .values({ documentId: teamDoc?.id ?? '', userId: user.id, body: 'mine' });

      const cancel = vi.fn(async () => ({}));
      const result = await deleteUserAccount(
        db,
        storage as never,
        { subscriptions: { cancel } } as never,
        user.id
      );

      expect(result).toEqual({ status: 'deleted', orphanedObjects: 0 });
      expect(cancel).toHaveBeenCalledWith(`sub_${run}`);
      expect(await db.select().from(schema.users).where(eq(schema.users.id, user.id))).toEqual([]);
      expect(
        await db.select().from(schema.workspaces).where(eq(schema.workspaces.id, solo))
      ).toEqual([]);
      const [teamRow] = await db
        .select()
        .from(schema.workspaces)
        .where(eq(schema.workspaces.id, team));
      expect(teamRow?.createdBy).toBe(heir.id);
      const [teamDocRow] = await db
        .select()
        .from(schema.collabDocuments)
        .where(eq(schema.collabDocuments.id, teamDoc?.id ?? ''));
      expect(teamDocRow?.createdBy).toBe(heir.id);
      const [teamKeyRow] = await db
        .select()
        .from(schema.apiKeys)
        .where(eq(schema.apiKeys.id, teamKey?.id ?? ''));
      expect(teamKeyRow?.revokedAt).not.toBeNull();
      expect(
        await db
          .select()
          .from(schema.libraryItems)
          .where(eq(schema.libraryItems.id, item?.id ?? ''))
      ).toEqual([]);
      expect(
        await db.select().from(schema.comments).where(eq(schema.comments.userId, user.id))
      ).toEqual([]);
      expect(deletedObjects).toEqual(
        expect.arrayContaining([
          `library/${user.id}/a`,
          `shares/${user.id}/erase${run}`,
          soloDoc?.screenshotStorageKey,
          `api-captures/${solo}/c`,
          `api-captures/${solo}/c/export.png`,
        ])
      );
      expect(deletedObjects).not.toContain(teamDoc?.screenshotStorageKey);
    });

    it('refuses while the user is the only admin of a team', async () => {
      const sub = `auth0|lone-admin-${run}`;
      const user = await upsertAuthUser(db, sub, null);
      const viewer = await upsertAuthUser(db, `auth0|viewer-${run}`, null);
      const team = await workspace('lone', user.id, [
        [user.id, 'admin'],
        [viewer.id, 'viewer'],
      ]);

      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/users/me',
        headers: { authorization: `Bearer ${sub}` },
      });

      expect(response.statusCode).toBe(409);
      expect(response.json().workspaces).toEqual([{ id: team, name: 'lone' }]);
      expect(await db.select().from(schema.users).where(eq(schema.users.id, user.id))).toHaveLength(
        1
      );
    });

    it('lowers the Stripe quantity of the teams a deleted user leaves', async () => {
      const user = await upsertAuthUser(db, `auth0|leaver-${run}`, null);
      const heir = await upsertAuthUser(db, `auth0|stayer-${run}`, null);
      const team = await workspace('leaver', heir.id, [
        [heir.id, 'admin'],
        [user.id, 'admin'],
      ]);
      await db.insert(schema.workspaceSubscriptions).values({
        workspaceId: team,
        stripeSubscriptionId: `sub_leave_${run}`,
        status: 'active',
        seatCount: 2,
      });
      const retrieve = vi.fn(async (id: string) => ({
        id,
        items: { data: [{ id: 'si_seat', quantity: 2 }] },
      }));
      const update = vi.fn(async () => ({}));

      const result = await deleteUserAccount(
        db,
        storage as never,
        { subscriptions: { retrieve, update } } as never,
        user.id
      );

      expect(result.status).toBe('deleted');
      expect(update).toHaveBeenCalledWith(`sub_leave_${run}`, {
        items: [{ id: 'si_seat', quantity: 1 }],
        proration_behavior: 'create_prorations',
      });
    });

    it('keeps everything when a paid solo workspace cannot be cancelled', async () => {
      const user = await upsertAuthUser(db, `auth0|nostripe-${run}`, null);
      const solo = await workspace('nostripe', user.id, [[user.id, 'admin']]);
      await db.insert(schema.workspaceSubscriptions).values({
        workspaceId: solo,
        stripeSubscriptionId: `sub_ns_${run}`,
        status: 'active',
      });

      await expect(deleteUserAccount(db, storage as never, null, user.id)).rejects.toBeInstanceOf(
        BillingCancellationError
      );
      expect(
        await db.select().from(schema.workspaces).where(eq(schema.workspaces.id, solo))
      ).toHaveLength(1);
    });

    it('deletes through the route and is idempotent', async () => {
      const sub = `auth0|route-erase-${run}`;
      await upsertAuthUser(db, sub, null);
      const request = {
        method: 'DELETE' as const,
        url: '/v1/users/me',
        headers: { authorization: `Bearer ${sub}` },
      };

      const first = await app.inject(request);
      expect(first.statusCode).toBe(200);
      expect(first.json()).toEqual({ deleted: true, identityDeleted: false });

      expect((await app.inject(request)).statusCode).toBe(204);
      expect(await db.select().from(schema.users).where(eq(schema.users.auth0Sub, sub))).toEqual(
        []
      );
    });
  });
});
