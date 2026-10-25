import type {
  BackgroundConfig as CoreBackgroundConfig,
  RenderInput as CoreRenderInput,
} from '@xcreener/editor-core';

export type {
  Annotation,
  AnnotationBounds,
  ArrowAnnotation,
  AspectRatio,
  BlurAnnotation,
  BlurMode,
  ComputedLayout,
  EditorTool,
  EllipseAnnotation,
  FramePreset,
  GradientPreset,
  GradientStop,
  HighlightAnnotation,
  LayoutRect,
  LineAnnotation,
  PresetCategory,
  RectAnnotation,
  ResizeHandle,
  ResizeHandleId,
  ScreenshotTransform,
  ShadowConfig,
  TextAnnotation,
  ToolDefaults,
} from '@xcreener/editor-core';

export {
  DEFAULT_BORDER_RADIUS,
  DEFAULT_SHADOW,
  DEFAULT_TOOL_DEFAULTS,
  DEFAULT_TRANSFORM,
  HISTORY_MAX,
} from '@xcreener/editor-core';

/** Desktop background may hold an ImageBitmap for custom image uploads. */
export type BackgroundConfig =
  | Extract<CoreBackgroundConfig, { type: 'gradient' } | { type: 'solid' }>
  | { type: 'image'; source: ImageBitmap | null };

export const DEFAULT_BACKGROUND: BackgroundConfig = {
  type: 'gradient',
  presetId: 'xcreener-brand',
};

export interface RenderInput extends Omit<CoreRenderInput, 'background' | 'screenshot'> {
  screenshot: ImageBitmap;
  background: BackgroundConfig;
  watermark?: CoreRenderInput['watermark'];
  watermarkLogo?: CanvasImageSource | null;
}

/** Convert desktop background to core shape for shared layout logic. */
export function toCoreBackground(background: BackgroundConfig): CoreBackgroundConfig {
  if (background.type === 'image') {
    return { type: 'image', sourceId: background.source ? 'uploaded' : null };
  }
  return background;
}

/** Build core RenderInput for layout-only operations. */
export function toCoreRenderInput(input: RenderInput): CoreRenderInput {
  return {
    ...input,
    screenshot: { width: input.screenshot.width, height: input.screenshot.height },
    background: toCoreBackground(input.background),
  };
}
