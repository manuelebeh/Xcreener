import { describe, expect, it, vi } from 'vitest';
import { canvasToBlob, canvasToPngBlob, getCanvasExportDimensions } from './canvasExport';

function createMockCanvas(width: number, height: number): HTMLCanvasElement {
  return {
    width,
    height,
    toBlob: vi.fn(),
  } as unknown as HTMLCanvasElement;
}

describe('canvasExport', () => {
  it('returns logical pixel dimensions from canvas bitmap size', () => {
    const canvas = createMockCanvas(1080, 1080);
    expect(getCanvasExportDimensions(canvas)).toEqual({ width: 1080, height: 1080 });
  });

  it('exports canvas to PNG blob', async () => {
    const canvas = createMockCanvas(1080, 1080);
    const blob = new Blob(['png'], { type: 'image/png' });
    vi.mocked(canvas.toBlob).mockImplementation((callback) => {
      callback(blob);
    });

    await expect(canvasToPngBlob(canvas)).resolves.toBe(blob);
    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png', undefined);
  });

  it('rejects when toBlob returns null', async () => {
    const canvas = createMockCanvas(1080, 1080);
    vi.mocked(canvas.toBlob).mockImplementation((callback) => {
      callback(null);
    });

    await expect(canvasToPngBlob(canvas)).rejects.toThrow('Failed to export canvas to PNG');
  });

  it('exports canvas to JPEG with quality', async () => {
    const canvas = createMockCanvas(1080, 1080);
    const blob = new Blob(['jpg'], { type: 'image/jpeg' });
    vi.mocked(canvas.toBlob).mockImplementation((callback, type, quality) => {
      expect(type).toBe('image/jpeg');
      expect(quality).toBe(0.85);
      callback(blob);
    });

    await expect(canvasToBlob(canvas, 'jpg', 85)).resolves.toBe(blob);
  });
});
