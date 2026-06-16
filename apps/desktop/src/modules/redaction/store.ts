import { create } from 'zustand';
import type { Detection, RedactionStatus } from './types';

interface RedactionState {
  status: RedactionStatus;
  detections: Detection[];
  error: string | null;
  setStatus: (status: RedactionStatus) => void;
  setDetections: (detections: Detection[]) => void;
  setError: (error: string | null) => void;
  removeDetection: (id: string) => void;
  clear: () => void;
}

export const useRedactionStore = create<RedactionState>((set) => ({
  status: 'idle',
  detections: [],
  error: null,
  setStatus: (status) => set({ status }),
  setDetections: (detections) => set({ detections, status: 'ready', error: null }),
  setError: (error) => set({ error, status: 'error' }),
  removeDetection: (id) =>
    set((state) => ({
      detections: state.detections.filter((detection) => detection.id !== id),
    })),
  clear: () => set({ status: 'idle', detections: [], error: null }),
}));
