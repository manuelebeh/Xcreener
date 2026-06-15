import { listen } from '@tauri-apps/api/event';

export function onAppEvent<T>(event: string, handler: (payload: T) => void) {
  return listen<T>(event, (e) => handler(e.payload));
}
