import AsyncStorage from '@react-native-async-storage/async-storage';
import { isPaidPlan } from '@xcreener/team-core';
import { type VerifiedEntitlement, verifyEntitlementToken } from '@xcreener/team-core/entitlement';
import { create } from 'zustand';

import * as auth from './auth';
import { getApiUrl, getEntitlementPublicKey } from './config';

const ENTITLEMENT_TOKEN_KEY = 'xcreener:entitlementToken';
/** Internal user id the API returned with the token; the token's `sub` must match it. */
const ENTITLEMENT_USER_KEY = 'xcreener:entitlementUserId';

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

/**
 * Verifies on every load: an edited token, or one issued to another account, fails and
 * falls back to free.
 */
function applyToken(token: string | null, userId: string | null): void {
  const publicKey = getEntitlementPublicKey();
  const entitlement =
    token && userId && publicKey
      ? verifyEntitlementToken(token, publicKey, nowSeconds(), userId)
      : null;
  useAccountStore.setState({ entitlement });
}

async function clearEntitlement(): Promise<void> {
  await AsyncStorage.multiRemove([ENTITLEMENT_TOKEN_KEY, ENTITLEMENT_USER_KEY]);
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

  const { token, userId } = (await response.json()) as { token: string; userId: string };
  await AsyncStorage.multiSet([
    [ENTITLEMENT_TOKEN_KEY, token],
    [ENTITLEMENT_USER_KEY, userId],
  ]);
  applyToken(token, userId);
}

/** App launch: apply the cached plan first so the editor never waits on the network. */
export async function bootstrapAccount(): Promise<void> {
  const [[, token], [, userId]] = await AsyncStorage.multiGet([
    ENTITLEMENT_TOKEN_KEY,
    ENTITLEMENT_USER_KEY,
  ]);
  applyToken(token, userId);
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

/** Erases the cloud account on the API, then signs out. Local edits stay on the device. */
export async function deleteAccount(): Promise<void> {
  useAccountStore.setState({ busy: true, error: null });
  try {
    const accessToken = await auth.getValidAccessToken();
    if (!accessToken) {
      throw new Error('Sign in first');
    }
    const response = await fetch(`${getApiUrl()}/v1/users/me`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        workspaces?: { name: string }[];
      } | null;
      const names = payload?.workspaces?.map((workspace) => workspace.name).join(', ');
      throw new Error(
        names
          ? `Make another member an admin of ${names} before deleting your account.`
          : (payload?.error ?? `Account deletion failed (${response.status})`)
      );
    }
    await signOut();
  } catch (error) {
    useAccountStore.setState({ error: error instanceof Error ? error.message : String(error) });
  } finally {
    useAccountStore.setState({ busy: false });
  }
}

export function usePremiumAccess(): boolean {
  const entitlement = useAccountStore((state) => state.entitlement);
  return Boolean(
    entitlement && isPaidPlan(entitlement.plan) && entitlement.expiresAt > nowSeconds()
  );
}
