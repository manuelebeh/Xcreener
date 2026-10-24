import { and, asc, eq, inArray, isNotNull, ne } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type Stripe from 'stripe';
import * as schema from '../db/schema';
import type { StorageService } from './storage';

type Database = PostgresJsDatabase<typeof schema>;

export interface BlockingWorkspace {
  id: string;
  name: string;
}

export type AccountDeletionResult =
  | { status: 'blocked'; workspaces: BlockingWorkspace[] }
  | { status: 'deleted'; orphanedObjects: number };

/** A paid solo workspace could not be cancelled in Stripe; nothing was deleted. */
export class BillingCancellationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BillingCancellationError';
  }
}

interface WorkspacePlanForUser {
  solo: string[];
  /** Workspace id -> member who takes over what the user created there. */
  heirs: Map<string, string>;
  blocked: BlockingWorkspace[];
}

/**
 * Sorts every workspace the user touches. Solo (no other member) is deleted, a team where the
 * user is the only admin blocks deletion, any other team keeps going with an heir.
 */
async function planWorkspaces(db: Database, userId: string): Promise<WorkspacePlanForUser> {
  const [memberOf, created, documents, keys] = await Promise.all([
    db
      .select({ id: schema.workspaceMembers.workspaceId })
      .from(schema.workspaceMembers)
      .where(eq(schema.workspaceMembers.userId, userId)),
    db
      .select({ id: schema.workspaces.id })
      .from(schema.workspaces)
      .where(eq(schema.workspaces.createdBy, userId)),
    db
      .selectDistinct({ id: schema.collabDocuments.workspaceId })
      .from(schema.collabDocuments)
      .where(eq(schema.collabDocuments.createdBy, userId)),
    db
      .selectDistinct({ id: schema.apiKeys.workspaceId })
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.createdBy, userId)),
  ]);
  const workspaceIds = [
    ...new Set([...memberOf, ...created, ...documents, ...keys].map((r) => r.id)),
  ];

  const result: WorkspacePlanForUser = { solo: [], heirs: new Map(), blocked: [] };
  if (workspaceIds.length === 0) {
    return result;
  }

  const [workspaces, members] = await Promise.all([
    db
      .select({ id: schema.workspaces.id, name: schema.workspaces.name })
      .from(schema.workspaces)
      .where(inArray(schema.workspaces.id, workspaceIds)),
    db
      .select({
        workspaceId: schema.workspaceMembers.workspaceId,
        userId: schema.workspaceMembers.userId,
        role: schema.workspaceMembers.role,
      })
      .from(schema.workspaceMembers)
      .where(inArray(schema.workspaceMembers.workspaceId, workspaceIds))
      .orderBy(asc(schema.workspaceMembers.joinedAt)),
  ]);

  for (const workspace of workspaces) {
    const inWorkspace = members.filter((m) => m.workspaceId === workspace.id);
    const others = inWorkspace.filter((m) => m.userId !== userId);
    const isAdmin = inWorkspace.some((m) => m.userId === userId && m.role === 'admin');
    const otherAdmin = others.find((m) => m.role === 'admin');

    if (others.length === 0) {
      result.solo.push(workspace.id);
    } else if (isAdmin && !otherAdmin) {
      result.blocked.push(workspace);
    } else {
      result.heirs.set(workspace.id, (otherAdmin ?? others[0])?.userId ?? '');
    }
  }
  return result;
}

async function cancelSoloSubscriptions(
  db: Database,
  stripe: Stripe | null,
  soloIds: string[]
): Promise<void> {
  if (soloIds.length === 0) {
    return;
  }
  const subscriptions = await db
    .select({ id: schema.workspaceSubscriptions.stripeSubscriptionId })
    .from(schema.workspaceSubscriptions)
    .where(
      and(
        inArray(schema.workspaceSubscriptions.workspaceId, soloIds),
        isNotNull(schema.workspaceSubscriptions.stripeSubscriptionId),
        ne(schema.workspaceSubscriptions.status, 'canceled')
      )
    );
  if (subscriptions.length === 0) {
    return;
  }
  if (!stripe) {
    throw new BillingCancellationError('Stripe is not configured');
  }
  for (const subscription of subscriptions) {
    try {
      await stripe.subscriptions.cancel(subscription.id ?? '');
    } catch (error) {
      throw new BillingCancellationError(
        error instanceof Error ? error.message : 'Subscription cancel failed'
      );
    }
  }
}

