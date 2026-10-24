import { createCanvas } from '@napi-rs/canvas';
import { defaultCollabDocumentState } from '@snapglow/collab-core';
import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { RenderTooLargeError, renderCaptureExport } from './render';

function pngBuffer(width: number, height: number): Buffer {
  return createCanvas(width, height).toBuffer('image/png');
}

describe('renderCaptureExport pixel budget', () => {
  it('renders an ordinary document', async () => {
    const result = await renderCaptureExport({
      documentState: defaultCollabDocumentState(200, 200),
      screenshotBuffer: pngBuffer(200, 200),
      format: 'png',
    });
    expect(result.width).toBe(280);
  });

  it('refuses a canvas over the budget before allocating it', async () => {
    // A stored document predating the schema bounds: 200 + 2 x 6000 = 12200 px per side.
    const documentState = { ...defaultCollabDocumentState(200, 200), padding: 6000 };
    await expect(
      renderCaptureExport({ documentState, screenshotBuffer: pngBuffer(200, 200), format: 'png' })
    ).rejects.toBeInstanceOf(RenderTooLargeError);
  });

  it('maps to a 413 response', async () => {
    const app = Fastify();
    app.get('/', async () => {
      throw new RenderTooLargeError();
    });
    const response = await app.inject({ method: 'GET', url: '/' });
    expect(response.statusCode).toBe(413);
    await app.close();
  });
});
