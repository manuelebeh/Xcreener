import { create } from 'zustand';

export type ExportFormat = 'png' | 'jpg';

interface ExportState {
  format: ExportFormat;
  quality: number;
  exporting: boolean;
  setFormat: (format: ExportFormat) => void;
  setQuality: (quality: number) => void;
  setExporting: (exporting: boolean) => void;
}

export const useExportStore = create<ExportState>((set) => ({
  format: 'png',
  quality: 100,
  exporting: false,
  setFormat: (format) => set({ format }),
  setQuality: (quality) => set({ quality }),
  setExporting: (exporting) => set({ exporting }),
}));
