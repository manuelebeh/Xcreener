import { getSetting, setSetting } from '@/db';
import { secureStoreDelete, secureStoreGet, secureStoreSet } from '@/tauri/commands';
import { isTauriRuntime } from './tauri';

/**
 * Secrets (OAuth tokens) live in the OS keychain through Rust, not in the SQLite settings table
 * that any local process can read. Outside Tauri (browser dev, Playwright) there is no keychain,
 * so the legacy settings row is used. A plaintext row written by an older version is moved into
 * the keychain on first read.
 */
export async function readSecret(name: string, legacySettingKey: string): Promise<string | null> {
  if (!isTauriRuntime()) {
    return (await getSetting(legacySettingKey)) || null;
  }

  const stored = await secureStoreGet(name);
  if (stored) {
    return stored;
  }

  const legacy = await getSetting(legacySettingKey);
  if (!legacy) {
    return null;
  }
  await secureStoreSet(name, legacy);
  await setSetting(legacySettingKey, '');
  return legacy;
}

export async function writeSecret(
  name: string,
  legacySettingKey: string,
  value: string
): Promise<void> {
  if (!isTauriRuntime()) {
    await setSetting(legacySettingKey, value);
    return;
  }

  await secureStoreSet(name, value);
  await setSetting(legacySettingKey, '');
}

export async function removeSecret(name: string, legacySettingKey: string): Promise<void> {
  if (isTauriRuntime()) {
    await secureStoreDelete(name);
  }
  await setSetting(legacySettingKey, '');
}
