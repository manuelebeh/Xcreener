import { create } from 'zustand';
import type { TextLine } from '@snapglow/ocr-core';

export type TextExtractionStatus = 'idle' | 'scanning' | 'ready' | 'error';

interface TextExtractionState {
  status: TextExtractionStatus;
  lines: TextLine[];
  selectedLineIds: string[];
  selectionEnabled: boolean;
  error: string | null;
  lastCopiedText: string | null;
  setStatus: (status: TextExtractionStatus) => void;
  setLines: (lines: TextLine[]) => void;
  setError: (error: string | null) => void;
  toggleLineSelection: (lineId: string, range?: boolean) => void;
  clearSelection: () => void;
  setSelectionEnabled: (enabled: boolean) => void;
  setLastCopiedText: (text: string | null) => void;
  clear: () => void;
}

export const useTextExtractionStore = create<TextExtractionState>((set, get) => ({
  status: 'idle',
  lines: [],
  selectedLineIds: [],
  selectionEnabled: false,
  error: null,
  lastCopiedText: null,
  setStatus: (status) => set({ status }),
  setLines: (lines) => set({ lines, status: 'ready', error: null }),
  setError: (error) => set({ error, status: 'error' }),
  toggleLineSelection: (lineId, range = false) => {
    const { lines, selectedLineIds } = get();
    if (range && selectedLineIds.length > 0) {
      const ids = lines.map((line) =>
        `${Math.round(line.x)}:${Math.round(line.y)}:${Math.round(line.width)}:${Math.round(line.height)}:${line.text}`
      );
      const anchor = selectedLineIds[selectedLineIds.length - 1]!;
      const start = ids.indexOf(anchor);
      const end = ids.indexOf(lineId);
      if (start >= 0 && end >= 0) {
        const [from, to] = start < end ? [start, end] : [end, start];
        set({ selectedLineIds: ids.slice(from, to + 1), selectionEnabled: true });
        return;
      }
    }

    set((state) => ({
      selectionEnabled: true,
      selectedLineIds: state.selectedLineIds.includes(lineId)
        ? state.selectedLineIds.filter((id) => id !== lineId)
        : [...state.selectedLineIds, lineId],
    }));
  },
  clearSelection: () => set({ selectedLineIds: [], selectionEnabled: false }),
  setSelectionEnabled: (selectionEnabled) => set({ selectionEnabled }),
  setLastCopiedText: (lastCopiedText) => set({ lastCopiedText }),
  clear: () =>
    set({
      status: 'idle',
      lines: [],
      selectedLineIds: [],
      selectionEnabled: false,
      error: null,
      lastCopiedText: null,
    }),
}));
