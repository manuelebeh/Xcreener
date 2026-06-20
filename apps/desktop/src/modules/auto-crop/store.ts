import { create } from 'zustand';

export type AutoCropStatus = 'idle' | 'running' | 'ready' | 'error';

interface AutoCropState {
  status: AutoCropStatus;
  error: string | null;
  lastReductionPercent: number | null;
  setStatus: (status: AutoCropStatus) => void;
  setError: (error: string | null) => void;
  setLastReductionPercent: (value: number | null) => void;
  clear: () => void;
}

export const useAutoCropStore = create<AutoCropState>((set) => ({
  status: 'idle',
  error: null,
  lastReductionPercent: null,
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error, status: 'error' }),
  setLastReductionPercent: (lastReductionPercent) => set({ lastReductionPercent }),
  clear: () => set({ status: 'idle', error: null, lastReductionPercent: null }),
}));
