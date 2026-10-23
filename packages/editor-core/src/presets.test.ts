import { describe, expect, it } from 'vitest';
import {
  BUILT_IN_PRESETS,
  FREE_PRESET_ID,
  getNetworkPresets,
  getPresetById,
  getPresetLabel,
  getPresetStyleDefaults,
  SOCIAL_NETWORKS,
  SOCIAL_PRESETS,
  STANDARD_PRESETS,
} from './presets';

describe('presets', () => {
  it('gives every social preset a network, a unique id and a size', () => {
    const ids = SOCIAL_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const preset of SOCIAL_PRESETS) {
      expect(preset.network).toBeDefined();
      expect(preset.width).toBeGreaterThan(0);
      expect(preset.height).toBeGreaterThan(0);
    }
  });

  it('keeps the network id as the first variant of each network', () => {
    for (const network of SOCIAL_NETWORKS) {
      expect(getNetworkPresets(network.id)[0]?.id).toBe(network.id);
    }
  });

  it('groups variants by network', () => {
    expect(getNetworkPresets('linkedin').map((p) => p.id)).toEqual([
      'linkedin',
      'linkedin-square',
      'linkedin-portrait',
      'linkedin-banner',
    ]);
    expect(getNetworkPresets('youtube').map((p) => p.id)).toEqual([
      'youtube',
      'youtube-shorts',
      'youtube-post',
    ]);
    expect(getNetworkPresets('snapchat')).toHaveLength(1);
  });

  it('falls back to the network style for variants', () => {
    expect(getPresetStyleDefaults('linkedin-portrait')).toEqual(getPresetStyleDefaults('linkedin'));
    expect(getPresetStyleDefaults('unknown')).toBeNull();
  });

  it('labels social variants with their network', () => {
    const story = getPresetById('snapchat');
    const ratio = getPresetById('ratio-16-9');
    expect(story && getPresetLabel(story)).toBe('Snapchat · Story / Spotlight');
    expect(ratio && getPresetLabel(ratio)).toBe('16:9');
  });

  it('has portrait and story sizes', () => {
    expect(getPresetById('instagram-story')).toMatchObject({
      width: 1080,
      height: 1920,
      aspectRatio: '9:16',
    });
    expect(getPresetById('linkedin-portrait')).toMatchObject({
      width: 1080,
      height: 1350,
      aspectRatio: '4:5',
    });
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
