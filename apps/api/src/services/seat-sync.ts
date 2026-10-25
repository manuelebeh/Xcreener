import { isBillableRole } from '@snapglow/team-core';
import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type Stripe from 'stripe';
import * as schema from '../db/schema';

type Database = PostgresJsDatabase<typeof schema>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
type SubscriptionStatus = (typeof schema.subscriptionStatusEnum.enumValues)[number];

/** Statuses that keep paid features. `past_due` covers Stripe's retry window before unpaid/cancel. */
export const PAID_STATUSES: ReadonlySet<SubscriptionStatus> = new Set([
  'active',
  'trialing',
  'past_due',
]);

/** Members on a paid seat: what the plan member limit counts. Viewers are free. */
export async function countBillableMembers(
  db: Database | Transaction,
  workspaceId: string
): Promise<number> {
  const rows = await db
    .select()
    .from(schema.workspaceMembers)
    .where(eq(schema.workspaceMembers.workspaceId, workspaceId));
  return rows.filter((row) => isBillableRole(row.role)).length;
}

/**
 * Sets the Stripe subscription quantity to the number of billable members, with proration.
 * Call it after a member joins, leaves or changes role. A no-op without a paid subscription or
 * when the stored seat count already matches, so a failed call is retried by the next change.
 */
export async function syncSeatQuantity(
  db: Database,
  stripe: Stripe | null,
  workspaceId: string
): Promise<void> {
  const [subscription] = await db
    .select()
    .from(schema.workspaceSubscriptions)
    .where(eq(schema.workspaceSubscriptions.workspaceId, workspaceId))
    .limit(1);
  if (
    !stripe ||
    !subscription?.stripeSubscriptionId ||
    !subscription.status ||
    !PAID_STATUSES.has(subscription.status)
  ) {
    return;
  }

  const quantity = Math.max(1, await countBillableMembers(db, workspaceId));
  if (quantity === subscription.seatCount) {
    return;
  }

  const current = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
  const item = current.items.data[0];
  if (!item) {
    return;
  }
  if (item.quantity !== quantity) {
    await stripe.subscriptions.update(current.id, {
      items: [{ id: item.id, quantity }],
      proration_behavior: 'create_prorations',
    });
  }

  // The customer.subscription.updated webhook writes the same value; this keeps seatMismatch
  // right in the meantime.
  await db
    .update(schema.workspaceSubscriptions)
    .set({ seatCount: quantity, updatedAt: new Date() })
    .where(eq(schema.workspaceSubscriptions.workspaceId, workspaceId));
}
