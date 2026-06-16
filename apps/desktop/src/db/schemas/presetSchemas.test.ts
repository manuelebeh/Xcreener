import { describe, expect, it } from 'vitest';
import {
  createCustomPresetInputSchema,
  parseStoredAspectRatio,
  parseStoredBackground,
  parseStoredShadow,
  serializeStoredBackground,
} from './presetSchemas';

describe('presetSchemas', () => {
  it('parses valid gradient background JSON', () => {
    expect(parseStoredBackground('{"type":"gradient","presetId":"snapglow-brand"}')).toEqual({
      type: 'gradient',
      presetId: 'snapglow-brand',
    });
  });

  it('falls back for invalid background JSON', () => {
    expect(parseStoredBackground('{"type":"image"}')).toEqual({
      type: 'gradient',
      presetId: 'snapglow-brand',
    });
    expect(parseStoredBackground('not-json')).toEqual({
      type: 'gradient',
      presetId: 'snapglow-brand',
    });
  });

  it('parses valid shadow JSON', () => {
    const shadow = {
      opacity: 0.5,
      blur: 12,
      offsetX: 2,
      offsetY: 4,
      color: '#000000',
    };
    expect(parseStoredShadow(JSON.stringify(shadow))).toEqual(shadow);
  });

  it('falls back for invalid shadow JSON', () => {
    const fallback = parseStoredShadow('{}');
    expect(fallback.opacity).toBe(0.35);
    expect(fallback.blur).toBe(24);
  });

  it('parses aspect ratio or defaults to 16:9', () => {
    expect(parseStoredAspectRatio('1:1')).toBe('1:1');
    expect(parseStoredAspectRatio('invalid')).toBe('16:9');
    expect(parseStoredAspectRatio(null)).toBe('16:9');
  });

  it('serializes only storable backgrounds', () => {
    expect(serializeStoredBackground({ type: 'solid', color: '#ff0000' })).toBe(
      '{"type":"solid","color":"#ff0000"}'
    );
    expect(serializeStoredBackground({ type: 'image' } as { type: string })).toContain('gradient');
  });

  it('validates create input', () => {
    const result = createCustomPresetInputSchema.safeParse({
      name: 'Blog',
      width: 1920,
      height: 1080,
      aspectRatio: '16:9',
      style: {
        background: { type: 'gradient', presetId: 'snapglow-brand' },
        padding: 40,
        borderRadius: 12,
        shadow: {
          opacity: 0.35,
          blur: 24,
          offsetX: 0,
          offsetY: 8,
          color: '#000000',
        },
      },
    });

    expect(result.success).toBe(true);
  });

  it('rejects empty preset name', () => {
    const result = createCustomPresetInputSchema.safeParse({
      name: '   ',
      width: 1080,
      height: 1080,
      aspectRatio: '1:1',
      style: {
        background: { type: 'solid', color: '#667eea' },
        padding: 40,
        borderRadius: 12,
        shadow: {
          opacity: 0.35,
          blur: 24,
          offsetX: 0,
          offsetY: 8,
          color: '#000000',
        },
      },
    });

    expect(result.success).toBe(false);
  });
});
