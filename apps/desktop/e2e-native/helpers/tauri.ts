import { browser } from '@wdio/globals';

type TauriInvoke = (command: string, args?: Record<string, unknown>) => Promise<unknown>;

export async function tauriInvoke(command: string, args?: Record<string, unknown>) {
  return browser.execute(
    (cmd, payload) => {
      const tauri = (window as Window & { __TAURI__?: { core: { invoke: TauriInvoke } } })
        .__TAURI__;
      if (!tauri?.core?.invoke) {
        throw new Error('Tauri invoke is not available in this webview');
      }
      return tauri.core.invoke(cmd, payload);
    },
    command,
    args
  );
}
