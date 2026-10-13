import { and, eq, isNotNull, lt } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../db/schema';
import type { StorageService } from './storage';

const BATCH_SIZE = 100;

/** Deletes expired shares (row and object) so an expired link stops costing storage. */
export async function purgeExpiredShares(
  db: PostgresJsDatabase<typeof schema>,
  storage: StorageService,
  now = new Date()
): Promise<number> {
  const expired = await db
    .select({ id: schema.shares.id, storageKey: schema.shares.storageKey })
    .from(schema.shares)
    .where(and(isNotNull(schema.shares.expiresAt), lt(schema.shares.expiresAt, now)))
    .limit(BATCH_SIZE);

  let purged = 0;
  for (const share of expired) {
    try {
      await storage.deleteObject(share.storageKey);
      await db.delete(schema.shares).where(eq(schema.shares.id, share.id));
      purged += 1;
    } catch (error) {
      console.error('Failed to purge expired share', share.id, error);
    }
  }
  return purged;
}