async function collectStorageKeys(db: Database, userId: string, soloIds: string[]) {
  const keys: string[] = [];
  const [shares, library] = await Promise.all([
    db
      .select({ key: schema.shares.storageKey })
      .from(schema.shares)
      .where(eq(schema.shares.userId, userId)),
    db
      .select({ key: schema.libraryItems.storageKey })
      .from(schema.libraryItems)
      .where(eq(schema.libraryItems.userId, userId)),
  ]);
  keys.push(...shares.map((r) => r.key), ...library.map((r) => r.key));

  if (soloIds.length > 0) {
    const [documents, captures, brandKits] = await Promise.all([
      db
        .select({ key: schema.collabDocuments.screenshotStorageKey })
        .from(schema.collabDocuments)
        .where(inArray(schema.collabDocuments.workspaceId, soloIds)),
      db
        .select({
          key: schema.apiCaptures.storageKey,
          exportKey: schema.apiCaptures.exportStorageKey,
        })
        .from(schema.apiCaptures)
        .where(inArray(schema.apiCaptures.workspaceId, soloIds)),
      db
        .select({ key: schema.brandKits.logoStorageKey })
        .from(schema.brandKits)
        .where(inArray(schema.brandKits.workspaceId, soloIds)),
    ]);
    keys.push(...documents.map((r) => r.key));
    for (const capture of captures) {
      keys.push(capture.key);
      if (capture.exportKey) {
        keys.push(capture.exportKey);
      }
    }
    for (const kit of brandKits) {
      if (kit.key) {
        keys.push(kit.key);
      }
    }
  }
  return keys;
}

/**
 * Deletes a user's cloud data (GDPR erasure). Stripe is cancelled before any row is touched,
 * rows go in one transaction, and storage objects are removed afterwards on a best-effort basis.
 */
export async function deleteUserAccount(
  db: Database,
  storage: StorageService,
  stripe: Stripe | null,
  userId: string
): Promise<AccountDeletionResult> {
  const plan = await planWorkspaces(db, userId);
  if (plan.blocked.length > 0) {
    return { status: 'blocked', workspaces: plan.blocked };
  }

  await cancelSoloSubscriptions(db, stripe, plan.solo);
  const storageKeys = await collectStorageKeys(db, userId, plan.solo);

  await db.transaction(async (tx) => {
    if (plan.solo.length > 0) {
      // api_captures restricts api_keys, so captures go before the workspace cascade.
      await tx.delete(schema.apiCaptures).where(inArray(schema.apiCaptures.workspaceId, plan.solo));
      await tx.delete(schema.workspaces).where(inArray(schema.workspaces.id, plan.solo));
    }

    const now = new Date();
    for (const [workspaceId, heirId] of plan.heirs) {
      await tx
        .update(schema.workspaces)
        .set({ createdBy: heirId, updatedAt: now })
        .where(and(eq(schema.workspaces.id, workspaceId), eq(schema.workspaces.createdBy, userId)));
      await tx
        .update(schema.collabDocuments)
        .set({ createdBy: heirId })
        .where(
          and(
            eq(schema.collabDocuments.workspaceId, workspaceId),
            eq(schema.collabDocuments.createdBy, userId)
          )
        );
      // The keys stay as records for their captures but stop working.
      await tx
        .update(schema.apiKeys)
        .set({ createdBy: heirId, revokedAt: now })
        .where(
          and(eq(schema.apiKeys.workspaceId, workspaceId), eq(schema.apiKeys.createdBy, userId))
        );
    }

    await tx.delete(schema.invitations).where(eq(schema.invitations.invitedBy, userId));
    await tx.delete(schema.users).where(eq(schema.users.id, userId));
  });

  let orphanedObjects = 0;
  for (const key of storageKeys) {
    try {
      await storage.deleteObject(key);
    } catch (error) {
      orphanedObjects += 1;
      console.error('Orphaned object after account deletion', key, error);
    }
  }
  return { status: 'deleted', orphanedObjects };
}
