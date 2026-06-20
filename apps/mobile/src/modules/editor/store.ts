import {
  type Annotation,
  autoPadding,
  type BackgroundConfig,
  cloneAnnotations,
  computeLayout,
  DEFAULT_BACKGROUND,
  DEFAULT_BORDER_RADIUS,
  DEFAULT_GRADIENT_PRESET_ID,
  DEFAULT_SHADOW,
  DEFAULT_SOLID_COLOR,
  DEFAULT_TOOL_DEFAULTS,
  DEFAULT_TRANSFORM,
  type EditorTool,
  FREE_PRESET_ID,
  type FramePreset,
  fitTransform,
  getPresetById,
  getPresetStyleDefaults,
  HISTORY_MAX,
  type RenderInput,
  resolvePresetPadding,
  type ScreenshotTransform,
  type ShadowConfig,
  type ToolDefaults,
} from '@snapglow/editor-core';
import { create } from 'zustand';

export interface EditorScreenshot {
  uri: string;
  width: number;
  height: number;
}

export { DEFAULT_BACKGROUND, DEFAULT_BORDER_RADIUS, DEFAULT_SHADOW };

function resolveFrame(presetId: string | null): FramePreset | null {
  if (!presetId || presetId === FREE_PRESET_ID) {
    return null;
  }
  return getPresetById(presetId);
}

function computeInitialTransform(
  screenshot: EditorScreenshot,
  presetId: string | null,
  padding: number
): ScreenshotTransform {
  const frame = resolveFrame(presetId);
  const layout = computeLayout({
    screenshot,
    background: DEFAULT_BACKGROUND,
    padding,
    borderRadius: DEFAULT_BORDER_RADIUS,
    shadow: DEFAULT_SHADOW,
    frame,
    transform: DEFAULT_TRANSFORM,
    annotations: [],
    selectedAnnotationId: null,
  });
  return fitTransform(screenshot, layout.content);
}

function emptyHistory() {
  return { past: [] as Annotation[][], future: [] as Annotation[][] };
}

