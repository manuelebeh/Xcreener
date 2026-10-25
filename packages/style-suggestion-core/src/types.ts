import type { ShadowConfig } from '@xcreener/editor-core';

export const CONTENT_CLASSES = ['code', 'ui', 'terminal', 'photo', 'diagram', 'text'] as const;

export type ContentClass = (typeof CONTENT_CLASSES)[number];

export type StyleSuggestionBackground =
  | { type: 'gradient'; presetId: string }
  | { type: 'solid'; color: string }
  | { type: 'blurred-screenshot' };

export interface StyleSuggestion {
  label: string;
  background: StyleSuggestionBackground;
  padding: number;
  borderRadius: number;
  shadow: ShadowConfig;
}

export interface ClassificationResult {
  class: ContentClass;
  confidence: number;
  latencyMs: number;
}

export const MIN_CLASSIFICATION_CONFIDENCE = 0.5;

export function isContentClass(value: string): value is ContentClass {
  return (CONTENT_CLASSES as readonly string[]).includes(value);
}
