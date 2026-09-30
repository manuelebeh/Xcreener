import type { ContentClass, StyleSuggestion } from '@snapglow/style-suggestion-core';
import { create } from 'zustand';

export type StyleSuggestionStatus = 'idle' | 'classifying' | 'ready' | 'error' | 'dismissed';

interface StyleSuggestionState {
  status: StyleSuggestionStatus;
  contentClass: ContentClass | null;
  suggestion: StyleSuggestion | null;
  confidence: number;
  error: string | null;
  setClassifying: () => void;
  setReady: (contentClass: ContentClass, suggestion: StyleSuggestion, confidence: number) => void;
  setError: (message: string) => void;
  dismiss: () => void;
  clear: () => void;
}

export const useStyleSuggestionStore = create<StyleSuggestionState>((set) => ({
  status: 'idle',
  contentClass: null,
  suggestion: null,
  confidence: 0,
  error: null,

  setClassifying: () =>
    set({
      status: 'classifying',
      contentClass: null,
      suggestion: null,
      confidence: 0,
      error: null,
    }),

  setReady: (contentClass, suggestion, confidence) =>
    set({
      status: 'ready',
      contentClass,
      suggestion,
      confidence,
      error: null,
    }),

  setError: (message) =>
    set({
      status: 'error',
      contentClass: null,
      suggestion: null,
      confidence: 0,
      error: message,
    }),

  dismiss: () =>
    set({
      status: 'dismissed',
    }),

  clear: () =>
    set({
      status: 'idle',
      contentClass: null,
      suggestion: null,
      confidence: 0,
      error: null,
    }),
}));