interface EditorState {
  padding: number;
  paddingTouched: boolean;
  screenshot: EditorScreenshot | null;
  background: BackgroundConfig;
  borderRadius: number;
  shadow: ShadowConfig;
  selectedPresetId: string | null;
  transform: ScreenshotTransform;
  activeTool: EditorTool;
  annotations: Annotation[];
  selectedAnnotationId: string | null;
  toolDefaults: ToolDefaults;
  history: { past: Annotation[][]; future: Annotation[][] };
  setPadding: (padding: number) => void;
  setScreenshot: (screenshot: EditorScreenshot | null) => void;
  updateBackground: (
    background: Partial<BackgroundConfig> & { type: BackgroundConfig['type'] }
  ) => void;
  setBorderRadius: (borderRadius: number) => void;
  updateShadow: (shadow: Partial<ShadowConfig>) => void;
  resetStyle: () => void;
  setPreset: (presetId: string | null) => void;
  setTransform: (transform: Partial<ScreenshotTransform>) => void;
  resetTransform: () => void;
  setActiveTool: (tool: EditorTool) => void;
  setAnnotations: (annotations: Annotation[]) => void;
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: string, patch: Partial<Annotation>) => void;
  removeAnnotation: (id: string) => void;
  selectAnnotation: (id: string | null) => void;
  updateToolDefaults: (patch: Partial<ToolDefaults>) => void;
  pushHistory: () => void;
  commitHistory: () => void;
  undo: () => void;
  redo: () => void;
  buildRenderInput: () => RenderInput | null;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  padding: 40,
  paddingTouched: false,
  screenshot: null,
  background: DEFAULT_BACKGROUND,
  borderRadius: DEFAULT_BORDER_RADIUS,
  shadow: DEFAULT_SHADOW,
  selectedPresetId: null,
  transform: DEFAULT_TRANSFORM,
  activeTool: 'select',
  annotations: [],
  selectedAnnotationId: null,
  toolDefaults: DEFAULT_TOOL_DEFAULTS,
  history: emptyHistory(),

  setPadding: (padding) => set({ padding, paddingTouched: true }),

  setScreenshot: (screenshot) => {
    if (!screenshot) {
      set({
        screenshot: null,
        background: DEFAULT_BACKGROUND,
        borderRadius: DEFAULT_BORDER_RADIUS,
        shadow: DEFAULT_SHADOW,
        paddingTouched: false,
        selectedPresetId: null,
        transform: DEFAULT_TRANSFORM,
        annotations: [],
        selectedAnnotationId: null,
        history: emptyHistory(),
      });
      return;
    }

    const padding = autoPadding(screenshot);
    set({
      screenshot,
      background: DEFAULT_BACKGROUND,
      borderRadius: DEFAULT_BORDER_RADIUS,
      shadow: DEFAULT_SHADOW,
      padding,
      paddingTouched: false,
      selectedPresetId: null,
      transform: DEFAULT_TRANSFORM,
      annotations: [],
      selectedAnnotationId: null,
      history: emptyHistory(),
    });
  },

  updateBackground: (background) => {
    if (background.type === 'gradient') {
      set({
        background: {
          type: 'gradient',
          presetId: background.presetId ?? DEFAULT_GRADIENT_PRESET_ID,
        },
      });
      return;
    }

    if (background.type === 'solid') {
      set({
        background: {
          type: 'solid',
          color: background.color ?? DEFAULT_SOLID_COLOR,
        },
      });
    }
  },

  setBorderRadius: (borderRadius) => set({ borderRadius }),

  updateShadow: (shadow) =>
    set((state) => ({
      shadow: { ...state.shadow, ...shadow },
    })),

  resetStyle: () =>
    set({
      background: DEFAULT_BACKGROUND,
      borderRadius: DEFAULT_BORDER_RADIUS,
      shadow: DEFAULT_SHADOW,
      paddingTouched: false,
    }),

  setPreset: (presetId) => {
    const state = get();
    if (!state.screenshot) {
      set({ selectedPresetId: presetId === FREE_PRESET_ID ? null : presetId });
      return;
    }

    const resolvedId = presetId === FREE_PRESET_ID ? null : presetId;
    const frame = resolveFrame(resolvedId);
    const padding = resolvePresetPadding(
      frame,
      state.screenshot,
      state.paddingTouched,
      state.padding
    );

    let borderRadius = DEFAULT_BORDER_RADIUS;
    let shadow = DEFAULT_SHADOW;

    if (resolvedId) {
      const styleDefaults = getPresetStyleDefaults(resolvedId);
      if (styleDefaults) {
        borderRadius = styleDefaults.borderRadius;
        shadow = styleDefaults.shadow;
      }
    }

    const transform = computeInitialTransform(state.screenshot, resolvedId, padding);

    set({
      selectedPresetId: resolvedId,
      transform,
      padding,
      borderRadius,
      shadow,
    });
  },

  setTransform: (transform) =>
    set((state) => ({
      transform: { ...state.transform, ...transform },
    })),

  resetTransform: () => {
    const state = get();
    if (!state.screenshot) {
      set({ transform: DEFAULT_TRANSFORM });
      return;
    }

    const transform = computeInitialTransform(
      state.screenshot,
      state.selectedPresetId,
      state.padding
    );
    set({ transform });
  },

  setActiveTool: (tool) => set({ activeTool: tool }),

  setAnnotations: (annotations) => set({ annotations }),

  addAnnotation: (annotation) =>
    set((state) => ({
      annotations: [...state.annotations, annotation],
      selectedAnnotationId: annotation.id,
    })),

  updateAnnotation: (id, patch) =>
    set((state) => ({
      annotations: state.annotations.map((annotation) =>
        annotation.id === id ? ({ ...annotation, ...patch } as Annotation) : annotation
      ),
    })),

  removeAnnotation: (id) =>
    set((state) => ({
      annotations: state.annotations.filter((annotation) => annotation.id !== id),
      selectedAnnotationId: state.selectedAnnotationId === id ? null : state.selectedAnnotationId,
    })),

  selectAnnotation: (id) => set({ selectedAnnotationId: id }),

  updateToolDefaults: (patch) =>
    set((state) => ({
      toolDefaults: { ...state.toolDefaults, ...patch },
    })),

  pushHistory: () => {
    const { annotations, history } = get();
    const snapshot = cloneAnnotations(annotations);
    const past = [...history.past, snapshot].slice(-HISTORY_MAX);
    set({
      history: {
        past,
        future: [],
      },
    });
  },

  commitHistory: () => {
    get().pushHistory();
  },

  undo: () => {
    const { annotations, history } = get();
    if (history.past.length === 0) {
      return;
    }

    const previous = history.past[history.past.length - 1];
    const past = history.past.slice(0, -1);
    const current = cloneAnnotations(annotations);

    set({
      annotations: cloneAnnotations(previous ?? []),
      selectedAnnotationId: null,
      history: {
        past,
        future: [current, ...history.future],
      },
    });
  },

  redo: () => {
    const { annotations, history } = get();
    if (history.future.length === 0) {
      return;
    }

    const next = history.future[0];
    const future = history.future.slice(1);
    const current = cloneAnnotations(annotations);

    set({
      annotations: cloneAnnotations(next ?? []),
      selectedAnnotationId: null,
      history: {
        past: [...history.past, current].slice(-HISTORY_MAX),
        future,
      },
    });
  },

  buildRenderInput: () => {
    const state = get();
    if (!state.screenshot) {
      return null;
    }

    return {
      screenshot: state.screenshot,
      background: state.background,
      padding: state.padding,
      borderRadius: state.borderRadius,
      shadow: state.shadow,
      frame: resolveFrame(state.selectedPresetId),
      transform: state.transform,
      annotations: state.annotations,
      selectedAnnotationId: state.selectedAnnotationId,
    };
  },
}));
