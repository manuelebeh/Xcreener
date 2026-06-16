import { describe, expect, it, vi } from 'vitest';
import { canvasToPngBlob, getCanvasExportDimensions } from './canvasExport';

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
    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png', 1);
  });

  it('rejects when toBlob returns null', async () => {
    const canvas = createMockCanvas(1080, 1080);
    vi.mocked(canvas.toBlob).mockImplementation((callback) => {
      callback(null);
    });

    await expect(canvasToPngBlob(canvas)).rejects.toThrow('Failed to export canvas to PNG');
  });
});
