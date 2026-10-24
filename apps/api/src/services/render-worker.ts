// Worker thread entry for the render pool (render-pool.ts). Errors lose their class across
// the thread boundary, so the pixel budget refusal comes back as a value.
import {
  type RenderExportOptions,
  type RenderExportResult,
  RenderTooLargeError,
  renderCaptureExport,
} from './render';

export type RenderWorkerResult =
  | { ok: true; result: RenderExportResult }
  | { ok: false; reason: 'too_large' };

export default async function render(options: RenderExportOptions): Promise<RenderWorkerResult> {
  try {
    return { ok: true, result: await renderCaptureExport(options) };
  } catch (error) {
    if (error instanceof RenderTooLargeError) {
      return { ok: false, reason: 'too_large' };
    }
    throw error;
  }
}
