import { createCanvas } from '@napi-rs/canvas';
import { defaultCollabDocumentState } from '@snapglow/collab-core';
import { afterAll, describe, expect, it } from 'vitest';
import { RenderTooLargeError } from './render';
import { createRenderPool, RenderUnavailableError } from './render-pool';

function pngBuffer(width: number, height: number): Buffer {
  return createCanvas(width, height).toBuffer('image/png');
}

// 200 + 2 x padding per side: 2900 gives 6000², under the 40 MP budget.
function largeExport(padding = 2900) {
  return {
    documentState: { ...defaultCollabDocumentState(200, 200), padding },
    screenshotBuffer: pngBuffer(200, 200),
    format: 'png' as const,
  };
}

describe('render pool', () => {
  const pool = createRenderPool({ maxThreads: 1, timeoutMs: 30_000 });
  afterAll(() => pool.close());

  it('renders in a worker and returns a Buffer', async () => {
    const result = await pool.render({
      documentState: defaultCollabDocumentState(200, 200),
      screenshotBuffer: pngBuffer(200, 200),
      format: 'png',
    });
    expect(result.width).toBe(280);
    expect(Buffer.isBuffer(result.buffer)).toBe(true);
    expect(result.buffer.subarray(1, 4).toString('ascii')).toBe('PNG');
  });

  it('keeps the pixel budget refusal', async () => {
    await expect(pool.render(largeExport(6000))).rejects.toBeInstanceOf(RenderTooLargeError);
  });

  it('leaves the event loop free during a large render', async () => {
    let worstLagMs = 0;
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      worstLagMs = Math.max(worstLagMs, now - last - 10);
      last = now;
    }, 10);
    try {
      const result = await pool.render(largeExport());
      expect(result.width).toBe(6000);
    } finally {
      clearInterval(timer);
    }
    expect(worstLagMs).toBeLessThan(100);
  }, 30_000);

  it('gives up on a slow render and keeps serving', async () => {
    const slowPool = createRenderPool({ maxThreads: 1, timeoutMs: 50 });
    try {
      await expect(slowPool.render(largeExport())).rejects.toBeInstanceOf(RenderUnavailableError);
      const pending = slowPool.render(largeExport(0));
      await expect(pending).resolves.toMatchObject({ width: 200 });
    } finally {
      await slowPool.close();
    }
  }, 30_000);
});
