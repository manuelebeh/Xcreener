import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../db/schema';
import { env } from '../env';

interface Auth0Organization {
  id: string;
  name: string;
}

export async function createAuth0Organization(
  displayName: string,
  slug: string
): Promise<Auth0Organization | null> {
  if (!env.AUTH0_MANAGEMENT_CLIENT_ID || !env.AUTH0_MANAGEMENT_CLIENT_SECRET) {
    return null;
  }

  const tokenResponse = await fetch(`https://${env.AUTH0_DOMAIN}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.AUTH0_MANAGEMENT_CLIENT_ID,
      client_secret: env.AUTH0_MANAGEMENT_CLIENT_SECRET,
      audience: `https://${env.AUTH0_DOMAIN}/api/v2/`,
      grant_type: 'client_credentials',
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!tokenResponse.ok) {
    return null;
  }

  const tokenPayload = (await tokenResponse.json()) as { access_token?: string };
  if (!tokenPayload.access_token) {
    return null;
  }

  const orgResponse = await fetch(`https://${env.AUTH0_DOMAIN}/api/v2/organizations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenPayload.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: slug,
      display_name: displayName,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!orgResponse.ok) {
    return null;
  }

  return (await orgResponse.json()) as Auth0Organization;
}

export async function resolveWorkspaceByAuth0OrgId(
  db: PostgresJsDatabase<typeof schema>,
  orgId: string
): Promise<string | null> {
  const rows = await db
    .select({ id: schema.workspaces.id })
    .from(schema.workspaces)
    .where(eq(schema.workspaces.auth0OrgId, orgId))
    .limit(1);
  return rows[0]?.id ?? null;
}
