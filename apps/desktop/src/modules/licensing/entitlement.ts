import { isPaidPlan } from '@snapglow/team-core';
import { create } from 'zustand';
import { getSetting, setSetting } from '@/db';
import { getValidAccessToken } from '@/modules/cloud/auth';
import { getApiUrl } from '@/modules/cloud/config';
import type { Entitlement } from '@/shared/types/ipc';
import { SETTING_KEYS } from '@/shared/types/settings';
import { verifyEntitlement } from '@/tauri/commands';

interface EntitlementState {
  /** Only ever set from a token Rust verified against the API public key. */
  entitlement: Entitlement | null;
}

export const useEntitlementStore = create<EntitlementState>(() => ({ entitlement: null }));

async function applyToken(token: string | null, userId: string | null): Promise<void> {
  const entitlement = token && userId ? await verifyEntitlement(token, userId) : null;
  useEntitlementStore.setState({ entitlement });
}

/**
 * Boot: trust only what still verifies. A forged or edited token, or one issued to another
 * account, falls back to free.
 */
export async function loadStoredEntitlement(): Promise<void> {
  await applyToken(
    await getSetting(SETTING_KEYS.entitlementToken),
    await getSetting(SETTING_KEYS.entitlementUserId)
  );
}

/** Online: fetch a fresh token. Network or server errors keep the cached one (offline grace). */
export async function refreshEntitlement(): Promise<void> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return;
  }

  let response: Response;
  try {
    response = await fetch(`${getApiUrl()}/v1/me/entitlement`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    return;
  }

  if (response.status === 401) {
    await clearEntitlement();
    return;
  }
  if (!response.ok) {
    return;
  }

  const { token, userId } = (await response.json()) as { token: string; userId: string };
  await setSetting(SETTING_KEYS.entitlementToken, token);
  await setSetting(SETTING_KEYS.entitlementUserId, userId);
  await applyToken(token, userId);
}

export async function clearEntitlement(): Promise<void> {
  await setSetting(SETTING_KEYS.entitlementToken, '');
  await setSetting(SETTING_KEYS.entitlementUserId, '');
  useEntitlementStore.setState({ entitlement: null });
}

export function isPaidEntitlement(entitlement: Entitlement | null, now = Date.now()): boolean {
  return Boolean(entitlement && isPaidPlan(entitlement.plan) && entitlement.expiresAt * 1000 > now);
}

export function hasPaidEntitlement(): boolean {
  return isPaidEntitlement(useEntitlementStore.getState().entitlement);
}
