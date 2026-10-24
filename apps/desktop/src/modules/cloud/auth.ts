import { initDatabase } from '@/db';
import { deepLinkRoute } from '@/shared/lib/deepLink';
import { isTauriRuntime } from '@/shared/lib/tauri';
import {
  cloudAccessToken,
  cloudAuthComplete,
  cloudAuthStart,
  cloudSignOut,
} from '@/tauri/commands';

/**
 * Rust (`src-tauri/src/cloud_auth.rs`) runs the PKCE login, the code exchange and the refresh,
 * and keeps the refresh token in the keychain. This side only ever sees the access token.
 */

export async function startAuthLogin(): Promise<void> {
  await startAuthLoginWithOrganization(null);
}

export async function startAuthLoginWithOrganization(organization: string | null): Promise<void> {
  await cloudAuthStart(organization);
}

export async function handleAuthCallback(url: string): Promise<boolean> {
  if (deepLinkRoute(new URL(url)) !== 'auth/callback') {
    return false;
  }
  await cloudAuthComplete(url);
  return true;
}

export async function getValidAccessToken(): Promise<string | null> {
  if (!isTauriRuntime()) {
    return null;
  }
  // Rust moves a token row left in SQLite by an old version into the keychain.
  await initDatabase();
  return cloudAccessToken();
}

export async function signOutCloud(): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }
  await initDatabase();
  await cloudSignOut();
}

export async function getCloudAccountLabel(): Promise<string | null> {
  const token = await getValidAccessToken();
  if (!token) {
    return null;
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as { email?: string };
    return payload.email ?? 'Signed in';
  } catch {
    return 'Signed in';
  }
}
