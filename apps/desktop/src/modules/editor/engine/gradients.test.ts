import { describe, expect, it } from 'vitest';
import { GRADIENT_PRESETS } from './gradients';

describe('GRADIENT_PRESETS', () => {
  it('provides at least 50 gradient presets', () => {
    expect(GRADIENT_PRESETS.length).toBeGreaterThanOrEqual(50);
  });

  it('uses unique preset ids', () => {
    const ids = GRADIENT_PRESETS.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
