import { $, expect } from '@wdio/globals';
import { tauriInvoke } from '../helpers/tauri';

describe('Xcreener native integration', () => {
  before(async () => {
    await tauriInvoke('e2e_show_main_window');
  });

  it('shows settings integration controls', async () => {
    const settingsLink = await $('a[href="/settings"]');
    await settingsLink.waitForDisplayed();
    await settingsLink.click();

    const heading = await $('h1');
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

  it('emits capture-triggered and opens the capture overlay', async () => {
    await tauriInvoke('e2e_emit_capture_triggered');

    await browser.waitUntil(
      async () => {
        const overlayVisible = await tauriInvoke<boolean>('e2e_is_capture_overlay_visible');
        return overlayVisible === true;
      },
      {
        timeout: 10_000,
        interval: 200,
        timeoutMsg: 'Expected capture overlay to become visible',
      }
    );

    await tauriInvoke('cancel_capture_overlay');
  });

  it('hides the main window instead of quitting', async () => {
    await tauriInvoke('e2e_hide_main_window');
    const visible = await tauriInvoke('e2e_is_main_window_visible');
    expect(visible).toBe(false);
  });
});
