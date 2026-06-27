import { describe, expect, it } from 'vitest';
import { mergeSettingsPatches } from './index';

describe('sync-core', () => {
  it('merges settings with LWW', () => {
    const merged = mergeSettingsPatches(
      [{ key: 'theme', value: 'dark', updatedAt: '2026-01-01T00:00:00Z' }],
      [{ key: 'theme', value: 'light', updatedAt: '2026-01-02T00:00:00Z' }]
    );
    expect(merged[0]?.value).toBe('light');
  });
});
