import type { TextLine } from '@snapglow/ocr-core';
import { create } from 'zustand';

export type TextExtractionStatus = 'idle' | 'scanning' | 'ready' | 'error';

interface TextExtractionState {
  status: TextExtractionStatus;
  lines: TextLine[];
  error: string | null;
  lastCopiedText: string | null;
  setStatus: (status: TextExtractionStatus) => void;
  setLines: (lines: TextLine[]) => void;
  setError: (error: string | null) => void;
  setLastCopiedText: (text: string | null) => void;
  clear: () => void;
}

export const useTextExtractionStore = create<TextExtractionState>((set) => ({
  status: 'idle',
  lines: [],
  error: null,
  lastCopiedText: null,
  setStatus: (status) => set({ status }),
  setLines: (lines) => set({ lines, status: 'ready', error: null }),
  setError: (error) => set({ error, status: 'error' }),
  setLastCopiedText: (lastCopiedText) => set({ lastCopiedText }),
  clear: () =>
    set({
      status: 'idle',
      lines: [],
      error: null,
      lastCopiedText: null,
    }),
}));
