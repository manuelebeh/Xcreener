import { create } from 'zustand';
import type { ExportFormat } from './utils/formats';

interface ExportState {
  format: ExportFormat;
  quality: number;
  isExporting: boolean;
  lastMessage: string | null;
  setFormat: (format: ExportFormat) => void;
  setQuality: (quality: number) => void;
  setIsExporting: (isExporting: boolean) => void;
  setLastMessage: (message: string | null) => void;
}

export const useExportStore = create<ExportState>((set) => ({
  format: 'png',
  quality: 90,
  isExporting: false,
  lastMessage: null,
  setFormat: (format) => set({ format }),
  setQuality: (quality) => set({ quality }),
  setIsExporting: (isExporting) => set({ isExporting }),
  setLastMessage: (lastMessage) => set({ lastMessage }),
}));
