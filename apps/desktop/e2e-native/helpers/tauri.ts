import { browser } from '@wdio/globals';

type TauriInvoke = (command: string, args?: Record<string, unknown>) => Promise<unknown>;

export async function tauriInvoke(command: string, args?: Record<string, unknown>) {
  return browser.execute(
    (cmd, payload) => {
      // Always injected, unlike window.__TAURI__ (withGlobalTauri is off).
      const internals = (window as Window & { __TAURI_INTERNALS__?: { invoke: TauriInvoke } })
        .__TAURI_INTERNALS__;
      if (!internals?.invoke) {
        throw new Error('Tauri invoke is not available in this webview');
      }
      return internals.invoke(cmd, payload);
    },
    command,
    args
  );
}
