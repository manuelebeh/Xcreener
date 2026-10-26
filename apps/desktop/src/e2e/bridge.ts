import { emit, listen } from '@tauri-apps/api/event';
import { writeFile } from '@tauri-apps/plugin-fs';
import { useCaptureStore } from '@/modules/capture/store';
import { getCaptureTrace, traceCapture } from '@/modules/capture/utils/sessionTrace';
import { useEditorStore } from '@/modules/editor/store';
import { buildRenderInputFromStore } from '@/modules/export/hooks/useExportRender';
import { exportRenderInput } from '@/modules/export/utils/canvasExport';
import type { ExportFormat } from '@/modules/export/utils/formats';
import { takeCaptureImage } from '@/tauri/commands';

export async function e2eEditorHasScreenshot(): Promise<boolean> {
  return useEditorStore.getState().screenshot !== null;
}

export function e2eCaptureError(): string | null {
  return useCaptureStore.getState().error;
}

export function e2eCaptureListenerReady(): boolean {
  return getCaptureTrace().some((step) => step.includes('capture-image listener registered'));
}

export function e2eCaptureTrace(): string[] {
  return getCaptureTrace();
}

/** Emits an event from the page and waits for it to come back, which proves Rust to webview delivery works. */
export async function e2eEventRoundTrip(timeoutMs = 3000): Promise<string> {
  const startedAt = Date.now();
  let received = false;
  const unlisten = await listen('e2e-ping', () => {
    received = true;
  });
  try {
    await emit('e2e-ping');
    while (!received && Date.now() - startedAt < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return received
      ? `received after ${Date.now() - startedAt}ms`
      : `not received in ${timeoutMs}ms`;
  } finally {
    unlisten();
  }
}

/** Reads the capture slot directly: bytes mean the inject command ran and only the event was lost. */
export async function e2eTakePendingCapture(): Promise<string> {
  try {
    const raw = await takeCaptureImage();
    return `slot held ${raw.byteLength} bytes`;
  } catch (error) {
    return `slot empty: ${String(error)}`;
  }
}

const pageErrors: string[] = [];

export function e2ePageErrors(): string[] {
  return [...pageErrors];
}

export async function e2eExportToPath(
  path: string,
  format: ExportFormat = 'png',
  quality = 95
): Promise<{ path: string; width: number; height: number; byteLength: number }> {
  const input = await buildRenderInputFromStore();
  if (!input) {
    throw new Error('No screenshot to export');
  }

  const result = await exportRenderInput(input, format, quality);
  const bytes = new Uint8Array(await result.blob.arrayBuffer());
  await writeFile(path, bytes);

  return {
    path,
    width: result.width,
    height: result.height,
    byteLength: bytes.length,
  };
}

export interface XcreenerE2EBridge {
  e2eEditorHasScreenshot: typeof e2eEditorHasScreenshot;
  e2eCaptureError: typeof e2eCaptureError;
  e2eCaptureListenerReady: typeof e2eCaptureListenerReady;
  e2eCaptureTrace: typeof e2eCaptureTrace;
  e2ePageErrors: typeof e2ePageErrors;
  e2eEventRoundTrip: typeof e2eEventRoundTrip;
  e2eTakePendingCapture: typeof e2eTakePendingCapture;
  e2eExportToPath: typeof e2eExportToPath;
}

declare global {
  interface Window {
    __xcreenerE2E?: XcreenerE2EBridge;
  }
}

export function registerE2EBridge(): void {
  // The native E2E build is a production bundle (`tauri build --debug`), so it opts in with VITE_E2E.
  if (!import.meta.env.DEV && import.meta.env.VITE_E2E !== 'true') {
    return;
  }

  window.addEventListener('error', (event) => pageErrors.push(`error: ${event.message}`));
  window.addEventListener('unhandledrejection', (event) =>
    pageErrors.push(`unhandledrejection: ${String(event.reason)}`)
  );

  void listen('e2e-rust-ping', () => traceCapture('e2e-rust-ping received from Rust'));

  window.__xcreenerE2E = {
    e2eEditorHasScreenshot,
    e2eCaptureError,
    e2eCaptureListenerReady,
    e2eCaptureTrace,
    e2ePageErrors,
    e2eEventRoundTrip,
    e2eTakePendingCapture,
    e2eExportToPath,
  };
}
