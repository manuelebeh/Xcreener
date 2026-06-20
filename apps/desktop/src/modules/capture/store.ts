import { create } from 'zustand';
import type {
  CaptureDelaySecs,
  CaptureMode,
  CaptureOverlayBounds,
  CaptureProgressPayload,
  MonitorInfo,
  OverlayWebviewLayout,
  Rect,
  WindowInfo,
} from '@/shared/types/ipc';

interface CaptureState {
  overlayVisible: boolean;
  activeMode: CaptureMode;
  delaySecs: CaptureDelaySecs;
  liveOverlay: boolean;
  bounds: CaptureOverlayBounds | null;
  selection: Rect | null;
  hoveredWindow: WindowInfo | null;
  hoveredMonitor: MonitorInfo | null;
  monitors: MonitorInfo[];
  webviewLayout: OverlayWebviewLayout | null;
  previewUrl: string | null;
  error: string | null;
  isCapturing: boolean;
  countdownSecs: number | null;
  scrollFrame: number | null;
  scrollFinishing: boolean;
  progressHudMode: boolean;
  captureProgress: CaptureProgressPayload | null;
  setOverlayVisible: (visible: boolean) => void;
  setActiveMode: (mode: CaptureMode) => void;
  setDelaySecs: (delaySecs: CaptureDelaySecs) => void;
  setLiveOverlay: (liveOverlay: boolean) => void;
  setBounds: (bounds: CaptureOverlayBounds | null) => void;
  setSelection: (selection: Rect | null) => void;
  setHoveredWindow: (window: WindowInfo | null) => void;
  setHoveredMonitor: (monitor: MonitorInfo | null) => void;
  setMonitors: (monitors: MonitorInfo[]) => void;
  setWebviewLayout: (webviewLayout: OverlayWebviewLayout | null) => void;
  setPreviewUrl: (previewUrl: string | null) => void;
  setError: (error: string | null) => void;
  setCapturing: (isCapturing: boolean) => void;
  setCountdownSecs: (countdownSecs: number | null) => void;
  setScrollFrame: (scrollFrame: number | null) => void;
  setScrollFinishing: (scrollFinishing: boolean) => void;
  setProgressHudMode: (progressHudMode: boolean) => void;
  setCaptureProgress: (captureProgress: CaptureProgressPayload | null) => void;
  reset: () => void;
}

const initialState = {
  overlayVisible: false,
  activeMode: 'idle' as CaptureMode,
  delaySecs: 0 as CaptureDelaySecs,
  liveOverlay: false,
  bounds: null,
  selection: null,
  hoveredWindow: null,
  hoveredMonitor: null,
  monitors: [],
  webviewLayout: null,
  previewUrl: null,
  error: null,
  isCapturing: false,
  countdownSecs: null,
  scrollFrame: null,
  scrollFinishing: false,
  progressHudMode: false,
  captureProgress: null,
};

export const useCaptureStore = create<CaptureState>((set) => ({
  ...initialState,
  setOverlayVisible: (overlayVisible) => set({ overlayVisible }),
  setActiveMode: (activeMode) => set({ activeMode }),
  setDelaySecs: (delaySecs) => set({ delaySecs }),
  setLiveOverlay: (liveOverlay) => set({ liveOverlay }),
  setBounds: (bounds) => set({ bounds }),
  setSelection: (selection) => set({ selection }),
  setHoveredWindow: (hoveredWindow) => set({ hoveredWindow }),
  setHoveredMonitor: (hoveredMonitor) => set({ hoveredMonitor }),
  setMonitors: (monitors) => set({ monitors }),
  setWebviewLayout: (webviewLayout) => set({ webviewLayout }),
  setPreviewUrl: (previewUrl) => set({ previewUrl }),
  setError: (error) => set({ error }),
  setCapturing: (isCapturing) => set({ isCapturing }),
  setCountdownSecs: (countdownSecs) => set({ countdownSecs }),
  setScrollFrame: (scrollFrame) => set({ scrollFrame }),
  setScrollFinishing: (scrollFinishing) => set({ scrollFinishing }),
  setProgressHudMode: (progressHudMode) => set({ progressHudMode }),
  setCaptureProgress: (captureProgress) => set({ captureProgress }),
  reset: () => {
    const previousPreview = useCaptureStore.getState().previewUrl;
    if (previousPreview) {
      URL.revokeObjectURL(previousPreview);
    }
    set(initialState);
  },
}));
