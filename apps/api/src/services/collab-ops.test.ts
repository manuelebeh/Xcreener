import { describe, expect, it } from 'vitest';
import { applyAnnotationOp } from './collab-ops';
import type { CollabDocumentState } from '@snapglow/collab-core';

const baseState: CollabDocumentState = {
  screenshotWidth: 800,
  screenshotHeight: 600,
  background: { type: 'solid', color: '#ffffff' },
  padding: 40,
  borderRadius: 12,
  shadow: { opacity: 0.3, blur: 12, offsetX: 0, offsetY: 4, color: '#000' },
  frame: null,
  transform: { scale: 1, offsetX: 0, offsetY: 0 },
  annotations: [],
};

describe('collab-ops', () => {
  it('adds annotations', () => {
    const next = applyAnnotationOp(baseState, {
      op: 'add',
      annotation: {
        type: 'rect',
        id: 'a1',
        x: 1,
        y: 2,
        width: 10,
        height: 10,
        stroke: '#000',
        strokeWidth: 2,
        fill: null,
      },
    });
    expect(next.annotations).toHaveLength(1);
  });

  it('removes annotations', () => {
    const withRect = applyAnnotationOp(baseState, {
      op: 'add',
      annotation: {
        type: 'rect',
        id: 'a1',
        x: 1,
        y: 2,
        width: 10,
        height: 10,
        stroke: '#000',
        strokeWidth: 2,
        fill: null,
      },
    });
    const next = applyAnnotationOp(withRect, { op: 'remove', annotationId: 'a1' });
    expect(next.annotations).toHaveLength(0);
  });
});
