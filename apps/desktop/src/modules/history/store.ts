import { create } from 'zustand';
import type { StoredCapture } from '@/db/captures';
import type { StoredCollection } from '@/db/collections';

export type LibrarySourceFilter = 'all' | 'local' | 'cloud';

interface HistoryState {
  captures: StoredCapture[];
  cloudItems: Array<{
    id: string;
    title: string | null;
    ocrText: string | null;
    tags: string[];
    assetUrl: string;
    createdAt: string;
  }>;
  collections: StoredCollection[];
  searchQuery: string;
  activeTag: string | null;
  activeCollectionId: number | null;
  sourceFilter: LibrarySourceFilter;
  loading: boolean;
  error: string | null;
  selectedId: number | null;
  setCaptures: (captures: StoredCapture[]) => void;
  setCloudItems: (items: HistoryState['cloudItems']) => void;
  setCollections: (collections: StoredCollection[]) => void;
  setSearchQuery: (searchQuery: string) => void;
  setActiveTag: (activeTag: string | null) => void;
  setActiveCollectionId: (activeCollectionId: number | null) => void;
  setSourceFilter: (sourceFilter: LibrarySourceFilter) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedId: (id: number | null) => void;
  removeCaptureFromList: (id: number) => void;
  restoreCapture: (capture: StoredCapture) => void;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  captures: [],
  cloudItems: [],
  collections: [],
  searchQuery: '',
  activeTag: null,
  activeCollectionId: null,
  sourceFilter: 'all',
  loading: false,
  error: null,
  selectedId: null,
  setCaptures: (captures) => set({ captures }),
  setCloudItems: (cloudItems) => set({ cloudItems }),
  setCollections: (collections) => set({ collections }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setActiveTag: (activeTag) => set({ activeTag }),
  setActiveCollectionId: (activeCollectionId) => set({ activeCollectionId }),
  setSourceFilter: (sourceFilter) => set({ sourceFilter }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSelectedId: (selectedId) => set({ selectedId }),
  removeCaptureFromList: (id) =>
    set((state) => ({
      captures: state.captures.filter((capture) => capture.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    })),
  restoreCapture: (capture) =>
    set((state) => ({
      captures: [capture, ...state.captures.filter((item) => item.id !== capture.id)],
    })),
}));
