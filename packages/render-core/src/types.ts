import type {
  BackgroundConfig as CoreBackgroundConfig,
  ComputedLayout,
  RenderInput as CoreRenderInput,
  WatermarkConfig,
} from '@snapglow/editor-core';
import type { Annotation } from '@snapglow/editor-core';

export type RenderBackgroundConfig =
  | Extract<CoreBackgroundConfig, { type: 'gradient' } | { type: 'solid' }>
  | { type: 'image'; source: CanvasImageSource | null };

export type RenderScreenshotSource = CanvasImageSource & {
  width: number;
  height: number;
};

export interface RenderInput extends Omit<CoreRenderInput, 'background' | 'screenshot'> {
  screenshot: RenderScreenshotSource;
  background: RenderBackgroundConfig;
  watermarkLogo?: CanvasImageSource | null;
}

export function toCoreBackground(background: RenderBackgroundConfig): CoreBackgroundConfig {
  if (background.type === 'image') {
    return { type: 'image', sourceId: background.source ? 'uploaded' : null };
  }
  return background;
}

export function toCoreRenderInput(input: RenderInput): CoreRenderInput {
  return {
    ...input,
    screenshot: { width: input.screenshot.width, height: input.screenshot.height },
    background: toCoreBackground(input.background),
  };
}

export type { Annotation, ComputedLayout, WatermarkConfig };
