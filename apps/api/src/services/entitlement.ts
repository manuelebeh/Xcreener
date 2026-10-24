import type { WorkspacePlan } from '@snapglow/team-core';
import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { importPKCS8, SignJWT } from 'jose';
import * as schema from '../db/schema';
import { env } from '../env';

/** Offline grace period: a paid desktop keeps its plan this long without reaching the API. */
export const ENTITLEMENT_TTL_SECONDS = 7 * 24 * 60 * 60;

const PLAN_RANK: Record<WorkspacePlan, number> = { free: 0, team_starter: 1, team_pro: 2 };

/**
 * Highest plan across the workspaces where the user is an editor or admin. Viewers are
 * not paid seats, so a viewer role alone gives the free plan.
 */
export async function bestPlanForUser(
  db: PostgresJsDatabase<typeof schema>,
  userId: string
): Promise<WorkspacePlan> {
  const rows = await db
    .select({ workspace: schema.workspaces, role: schema.workspaceMembers.role })
    .from(schema.workspaceMembers)
    .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.workspaceMembers.workspaceId))
    .where(eq(schema.workspaceMembers.userId, userId));

  return rows
    .filter((row) => row.role !== 'viewer')
    .reduce<WorkspacePlan>(
      (best, row) => (PLAN_RANK[row.workspace.plan] > PLAN_RANK[best] ? row.workspace.plan : best),
      'free'
    );
}

/** EdDSA JWT the desktop verifies with the matching public key. Null when no key is configured. */
export async function signEntitlement(input: {
  userId: string;
  plan: WorkspacePlan;
}): Promise<string | null> {
  if (!env.ENTITLEMENT_PRIVATE_KEY) {
    return null;
  }

  // Env files often carry the PEM on one line with literal "\n".
  const key = await importPKCS8(env.ENTITLEMENT_PRIVATE_KEY.replaceAll('\\n', '\n'), 'EdDSA');
  return new SignJWT({ plan: input.plan })
    .setProtectedHeader({ alg: 'EdDSA' })
    .setSubject(input.userId)
    .setIssuedAt()
    .setExpirationTime(`${ENTITLEMENT_TTL_SECONDS}s`)
    .sign(key);
}
