import { create } from 'zustand';
import type {
  CaptureMode,
  CaptureOverlayBounds,
  MonitorInfo,
  OverlayWebviewLayout,
  Rect,
  WindowInfo,
} from '@/shared/types/ipc';

interface CaptureState {
  overlayVisible: boolean;
  activeMode: CaptureMode;
  bounds: CaptureOverlayBounds | null;
  selection: Rect | null;
  hoveredWindow: WindowInfo | null;
  hoveredMonitor: MonitorInfo | null;
  monitors: MonitorInfo[];
  webviewLayout: OverlayWebviewLayout | null;
  previewUrl: string | null;
  error: string | null;
  isCapturing: boolean;
  setOverlayVisible: (visible: boolean) => void;
  setActiveMode: (mode: CaptureMode) => void;
  setBounds: (bounds: CaptureOverlayBounds | null) => void;
  setSelection: (selection: Rect | null) => void;
  setHoveredWindow: (window: WindowInfo | null) => void;
  setHoveredMonitor: (monitor: MonitorInfo | null) => void;
  setMonitors: (monitors: MonitorInfo[]) => void;
  setWebviewLayout: (webviewLayout: OverlayWebviewLayout | null) => void;
  setPreviewUrl: (previewUrl: string | null) => void;
  setError: (error: string | null) => void;
  setCapturing: (isCapturing: boolean) => void;
  reset: () => void;
}

const initialState = {
  overlayVisible: false,
  activeMode: 'idle' as CaptureMode,
  bounds: null,
  selection: null,
  hoveredWindow: null,
  hoveredMonitor: null,
  monitors: [],
  webviewLayout: null,
  previewUrl: null,
  error: null,
  isCapturing: false,
};

export const useCaptureStore = create<CaptureState>((set) => ({
  ...initialState,
  setOverlayVisible: (overlayVisible) => set({ overlayVisible }),
  setActiveMode: (activeMode) => set({ activeMode }),
  setBounds: (bounds) => set({ bounds }),
  setSelection: (selection) => set({ selection }),
  setHoveredWindow: (hoveredWindow) => set({ hoveredWindow }),
  setHoveredMonitor: (hoveredMonitor) => set({ hoveredMonitor }),
  setMonitors: (monitors) => set({ monitors }),
  setWebviewLayout: (webviewLayout) => set({ webviewLayout }),
  setPreviewUrl: (previewUrl) => set({ previewUrl }),
  setError: (error) => set({ error }),
  setCapturing: (isCapturing) => set({ isCapturing }),
  reset: () => {
    const previousPreview = useCaptureStore.getState().previewUrl;
    if (previousPreview) {
      URL.revokeObjectURL(previousPreview);
    }
    set(initialState);
  },
}));
