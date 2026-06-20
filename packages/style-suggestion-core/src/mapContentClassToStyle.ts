import type { ContentClass, StyleSuggestion } from './types';
import { SHADOW_LIGHT, SHADOW_MEDIUM, SHADOW_NONE, SHADOW_STRONG } from './shadows';

const STYLE_BY_CLASS: Record<ContentClass, StyleSuggestion> = {
  code: {
    label: 'Code source',
    background: { type: 'gradient', presetId: 'indigo' },
    padding: 60,
    borderRadius: 12,
    shadow: SHADOW_STRONG,
  },
  ui: {
    label: 'UI web',
    background: { type: 'gradient', presetId: 'frost' },
    padding: 40,
    borderRadius: 16,
    shadow: SHADOW_LIGHT,
  },
  terminal: {
    label: 'Terminal',
    background: { type: 'solid', color: '#0d0d0d' },
    padding: 60,
    borderRadius: 8,
    shadow: SHADOW_MEDIUM,
  },
  photo: {
    label: 'Photo',
    background: { type: 'blurred-screenshot' },
    padding: 20,
    borderRadius: 0,
    shadow: SHADOW_NONE,
  },
  diagram: {
    label: 'Diagramme',
    background: { type: 'solid', color: '#ffffff' },
    padding: 40,
    borderRadius: 0,
    shadow: SHADOW_LIGHT,
  },
  text: {
    label: 'Texte / document',
    background: { type: 'gradient', presetId: 'cream' },
    padding: 40,
    borderRadius: 4,
    shadow: SHADOW_LIGHT,
  },
};

export function mapContentClassToStyle(contentClass: ContentClass): StyleSuggestion {
  return STYLE_BY_CLASS[contentClass];
}
