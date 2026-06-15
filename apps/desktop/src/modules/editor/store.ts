import { create } from 'zustand';

interface EditorState {
  padding: number;
  setPadding: (padding: number) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  padding: 40,
  setPadding: (padding) => set({ padding }),
}));
