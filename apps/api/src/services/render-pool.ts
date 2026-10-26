import { fileURLToPath } from 'node:url';
import { Piscina } from 'piscina';
import { env } from '../env';
import { type RenderExportOptions, type RenderExportResult, RenderTooLargeError } from './render';
import type { RenderWorkerResult } from './render-worker';

/** Queue full or render over the time limit. Fastify answers with `statusCode`. */
export class RenderUnavailableError extends Error {
  readonly statusCode = 503;

  constructor() {
    super('Render service is busy, retry later');
  }
}

export interface RenderPool {
  /** `timeoutMs` overrides the pool limit for this render. */
  render(options: RenderExportOptions, timeoutMs?: number): Promise<RenderExportResult>;
  close(): Promise<void>;
}

// Bundled: dist/render-worker.mjs next to dist/index.mjs. From sources (tsx, vitest), the
// worker needs the tsx loader to import TypeScript.
const fromSources = import.meta.url.endsWith('.ts');
const workerFile = fileURLToPath(
  new URL(fromSources ? './render-worker.ts' : './render-worker.mjs', import.meta.url)
);

export function createRenderPool(options: { maxThreads: number; timeoutMs: number }): RenderPool {
  const pool = new Piscina<RenderExportOptions, RenderWorkerResult>({
    filename: workerFile,
    minThreads: 0,
    maxThreads: options.maxThreads,
    maxQueue: options.maxThreads * 4,
    execArgv: fromSources ? [...process.execArgv, '--import', 'tsx'] : undefined,
  });

  return {
    async render(renderOptions, timeoutMs = options.timeoutMs) {
      const timeout = AbortSignal.timeout(timeoutMs);
      let outcome: RenderWorkerResult;
      try {
        // Piscina terminates the worker when a running task is aborted.
        outcome = await pool.run(renderOptions, { signal: timeout });
      } catch (error) {
        if (timeout.aborted || (error as Error).message === 'Task queue is at limit') {
          throw new RenderUnavailableError();
        }
        throw error;
      }

      if (!outcome.ok) {
        throw new RenderTooLargeError();
      }
      // Structured clone turns the Buffer into a plain Uint8Array.
      const bytes = outcome.result.buffer;
      return {
        ...outcome.result,
        buffer: Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength),
      };
    },
    close: () => pool.destroy(),
  };
}

let defaultPool: RenderPool | null = null;

/** Renders an export on the shared worker pool, created on first use. */
export function renderCaptureExportInWorker(
  options: RenderExportOptions
): Promise<RenderExportResult> {
  defaultPool ??= createRenderPool({
    maxThreads: env.RENDER_WORKERS,
    timeoutMs: env.RENDER_TIMEOUT_MS,
  });
  return defaultPool.render(options);
}

export async function closeRenderPool(): Promise<void> {
  await defaultPool?.close();
  defaultPool = null;
}
