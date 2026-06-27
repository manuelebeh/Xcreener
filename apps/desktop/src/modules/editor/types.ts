import type {
  BackgroundConfig as CoreBackgroundConfig,
  RenderInput as CoreRenderInput,
} from '@snapglow/editor-core';

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
} from '@snapglow/editor-core';

export {
  DEFAULT_TOOL_DEFAULTS,
  HISTORY_MAX,
  DEFAULT_BACKGROUND,
  DEFAULT_BORDER_RADIUS,
  DEFAULT_SHADOW,
  DEFAULT_TRANSFORM,
} from '@snapglow/editor-core';

/** Desktop background may hold an ImageBitmap for custom image uploads. */
export type BackgroundConfig =
  | Extract<CoreBackgroundConfig, { type: 'gradient' } | { type: 'solid' }>
  | { type: 'image'; source: ImageBitmap | null };

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
