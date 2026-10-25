import { describe, expect, it } from 'vitest';
import type { ContentAnalysis } from '@/shared/types/ipc';
import { annotationShift, rgbaToHex, sourceRect } from './balance';

// 400x300 capture, content offset to the top-left: margins 40 / 20 / 160 / 180.
const analysis: ContentAnalysis = {
  bounds: { x: 40, y: 20, width: 200, height: 100 },
  background: [255, 255, 255, 255],
};

describe('sourceRect', () => {
  it('keeps the whole capture when balance is off', () => {
    expect(sourceRect(analysis, 400, 300, false)).toEqual({ x: 0, y: 0, width: 400, height: 300 });
  });

  it('gives every side the smallest margin when balance is on', () => {
    expect(sourceRect(analysis, 400, 300, true)).toEqual({
      x: 20,
      y: 0,
      width: 240,
      height: 140,
    });
  });

  it('trims to the content when it touches an edge', () => {
    const touching = { ...analysis, bounds: { x: 0, y: 20, width: 200, height: 100 } };
    expect(sourceRect(touching, 400, 300, true)).toEqual({ x: 0, y: 20, width: 200, height: 100 });
  });
});

describe('annotationShift', () => {
  it('follows the source pixel at the same scale', () => {
    const before = {
      rect: { x: 40, y: 40, width: 400, height: 300 },
      width: 400,
      height: 300,
      origin: { x: 0, y: 0 },
    };
    // Balanced to 240x140: source (0, 0) now sits at (-20, 0).
    const after = {
      rect: { x: 40, y: 40, width: 240, height: 140 },
      width: 240,
      height: 140,
      origin: { x: -20, y: 0 },
    };
    expect(annotationShift(before, after, { x: 140, y: 70 })).toEqual({ x: -20, y: 0 });
  });

  it('accounts for the fit scale of a frame preset', () => {
    const before = {
      rect: { x: 0, y: 0, width: 200, height: 100 },
      width: 400,
      height: 200,
      origin: { x: 0, y: 0 },
    };
    const after = {
      rect: { x: 0, y: 0, width: 200, height: 100 },
      width: 200,
      height: 100,
      origin: { x: -100, y: -50 },
    };
    expect(annotationShift(before, after, { x: 200, y: 100 })).toEqual({ x: 0, y: 0 });
  });
});

describe('rgbaToHex', () => {
  it('pads each channel and drops alpha', () => {
    expect(rgbaToHex([0, 15, 255, 128])).toBe('#000fff');
  });
});
