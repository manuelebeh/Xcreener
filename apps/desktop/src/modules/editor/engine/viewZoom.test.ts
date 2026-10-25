import { describe, expect, it } from 'vitest';
import { stepViewZoom } from './viewZoom';

describe('stepViewZoom', () => {
  it('steps up to the next stop from a fit scale between stops', () => {
    expect(stepViewZoom(0.62, 'in')).toBe(0.75);
    expect(stepViewZoom(0.62, 'out')).toBe(0.5);
  });

  it('moves one stop from an exact stop', () => {
    expect(stepViewZoom(1, 'in')).toBe(1.5);
    expect(stepViewZoom(1, 'out')).toBe(0.75);
  });

  it('returns null past either end', () => {
    expect(stepViewZoom(4, 'in')).toBeNull();
    expect(stepViewZoom(0.25, 'out')).toBeNull();
  });
});
