import { beforeEach, describe, expect, it, vi } from 'vitest';

const settings = vi.hoisted(() => new Map<string, string>());
const keychain = vi.hoisted(() => new Map<string, string>());
const runtime = vi.hoisted(() => ({ tauri: true }));

vi.mock('@/db', () => ({
  getSetting: async (key: string) => settings.get(key) ?? null,
  setSetting: async (key: string, value: string) => {
    settings.set(key, value);
  },
}));
vi.mock('@/tauri/commands', () => ({
  secureStoreGet: async (name: string) => keychain.get(name) ?? null,
  secureStoreSet: async (name: string, value: string) => {
    keychain.set(name, value);
  },
  secureStoreDelete: async (name: string) => {
    keychain.delete(name);
  },
}));
vi.mock('./tauri', () => ({ isTauriRuntime: () => runtime.tauri }));

import { readSecret, removeSecret, writeSecret } from './secureStorage';

describe('secureStorage', () => {
  beforeEach(() => {
    settings.clear();
    keychain.clear();
    runtime.tauri = true;
  });

  it('moves a legacy plaintext row into the keychain on first read', async () => {
    settings.set('cloudAuthTokens', '{"accessToken":"a"}');

    expect(await readSecret('cloud.tokens', 'cloudAuthTokens')).toBe('{"accessToken":"a"}');
    expect(keychain.get('cloud.tokens')).toBe('{"accessToken":"a"}');
    expect(settings.get('cloudAuthTokens')).toBe('');
    expect(await readSecret('cloud.tokens', 'cloudAuthTokens')).toBe('{"accessToken":"a"}');
  });

  it('writes to the keychain and leaves nothing in SQLite', async () => {
    settings.set('cloudAuthTokens', 'old');
    await writeSecret('cloud.tokens', 'cloudAuthTokens', 'new');

    expect(keychain.get('cloud.tokens')).toBe('new');
    expect(settings.get('cloudAuthTokens')).toBe('');
  });

  it('removes both copies', async () => {
    await writeSecret('cloud.tokens', 'cloudAuthTokens', 'x');
    await removeSecret('cloud.tokens', 'cloudAuthTokens');

    expect(keychain.has('cloud.tokens')).toBe(false);
    expect(await readSecret('cloud.tokens', 'cloudAuthTokens')).toBeNull();
  });

  it('falls back to SQLite outside Tauri', async () => {
    runtime.tauri = false;
    await writeSecret('cloud.tokens', 'cloudAuthTokens', 'dev');

    expect(settings.get('cloudAuthTokens')).toBe('dev');
    expect(keychain.size).toBe(0);
    expect(await readSecret('cloud.tokens', 'cloudAuthTokens')).toBe('dev');
  });
});
