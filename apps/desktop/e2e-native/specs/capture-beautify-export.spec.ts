import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { $, browser, expect } from '@wdio/globals';
import { tauriInvoke, tauriInvokeRaw } from '../helpers/tauri';

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), '../fixtures');
const sampleCapture = readFileSync(join(fixtureDir, 'sample-capture.png'));
const sampleBytes = Array.from(sampleCapture);

describe('Xcreener capture → beautify → export', () => {
  before(async () => {
    await tauriInvoke('e2e_show_main_window');
  });

  it('injects a screenshot, applies a preset, and exports PNG', async () => {
    await tauriInvokeRaw('e2e_inject_screenshot', sampleBytes, { width: '800', height: '600' });

    try {
      await browser.waitUntil(
        async () => {
          const hasScreenshot = await browser.execute(async () => {
            return window.__xcreenerE2E?.e2eEditorHasScreenshot() ?? false;
          });
          return hasScreenshot === true;
        },
        { timeout: 15_000, interval: 250 }
      );
    } catch {
      const state = await browser.execute(() => ({
        bridge: Boolean(window.__xcreenerE2E),
        captureError: window.__xcreenerE2E?.e2eCaptureError() ?? null,
        path: window.location.pathname,
        text: document.body.innerText.slice(0, 300),
      }));
      throw new Error(`Expected editor to receive injected screenshot: ${JSON.stringify(state)}`);
    }

    const emptyState = await $('[data-testid="canvas-empty-state"]');
    await expect(emptyState).not.toBeDisplayed();

    const exportFrame = await $('[data-testid="canvas-export-frame"]');
    await exportFrame.waitForDisplayed({ timeout: 15_000 });

    const presetBar = await $('[data-testid="preset-bar"]');
    await presetBar.waitForDisplayed();
    const presetButton = await presetBar.$('button[aria-pressed="false"]');
    await presetButton.click();

    const exportMeta = await $('[data-testid="canvas-export-meta"]');
    await exportMeta.waitForDisplayed({ timeout: 10_000 });

    const exportPath = await tauriInvoke<string>('e2e_temp_export_path');
    await browser.execute(async (path) => {
      if (!window.__xcreenerE2E) {
        throw new Error('E2E bridge is not registered');
      }
      await window.__xcreenerE2E.e2eExportToPath(path, 'png', 95);
    }, exportPath);

    const [exists, size] = await tauriInvoke<[boolean, number]>('e2e_file_metadata', {
      path: exportPath,
    });
    expect(exists).toBe(true);
    expect(size).toBeGreaterThan(0);
  });
});
