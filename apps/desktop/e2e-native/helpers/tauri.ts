import { browser } from '@wdio/globals';

type TauriInvoke = (
  command: string,
  args?: unknown,
  options?: { headers: Record<string, string> }
) => Promise<unknown>;

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

/** Sends `bytes` as a raw invoke body. WebDriver arguments are JSON, so the array becomes a Uint8Array in the page. */
export async function tauriInvokeRaw(
  command: string,
  bytes: number[],
  headers: Record<string, string> = {}
) {
  return browser.execute(
    (cmd, body, invokeHeaders) => {
      const internals = (window as Window & { __TAURI_INTERNALS__?: { invoke: TauriInvoke } })
        .__TAURI_INTERNALS__;
      if (!internals?.invoke) {
        throw new Error('Tauri invoke is not available in this webview');
      }
      // Drop the response: the driver cannot serialize a raw-body invoke result.
      return internals
        .invoke(cmd, new Uint8Array(body), { headers: invokeHeaders })
        .then(() => null);
    },
    command,
    bytes,
    headers
  );
}
