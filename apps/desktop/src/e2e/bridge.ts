import { writeFile } from '@tauri-apps/plugin-fs';
import { useEditorStore } from '@/modules/editor/store';
import { buildRenderInputFromStore } from '@/modules/export/hooks/useExportRender';
import { exportRenderInput } from '@/modules/export/utils/canvasExport';
import type { ExportFormat } from '@/modules/export/utils/formats';

export async function e2eEditorHasScreenshot(): Promise<boolean> {
  return useEditorStore.getState().screenshot !== null;
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

  window.__xcreenerE2E = {
    e2eEditorHasScreenshot,
    e2eExportToPath,
  };
}
