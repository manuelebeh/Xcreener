import { create } from 'zustand';
import { autoPadding, computeLayout } from './engine/computeLayout';
import { DEFAULT_GRADIENT_PRESET_ID } from './engine/gradients';
import {
  FREE_PRESET_ID,
  fitTransform,
  getPresetById,
  getPresetStyleDefaults,
  resolvePresetPadding,
} from './engine/presets';
import type { BackgroundConfig, FramePreset, ScreenshotTransform, ShadowConfig } from './types';
import { DEFAULT_TRANSFORM } from './types';

export const DEFAULT_BORDER_RADIUS = 12;

export const DEFAULT_SHADOW: ShadowConfig = {
  opacity: 0.35,
  blur: 24,
  offsetX: 0,
  offsetY: 8,
  color: '#000000',
};

export const DEFAULT_BACKGROUND: BackgroundConfig = {
  type: 'gradient',
  presetId: DEFAULT_GRADIENT_PRESET_ID,
};

function closeBackgroundImage(background: BackgroundConfig): void {
  if (background.type === 'image' && background.source) {
    background.source.close();
  }
}

function resolveFrame(presetId: string | null, customPresets: FramePreset[]): FramePreset | null {
  if (!presetId || presetId === FREE_PRESET_ID) {
    return null;
  }
  return getPresetById(presetId, customPresets);
}

function computeInitialTransform(
  screenshot: ImageBitmap,
  presetId: string | null,
  customPresets: FramePreset[],
  padding: number
): ScreenshotTransform {
  const frame = resolveFrame(presetId, customPresets);
  const layout = computeLayout({
    screenshot,
    background: DEFAULT_BACKGROUND,
    padding,
    borderRadius: DEFAULT_BORDER_RADIUS,
    shadow: DEFAULT_SHADOW,
    frame,
    transform: DEFAULT_TRANSFORM,
  });
  return fitTransform(screenshot, layout.content);
}

interface EditorState {
  padding: number;
  paddingTouched: boolean;
  screenshot: ImageBitmap | null;
  background: BackgroundConfig;
  borderRadius: number;
  shadow: ShadowConfig;
  selectedPresetId: string | null;
  transform: ScreenshotTransform;
  customPresets: FramePreset[];
  setPadding: (padding: number) => void;
  setScreenshot: (screenshot: ImageBitmap | null) => void;
  updateBackground: (
    background: Partial<BackgroundConfig> & { type: BackgroundConfig['type'] }
  ) => void;
  setBorderRadius: (borderRadius: number) => void;
  updateShadow: (shadow: Partial<ShadowConfig>) => void;
  resetStyle: () => void;
  setPreset: (presetId: string | null) => void;
  setTransform: (transform: Partial<ScreenshotTransform>) => void;
  resetTransform: () => void;
  setCustomPresets: (presets: FramePreset[]) => void;
  addCustomPreset: (preset: FramePreset) => void;
  removeCustomPreset: (id: string) => void;
  applyCustomPresetStyle: (preset: FramePreset & { style?: CustomPresetStyle }) => void;
}

export interface CustomPresetStyle {
  background: BackgroundConfig;
  padding: number;
  borderRadius: number;
  shadow: ShadowConfig;
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
  customPresets: [],

  setPadding: (padding) => set({ padding, paddingTouched: true }),

  setScreenshot: (screenshot) => {
    const previous = get();
    if (previous.screenshot && previous.screenshot !== screenshot) {
      previous.screenshot.close();
    }
    closeBackgroundImage(previous.background);

    if (!screenshot) {
      set({
        screenshot: null,
        background: DEFAULT_BACKGROUND,
        borderRadius: DEFAULT_BORDER_RADIUS,
        shadow: DEFAULT_SHADOW,
        paddingTouched: false,
        selectedPresetId: null,
        transform: DEFAULT_TRANSFORM,
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
    });
  },

  updateBackground: (background) => {
    const current = get().background;
    if (background.type === 'image' && current.type === 'image' && current.source) {
      if (background.source !== current.source) {
        current.source.close();
      }
    } else if (background.type !== 'image' && current.type === 'image' && current.source) {
      current.source.close();
    }

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
          color: background.color ?? '#667eea',
        },
      });
      return;
    }

    set({
      background: {
        type: 'image',
        source: background.source ?? null,
      },
    });
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
    const frame = resolveFrame(resolvedId, state.customPresets);
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

    const transform = computeInitialTransform(
      state.screenshot,
      resolvedId,
      state.customPresets,
      padding
    );

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
      state.customPresets,
      state.padding
    );
    set({ transform });
  },

  setCustomPresets: (presets) => set({ customPresets: presets }),

  addCustomPreset: (preset) =>
    set((state) => ({
      customPresets: [...state.customPresets, preset],
    })),

  removeCustomPreset: (id) =>
    set((state) => ({
      customPresets: state.customPresets.filter((p) => p.id !== id),
      selectedPresetId: state.selectedPresetId === id ? null : state.selectedPresetId,
    })),

  applyCustomPresetStyle: (preset) => {
    const style = preset.style;
    if (!style) {
      get().setPreset(preset.id);
      return;
    }

    closeBackgroundImage(get().background);
    set({
      selectedPresetId: preset.id,
      background: style.background,
      padding: style.padding,
      paddingTouched: true,
      borderRadius: style.borderRadius,
      shadow: style.shadow,
    });

    const screenshot = get().screenshot;
    if (screenshot) {
      const transform = computeInitialTransform(
        screenshot,
        preset.id,
        get().customPresets,
        style.padding
      );
      set({ transform });
    }
  },
}));
