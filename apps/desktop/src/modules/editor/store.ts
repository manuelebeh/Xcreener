import { create } from 'zustand';

interface EditorState {
  padding: number;
  screenshot: ImageBitmap | null;
  setPadding: (padding: number) => void;
  setScreenshot: (screenshot: ImageBitmap | null) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  padding: 40,
  screenshot: null,
  setPadding: (padding) => set({ padding }),
  setScreenshot: (screenshot) => set({ screenshot }),
}));
