import { create } from 'zustand';
import { autoPadding } from './engine/computeLayout';
import { DEFAULT_GRADIENT_PRESET_ID } from './engine/gradients';
import type { BackgroundConfig, ShadowConfig } from './types';

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

interface EditorState {
  padding: number;
  paddingTouched: boolean;
  screenshot: ImageBitmap | null;
  background: BackgroundConfig;
  borderRadius: number;
  shadow: ShadowConfig;
  setPadding: (padding: number) => void;
  setScreenshot: (screenshot: ImageBitmap | null) => void;
  updateBackground: (
    background: Partial<BackgroundConfig> & { type: BackgroundConfig['type'] }
  ) => void;
  setBorderRadius: (borderRadius: number) => void;
  updateShadow: (shadow: Partial<ShadowConfig>) => void;
  resetStyle: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  padding: 40,
  paddingTouched: false,
  screenshot: null,
  background: DEFAULT_BACKGROUND,
  borderRadius: DEFAULT_BORDER_RADIUS,
  shadow: DEFAULT_SHADOW,

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
      });
      return;
    }

    set({
      screenshot,
      background: DEFAULT_BACKGROUND,
      borderRadius: DEFAULT_BORDER_RADIUS,
      shadow: DEFAULT_SHADOW,
      padding: autoPadding(screenshot),
      paddingTouched: false,
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
}));
