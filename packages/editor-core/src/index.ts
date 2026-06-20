export {
  createAnnotationFromDrag,
  createTextAnnotation,
} from './annotations/create';
export {
  getResizeAnchor,
  moveAnnotation,
  resizeAnnotation,
} from './annotations/resize';
export type {
  Annotation,
  AnnotationBounds,
  ArrowAnnotation,
  BlurAnnotation,
  BlurMode,
  EditorTool,
  EllipseAnnotation,
  HighlightAnnotation,
  LineAnnotation,
  RectAnnotation,
  ResizeHandle,
  ResizeHandleId,
  TextAnnotation,
  ToolDefaults,
} from './annotations/types';
export {
  DEFAULT_TOOL_DEFAULTS,
  HISTORY_MAX,
} from './annotations/types';
export {
  cloneAnnotations,
  createAnnotationId,
  getAnnotationBounds,
  isAnnotationTooSmall,
  isDrawTool,
  normalizeRect,
} from './annotations/utils';
export {
  clampBlurRect,
  gaussianBlurImageData,
  pixelateImageData,
} from './blur/pixelOps';
export {
  autoFramePadding,
  autoPadding,
  computeLayout,
  zoomTransformAtPointer,
} from './computeLayout';
export { fitGpuTextureSize, fitPreviewSize, MAX_GPU_TEXTURE_SIZE } from './fitPreviewSize';
export {
  DEFAULT_GRADIENT_PRESET_ID,
  DEFAULT_SOLID_COLOR,
  GRADIENT_PRESETS,
  getGradientPreset,
} from './gradients';
export {
  getResizeHandles,
  hitTestAnnotation,
  hitTestHandle,
  hitTestSingleAnnotation,
} from './hitTest';
export type { PresetStyleDefaults } from './presets';
export {
  BUILT_IN_PRESETS,
  FREE_PRESET_ID,
  fitTransform,
  getFreePreset,
  getPresetById,
  getPresetStyleDefaults,
  PRESET_STYLE_DEFAULTS,
  resolvePresetPadding,
  SOCIAL_PRESETS,
  STANDARD_PRESETS,
} from './presets';

export type {
  AspectRatio,
  BackgroundConfig,
  ComputedLayout,
  FramePreset,
  GradientPreset,
  GradientStop,
  LayoutRect,
  PresetCategory,
  RenderInput,
  ScreenshotDimensions,
  ScreenshotTransform,
  ShadowConfig,
} from './types';
export {
  DEFAULT_BACKGROUND,
  DEFAULT_BORDER_RADIUS,
  DEFAULT_SHADOW,
  DEFAULT_TRANSFORM,
} from './types';
