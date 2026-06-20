import { describe, expect, it } from 'vitest';

import { mapContentClassToStyle } from './mapContentClassToStyle';
import { SHADOW_LIGHT, SHADOW_MEDIUM, SHADOW_NONE, SHADOW_STRONG } from './shadows';
import { CONTENT_CLASSES } from './types';

describe('mapContentClassToStyle', () => {
  it('maps every content class to a style suggestion', () => {
    for (const contentClass of CONTENT_CLASSES) {
      const suggestion = mapContentClassToStyle(contentClass);
      expect(suggestion.label.length).toBeGreaterThan(0);
      expect(suggestion.padding).toBeGreaterThan(0);
      expect(suggestion.borderRadius).toBeGreaterThanOrEqual(0);
    }
  });

  it('maps code to indigo gradient with strong shadow', () => {
    const suggestion = mapContentClassToStyle('code');
    expect(suggestion.background).toEqual({ type: 'gradient', presetId: 'indigo' });
    expect(suggestion.padding).toBe(60);
    expect(suggestion.borderRadius).toBe(12);
    expect(suggestion.shadow).toEqual(SHADOW_STRONG);
  });

  it('maps ui to frost gradient with light shadow', () => {
    const suggestion = mapContentClassToStyle('ui');
    expect(suggestion.background).toEqual({ type: 'gradient', presetId: 'frost' });
    expect(suggestion.shadow).toEqual(SHADOW_LIGHT);
  });

  it('maps terminal to solid black background', () => {
    const suggestion = mapContentClassToStyle('terminal');
    expect(suggestion.background).toEqual({ type: 'solid', color: '#0d0d0d' });
    expect(suggestion.shadow).toEqual(SHADOW_MEDIUM);
  });

  it('maps photo to blurred screenshot background without shadow', () => {
    const suggestion = mapContentClassToStyle('photo');
    expect(suggestion.background).toEqual({ type: 'blurred-screenshot' });
    expect(suggestion.shadow).toEqual(SHADOW_NONE);
    expect(suggestion.borderRadius).toBe(0);
  });

  it('maps diagram to white solid background', () => {
    const suggestion = mapContentClassToStyle('diagram');
    expect(suggestion.background).toEqual({ type: 'solid', color: '#ffffff' });
  });

  it('maps text to cream gradient', () => {
    const suggestion = mapContentClassToStyle('text');
    expect(suggestion.background).toEqual({ type: 'gradient', presetId: 'cream' });
    expect(suggestion.borderRadius).toBe(4);
  });
});
