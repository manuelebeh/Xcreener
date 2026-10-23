import AsyncStorage from '@react-native-async-storage/async-storage';
import { isPaidPlan } from '@snapglow/team-core';
import { type VerifiedEntitlement, verifyEntitlementToken } from '@snapglow/team-core/entitlement';
import { create } from 'zustand';

import * as auth from './auth';
import { getApiUrl, getEntitlementPublicKey } from './config';

const ENTITLEMENT_TOKEN_KEY = 'snapglow:entitlementToken';

interface AccountState {
  signedIn: boolean;
  /** Only ever set from a token whose API signature checked out. */
  entitlement: VerifiedEntitlement | null;
  busy: boolean;
  error: string | null;
}

export const useAccountStore = create<AccountState>(() => ({
  signedIn: false,
  entitlement: null,
  busy: false,
  error: null,
}));

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/** Verifies on every load: an edited or copied token fails and falls back to free. */
function applyToken(token: string | null): void {
  const publicKey = getEntitlementPublicKey();
  const entitlement =
    token && publicKey ? verifyEntitlementToken(token, publicKey, nowSeconds()) : null;
  useAccountStore.setState({ entitlement });
}

async function clearEntitlement(): Promise<void> {
  await AsyncStorage.removeItem(ENTITLEMENT_TOKEN_KEY);
  useAccountStore.setState({ entitlement: null });
}

/** Online: fetch a fresh token. Network or server errors keep the cached one (offline grace). */
async function refreshEntitlement(): Promise<void> {
  const accessToken = await auth.getValidAccessToken();
  useAccountStore.setState({ signedIn: Boolean(accessToken) });
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
  await AsyncStorage.setItem(ENTITLEMENT_TOKEN_KEY, token);
  applyToken(token);
}

/** App launch: apply the cached plan first so the editor never waits on the network. */
export async function bootstrapAccount(): Promise<void> {
  applyToken(await AsyncStorage.getItem(ENTITLEMENT_TOKEN_KEY));
  await refreshEntitlement();
}

export async function signIn(): Promise<void> {
  useAccountStore.setState({ busy: true, error: null });
  try {
    if (await auth.signIn()) {
      await refreshEntitlement();
    }
  } catch (error) {
    useAccountStore.setState({ error: error instanceof Error ? error.message : String(error) });
  } finally {
    useAccountStore.setState({ busy: false });
  }
}

export async function signOut(): Promise<void> {
  await auth.signOut();
  await clearEntitlement();
  useAccountStore.setState({ signedIn: false, error: null });
}

export function usePremiumAccess(): boolean {
  const entitlement = useAccountStore((state) => state.entitlement);
  return Boolean(
    entitlement && isPaidPlan(entitlement.plan) && entitlement.expiresAt > nowSeconds()
  );
}
