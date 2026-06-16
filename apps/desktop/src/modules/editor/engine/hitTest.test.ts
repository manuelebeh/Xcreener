import { describe, expect, it } from 'vitest';
import type { LineAnnotation, RectAnnotation } from '../annotations/types';
import { getResizeHandles, hitTestAnnotation, hitTestHandle } from './hitTest';

describe('hitTest', () => {
  const rect: RectAnnotation = {
    type: 'rect',
    id: 'rect-1',
    x: 10,
    y: 10,
    width: 100,
    height: 50,
    stroke: '#000',
    strokeWidth: 2,
    fill: null,
  };

  const line: LineAnnotation = {
    type: 'line',
    id: 'line-1',
    x1: 0,
    y1: 0,
    x2: 100,
    y2: 0,
    stroke: '#000',
    strokeWidth: 2,
  };

  it('selects top-most annotation', () => {
    const hit = hitTestAnnotation([rect, line], 50, 5);
    expect(hit?.id).toBe('line-1');
  });

  it('detects resize handles', () => {
    const handles = getResizeHandles(rect);
    expect(hitTestHandle(handles, 10, 10)).toBe('nw');
    expect(hitTestHandle(handles, 110, 60)).toBe('se');
  });
});
