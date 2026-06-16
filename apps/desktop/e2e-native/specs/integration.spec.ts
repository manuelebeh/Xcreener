import { $, expect } from '@wdio/globals';
import { tauriInvoke } from '../helpers/tauri';

describe('SnapGlow native integration', () => {
  before(async () => {
    await tauriInvoke('e2e_show_main_window');
  });

  it('shows settings integration controls', async () => {
    const settingsLink = await $('a[href="/settings"]');
    await settingsLink.waitForDisplayed();
    await settingsLink.click();

    const heading = await $('h2');
    await heading.waitForDisplayed();
    await expect(heading).toHaveText('Settings');
    await expect(await $('label[for="capture-shortcut"]')).toBeDisplayed();
  });

  it('registers an updated capture shortcut from settings', async () => {
    const input = await $('#capture-shortcut');
    await input.waitForDisplayed();
    await input.setValue('CmdOrControl+Shift+KeyK');

    const saveButton = await $('button=Save shortcut');
    await saveButton.click();

    const success = await $('#capture-shortcut-success');
    await success.waitForDisplayed({ timeout: 10_000 });
    await expect(success).toHaveText('Shortcut saved and registered.');
  });

  it('emits capture-triggered and shows the capture banner', async () => {
    await tauriInvoke('e2e_emit_capture_triggered');
    const banner = await $('[data-testid="capture-banner"]');
    await banner.waitForDisplayed({ timeout: 10_000 });
    await expect(banner).toHaveText('Capture shortcut triggered (stub)');
  });

  it('hides the main window instead of quitting', async () => {
    await tauriInvoke('e2e_hide_main_window');
    const visible = await tauriInvoke('e2e_is_main_window_visible');
    expect(visible).toBe(false);
  });
});
