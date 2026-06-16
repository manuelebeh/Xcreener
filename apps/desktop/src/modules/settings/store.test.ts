import { describe, expect, it } from 'vitest';
import { useSettingsStore } from '@/modules/settings/store';
import { isValidCaptureShortcut, normalizeCaptureShortcut } from '@/shared/lib/shortcut';
import { DEFAULT_APP_SETTINGS } from '@/shared/types/settings';

describe('shortcut validation', () => {
  it('accepts valid Tauri shortcut strings', () => {
    expect(isValidCaptureShortcut('CmdOrControl+Shift+KeyS')).toBe(true);
    expect(isValidCaptureShortcut('Alt+KeyA')).toBe(true);
  });

  it('rejects empty or malformed shortcuts', () => {
    expect(isValidCaptureShortcut('')).toBe(false);
    expect(isValidCaptureShortcut('not-a-shortcut')).toBe(false);
  });

  it('normalizes CommandOrControl alias', () => {
    expect(normalizeCaptureShortcut('CommandOrControl+Shift+KeyS')).toBe('CmdOrControl+Shift+KeyS');
  });
});

describe('settings store', () => {
  it('hydrates and updates settings', () => {
    useSettingsStore.getState().hydrate(DEFAULT_APP_SETTINGS);

    useSettingsStore.getState().setCaptureShortcut('Alt+KeyC');
    expect(useSettingsStore.getState().captureShortcut).toBe('Alt+KeyC');

    useSettingsStore.getState().setLaunchAtLogin(true);
    expect(useSettingsStore.getState().launchAtLogin).toBe(true);
  });
});
