import { describe, expect, it } from 'vitest';
import {
  BUILT_IN_PRESETS,
  FREE_PRESET_ID,
  getPresetById,
  SOCIAL_PRESETS,
  STANDARD_PRESETS,
} from './presets';

describe('presets', () => {
  it('includes 5 social presets', () => {
    expect(SOCIAL_PRESETS).toHaveLength(5);
    expect(SOCIAL_PRESETS.map((p) => p.id)).toEqual([
      'twitter',
      'linkedin',
      'facebook',
      'instagram',
      'youtube',
    ]);
  });

  it('includes standard ratios plus free', () => {
    expect(STANDARD_PRESETS.map((p) => p.id)).toEqual([
      'ratio-16-9',
      'ratio-4-3',
      'ratio-1-1',
      FREE_PRESET_ID,
    ]);
  });

  it('has correct export dimensions for social presets', () => {
    expect(getPresetById('twitter')).toMatchObject({
      width: 1600,
      height: 900,
      aspectRatio: '16:9',
    });
    expect(getPresetById('linkedin')).toMatchObject({
      width: 1200,
      height: 627,
      aspectRatio: '1.91:1',
    });
    expect(getPresetById('instagram')).toMatchObject({
      width: 1080,
      height: 1080,
      aspectRatio: '1:1',
    });
    expect(getPresetById('youtube')).toMatchObject({
      width: 1280,
      height: 720,
      aspectRatio: '16:9',
    });
  });

  it('resolves custom presets by id', () => {
    const custom = [
      {
        id: 'custom-1',
        name: 'My preset',
        category: 'custom' as const,
        width: 800,
        height: 600,
        aspectRatio: '4:3' as const,
      },
    ];
    expect(getPresetById('custom-1', custom)?.name).toBe('My preset');
  });

  it('returns null for free preset id', () => {
    expect(getPresetById(FREE_PRESET_ID)).toBeNull();
    expect(getPresetById(null)).toBeNull();
  });

  it('has at least 9 built-in presets', () => {
    expect(BUILT_IN_PRESETS.length).toBeGreaterThanOrEqual(9);
  });
});
