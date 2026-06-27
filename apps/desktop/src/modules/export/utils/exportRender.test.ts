import { afterAll, describe, expect, it, vi } from 'vitest';
import type { RenderInput } from '@/modules/editor/types';
import { exportRenderInput, renderToExportCanvas } from './canvasExport';

vi.mock('@/tauri/commands', () => ({
  compressExportBytes: vi.fn(async (imageData: number[]) => imageData),
}));

vi.mock('@/modules/settings/store', () => ({
  useSettingsStore: {
    getState: () => ({
      smartCompression: false,
    }),
  },
}));

class MockOffscreenCanvas {
  width: number;
  height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  convertToBlob() {
    return Promise.resolve(new Blob(['png'], { type: 'image/png' }));
  }

  getContext() {
    return {
      setTransform: vi.fn(),
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      fillRect: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      globalAlpha: 1,
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      rect: vi.fn(),
      roundRect: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      clip: vi.fn(),
      drawImage: vi.fn(),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })),
      putImageData: vi.fn(),
      font: '',
      textAlign: 'left',
      textBaseline: 'alphabetic',
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
    } as unknown as CanvasRenderingContext2D;
  }
}

const originalOffscreen = globalThis.OffscreenCanvas;
globalThis.OffscreenCanvas = MockOffscreenCanvas as unknown as typeof OffscreenCanvas;

function createMockScreenshot(width: number, height: number): ImageBitmap {
  return {
    width,
    height,
    close: vi.fn(),
  } as unknown as ImageBitmap;
}

function createMinimalRenderInput(): RenderInput {
  return {
    screenshot: createMockScreenshot(400, 300),
    background: { type: 'solid', color: '#111111' },
    padding: 24,
    borderRadius: 8,
    shadow: {
      opacity: 0.2,
      blur: 16,
      offsetX: 0,
      offsetY: 8,
      color: '#000000',
    },
    frame: null,
    transform: { scale: 1, offsetX: 0, offsetY: 0 },
    annotations: [],
    selectedAnnotationId: 'should-not-appear',
  };
}

describe('exportRender', () => {
  it('renders at screenshot dimensions plus padding in free mode', async () => {
    const input = createMinimalRenderInput();
    const { width, height } = await renderToExportCanvas(input);
    expect(width).toBe(448);
    expect(height).toBe(348);
  });

  it('exports without selection handles in output dimensions', async () => {
    const input = createMinimalRenderInput();
    const result = await exportRenderInput(input, 'png', 100);
    expect(result.width).toBe(448);
    expect(result.height).toBe(348);
    expect(result.blob.type).toBe('image/png');
  });
});

afterAll(() => {
  globalThis.OffscreenCanvas = originalOffscreen;
});
