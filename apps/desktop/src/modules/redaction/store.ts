import type { DetectionKind } from '@snapglow/redaction-core';
import { create } from 'zustand';
import type { Detection, RedactionStatus, RedactionStyle } from './types';
import { DEFAULT_REDACTION_STYLE, REDACTION_CATEGORIES } from './types';

interface RedactionState {
  status: RedactionStatus;
  detections: Detection[];
  error: string | null;
  /** Detector kinds that "Mask all" and auto-redaction apply to. */
  enabledKinds: DetectionKind[];
  style: RedactionStyle;
  setStatus: (status: RedactionStatus) => void;
  setDetections: (detections: Detection[]) => void;
  setError: (error: string | null) => void;
  removeDetection: (id: string) => void;
  setKindsEnabled: (kinds: DetectionKind[], enabled: boolean) => void;
  setStyle: (style: Partial<RedactionStyle>) => void;
  clear: () => void;
}

export const useRedactionStore = create<RedactionState>((set) => ({
  status: 'idle',
  detections: [],
  error: null,
  enabledKinds: REDACTION_CATEGORIES.flatMap((category) => category.kinds),
  style: DEFAULT_REDACTION_STYLE,
  setStatus: (status) => set({ status }),
  setDetections: (detections) => set({ detections, status: 'ready', error: null }),
  setError: (error) => set({ error, status: 'error' }),
  removeDetection: (id) =>
    set((state) => ({
      detections: state.detections.filter((detection) => detection.id !== id),
    })),
  setKindsEnabled: (kinds, enabled) =>
    set((state) => ({
      enabledKinds: enabled
        ? [...new Set([...state.enabledKinds, ...kinds])]
        : state.enabledKinds.filter((kind) => !kinds.includes(kind)),
    })),
  setStyle: (style) => set((state) => ({ style: { ...state.style, ...style } })),
  clear: () => set({ status: 'idle', detections: [], error: null }),
}));
