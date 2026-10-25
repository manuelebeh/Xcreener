import { defaultCollabDocumentState } from '@xcreener/collab-core';
import { describe, expect, it } from 'vitest';
import { collabDocumentStateSchema, MAX_COLLAB_ANNOTATIONS } from './index';

describe('collabDocumentStateSchema bounds', () => {
  const base = defaultCollabDocumentState(1920, 1080);

  it('accepts the default document', () => {
    expect(collabDocumentStateSchema.safeParse(base).success).toBe(true);
  });

  it('accepts a social frame preset', () => {
    const framed = {
      ...base,
      frame: {
        id: 'twitter',
        name: 'Twitter',
        category: 'social',
        width: 1600,
        height: 900,
        aspectRatio: '16:9',
      },
    };
    expect(collabDocumentStateSchema.safeParse(framed).success).toBe(true);
  });

  it('rejects padding and frame sizes that would stall the renderer', () => {
    expect(collabDocumentStateSchema.safeParse({ ...base, padding: 1e4 }).success).toBe(false);
    const hugeFrame = {
      ...base,
      frame: {
        id: 'x',
        name: 'x',
        category: 'custom',
        width: 200_000,
        height: 200_000,
        aspectRatio: '1:1',
      },
    };
    expect(collabDocumentStateSchema.safeParse(hugeFrame).success).toBe(false);
  });

  it('rejects non-finite numbers', () => {
    expect(
      collabDocumentStateSchema.safeParse({ ...base, screenshotWidth: Number.NaN }).success
    ).toBe(false);
    expect(
      collabDocumentStateSchema.safeParse({
        ...base,
        transform: { ...base.transform, offsetX: Number.POSITIVE_INFINITY },
      }).success
    ).toBe(false);
  });

  it('caps the annotation count', () => {
    const annotations = Array.from({ length: MAX_COLLAB_ANNOTATIONS + 1 }, (_, index) => ({
      id: `a-${index}`,
      type: 'rect',
    }));
    expect(collabDocumentStateSchema.safeParse({ ...base, annotations }).success).toBe(false);
    expect(
      collabDocumentStateSchema.safeParse({ ...base, annotations: annotations.slice(1) }).success
    ).toBe(true);
  });
});
