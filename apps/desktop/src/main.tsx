import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '@/app/App';
import { CaptureOverlayRoot } from '@/modules/capture/components/CaptureOverlayRoot';
import { isTauriRuntime } from '@/shared/lib/tauri';
import '@/styles/global.css';

function isOverlayWindow(): boolean {
  if (!isTauriRuntime()) {
    return false;
  }

  try {
    return getCurrentWebviewWindow().label === 'capture-overlay';
  } catch {
    return false;
  }
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>{isOverlayWindow() ? <CaptureOverlayRoot /> : <App />}</React.StrictMode>
);
