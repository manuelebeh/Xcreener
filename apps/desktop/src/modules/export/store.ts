import { create } from 'zustand';
import type { ShareExpiry } from '@snapglow/cloud-core';
import type { ExportFormat } from './utils/formats';

interface ExportState {
  format: ExportFormat;
  quality: number;
  shareExpiry: ShareExpiry;
  isExporting: boolean;
  lastMessage: string | null;
  setFormat: (format: ExportFormat) => void;
  setQuality: (quality: number) => void;
  setShareExpiry: (shareExpiry: ShareExpiry) => void;
  setIsExporting: (isExporting: boolean) => void;
  setLastMessage: (message: string | null) => void;
}

export const useExportStore = create<ExportState>((set) => ({
  format: 'png',
  quality: 90,
  shareExpiry: '24h',
  isExporting: false,
  lastMessage: null,
  setFormat: (format) => set({ format }),
  setQuality: (quality) => set({ quality }),
  setShareExpiry: (shareExpiry) => set({ shareExpiry }),
  setIsExporting: (isExporting) => set({ isExporting }),
  setLastMessage: (lastMessage) => set({ lastMessage }),
}));
