import { create } from 'zustand';
import type { ContentAnalysis } from '@/shared/types/ipc';
import type { Point } from './utils/balance';

const DEFAULT_INSET_COLOR = '#ffffff';

export type BalanceStatus = 'idle' | 'analyzing' | 'ready' | 'error';

export interface BalanceState {
  status: BalanceStatus;
  error: string | null;
  balance: boolean;
  /** Width of the band of `insetColor` around the content, in capture pixels. */
  inset: number;
  insetColor: string;
  /** Untouched copy of the capture; every adjustment is redrawn from it. */
  source: ImageBitmap | null;
  analysis: ContentAnalysis | null;
  /** Bitmap last handed to the editor. Anything else in the editor is a new capture. */
  output: ImageBitmap | null;
  /** Position of the source's (0, 0) inside `output`. */
  origin: Point;
  reset: (output?: ImageBitmap | null) => void;
}

export const useBalanceStore = create<BalanceState>((set, get) => ({
  status: 'idle',
  error: null,
  balance: false,
  inset: 0,
  insetColor: DEFAULT_INSET_COLOR,
  source: null,
  analysis: null,
  output: null,
  origin: { x: 0, y: 0 },
  reset: (output = null) => {
    get().source?.close();
    set({
      status: 'idle',
      error: null,
      balance: false,
      inset: 0,
      insetColor: DEFAULT_INSET_COLOR,
      source: null,
      analysis: null,
      output,
      origin: { x: 0, y: 0 },
    });
  },
}));
