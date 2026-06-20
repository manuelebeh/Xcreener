import { create } from 'zustand';

export interface ImportedImage {
  uri: string;
  mimeType: string;
  fileName?: string;
  width?: number;
  height?: number;
}

interface CaptureState {
  importedImage: ImportedImage | null;
  setImportedImage: (image: ImportedImage) => void;
  clearImportedImage: () => void;
}

export const useCaptureStore = create<CaptureState>((set) => ({
  importedImage: null,
  setImportedImage: (image) => set({ importedImage: image }),
  clearImportedImage: () => set({ importedImage: null }),
}));
