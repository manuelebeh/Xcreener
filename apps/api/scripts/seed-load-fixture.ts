/**
 * Seeds Team Pro workspace + API key + capture for k6 load tests.
 * Usage: dotenv -e .env.local -- tsx scripts/seed-load-fixture.ts
 */
import { buildApiKeyPlaintext } from '@snapglow/api-core';
import { generateApiKeySecret, hashApiKey } from '@snapglow/api-core/api-keys';
import { eq } from 'drizzle-orm';
import { createDb } from '../src/db/migrate';
import * as schema from '../src/db/schema';
import { StorageService } from '../src/services/storage';

const LOAD_FIXTURE_SUB = 'load-test|snapglow';
const LOAD_FIXTURE_SLUG = 'load-test-workspace';

const MINIMAL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

async function main() {
  const { db, client } = createDb();
  const storage = new StorageService();
  await storage.ensureBucket();

  let user = (
    await db.select().from(schema.users).where(eq(schema.users.auth0Sub, LOAD_FIXTURE_SUB)).limit(1)
  )[0];

  if (!user) {
    const inserted = await db
      .insert(schema.users)
      .values({ auth0Sub: LOAD_FIXTURE_SUB, email: 'load-test@snapglow.local' })
      .returning();
    user = inserted[0]!;
  }

  let workspace = (
    await db
      .select()
      .from(schema.workspaces)
      .where(eq(schema.workspaces.slug, LOAD_FIXTURE_SLUG))
      .limit(1)
  )[0];

  if (!workspace) {
    const inserted = await db
      .insert(schema.workspaces)
      .values({
        name: 'Load Test Workspace',
        slug: LOAD_FIXTURE_SLUG,
        plan: 'team_pro',
        createdBy: user.id,
      })
      .returning();
    workspace = inserted[0]!;

    await db.insert(schema.workspaceMembers).values({
      workspaceId: workspace.id,
      userId: user.id,
      role: 'admin',
    });
  } else if (workspace.plan !== 'team_pro') {
    await db
      .update(schema.workspaces)
      .set({ plan: 'team_pro', updatedAt: new Date() })
      .where(eq(schema.workspaces.id, workspace.id));
  }

  const secret = generateApiKeySecret();
  const plaintext = buildApiKeyPlaintext(secret);
  const keyHash = hashApiKey(plaintext);
  const keyPrefix = plaintext.slice(0, 12);

  const existingKey = (
    await db.select().from(schema.apiKeys).where(eq(schema.apiKeys.keyHash, keyHash)).limit(1)
  )[0];

  let apiKey = existingKey;
  if (!apiKey) {
    const inserted = await db
      .insert(schema.apiKeys)
      .values({
        workspaceId: workspace.id,
        name: 'load-test',
        keyPrefix,
        keyHash,
        createdBy: user.id,
      })
      .returning();
    apiKey = inserted[0]!;
  }

  const storageKey = `load-test/${workspace.id}/fixture.png`;
  await storage.uploadObject(storageKey, MINIMAL_PNG, 'image/png');

  let capture = (
    await db
      .select()
      .from(schema.apiCaptures)
      .where(eq(schema.apiCaptures.workspaceId, workspace.id))
      .limit(1)
  )[0];

  if (!capture) {
    const inserted = await db
      .insert(schema.apiCaptures)
      .values({
        workspaceId: workspace.id,
        apiKeyId: apiKey.id,
        storageKey,
        mimeType: 'image/png',
        byteSize: MINIMAL_PNG.length,
        title: 'Load test capture',
        documentState: { annotations: [], layout: null },
      })
      .returning();
    capture = inserted[0]!;
  }

  await client.end();

  console.log('Load test fixture ready:');
  console.log(`LOAD_TEST_API_KEY=${plaintext}`);
  console.log(`LOAD_TEST_CAPTURE_ID=${capture.id}`);
  console.log(`LOAD_TEST_BASE_URL=${process.env.LOAD_TEST_BASE_URL ?? 'http://localhost:8787'}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
