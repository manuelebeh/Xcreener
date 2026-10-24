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
    settings.set('integrationTokens', '{"accessToken":"a"}');

    expect(await readSecret('integrations.tokens', 'integrationTokens')).toBe(
      '{"accessToken":"a"}'
    );
    expect(keychain.get('integrations.tokens')).toBe('{"accessToken":"a"}');
    expect(settings.get('integrationTokens')).toBe('');
    expect(await readSecret('integrations.tokens', 'integrationTokens')).toBe(
      '{"accessToken":"a"}'
    );
  });

  it('writes to the keychain and leaves nothing in SQLite', async () => {
    settings.set('integrationTokens', 'old');
    await writeSecret('integrations.tokens', 'integrationTokens', 'new');

    expect(keychain.get('integrations.tokens')).toBe('new');
    expect(settings.get('integrationTokens')).toBe('');
  });

  it('removes both copies', async () => {
    await writeSecret('integrations.tokens', 'integrationTokens', 'x');
    await removeSecret('integrations.tokens', 'integrationTokens');

    expect(keychain.has('integrations.tokens')).toBe(false);
    expect(await readSecret('integrations.tokens', 'integrationTokens')).toBeNull();
  });

  it('falls back to SQLite outside Tauri', async () => {
    runtime.tauri = false;
    await writeSecret('integrations.tokens', 'integrationTokens', 'dev');

    expect(settings.get('integrationTokens')).toBe('dev');
    expect(keychain.size).toBe(0);
    expect(await readSecret('integrations.tokens', 'integrationTokens')).toBe('dev');
  });
});
