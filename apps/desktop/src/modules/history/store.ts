import { create } from 'zustand';
import type { StoredCapture } from '@/db/captures';

interface HistoryState {
  captures: StoredCapture[];
  loading: boolean;
  error: string | null;
  selectedId: number | null;
  setCaptures: (captures: StoredCapture[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedId: (id: number | null) => void;
  removeCaptureFromList: (id: number) => void;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  captures: [],
  loading: false,
  error: null,
  selectedId: null,
  setCaptures: (captures) => set({ captures }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSelectedId: (selectedId) => set({ selectedId }),
  removeCaptureFromList: (id) =>
    set((state) => ({
      captures: state.captures.filter((capture) => capture.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    })),
}));
