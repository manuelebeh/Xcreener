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

async function applyToken(token: string | null): Promise<void> {
  const entitlement = token ? await verifyEntitlement(token) : null;
  useEntitlementStore.setState({ entitlement });
}

/** Boot: trust only what still verifies. A forged or edited token falls back to free. */
export async function loadStoredEntitlement(): Promise<void> {
  await applyToken(await getSetting(SETTING_KEYS.entitlementToken));
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

  const { token } = (await response.json()) as { token: string };
  await setSetting(SETTING_KEYS.entitlementToken, token);
  await applyToken(token);
}

export async function clearEntitlement(): Promise<void> {
  await setSetting(SETTING_KEYS.entitlementToken, '');
  useEntitlementStore.setState({ entitlement: null });
}

export function isPaidEntitlement(entitlement: Entitlement | null, now = Date.now()): boolean {
  return Boolean(entitlement && isPaidPlan(entitlement.plan) && entitlement.expiresAt * 1000 > now);
}

export function hasPaidEntitlement(): boolean {
  return isPaidEntitlement(useEntitlementStore.getState().entitlement);
}
