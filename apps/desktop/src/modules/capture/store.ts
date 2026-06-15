import { create } from 'zustand';

interface CaptureState {
  isCapturing: boolean;
  setCapturing: (value: boolean) => void;
}

export const useCaptureStore = create<CaptureState>((set) => ({
  isCapturing: false,
  setCapturing: (value) => set({ isCapturing: value }),
}));
