import { describe, expect, it } from 'vitest';
import { createAnnotationFromDrag } from '../annotations/create';
import { DEFAULT_TOOL_DEFAULTS } from '../annotations/types';

describe('createAnnotationFromDrag', () => {
  it('allows zero-size drafts for box tools when requested', () => {
    const draft = createAnnotationFromDrag('rect', DEFAULT_TOOL_DEFAULTS, 10, 20, 10, 20, {
      allowEmptySize: true,
    });

    expect(draft).toMatchObject({
      type: 'rect',
      x: 10,
      y: 20,
      width: 0,
      height: 0,
    });
  });

  it('rejects zero-size box shapes by default', () => {
    expect(createAnnotationFromDrag('highlight', DEFAULT_TOOL_DEFAULTS, 0, 0, 0, 0)).toBeNull();
  });

  it('still allows zero-length lines for initial drag', () => {
    expect(createAnnotationFromDrag('line', DEFAULT_TOOL_DEFAULTS, 0, 0, 0, 0)).not.toBeNull();
  });
});
