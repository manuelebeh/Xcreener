import { buildCodeCaptureState, buildDesignCaptureState } from '@xcreener/plugin-core';
import { describe, expect, it } from 'vitest';

describe('plugin-core presets', () => {
  it('exports code and design capture states', () => {
    const code = buildCodeCaptureState(640, 480);
    const design = buildDesignCaptureState(640, 480);
    expect(code.background).toEqual({ type: 'gradient', presetId: 'midnight-code' });
    expect(design.background).toEqual({ type: 'solid', color: '#f8f9fb' });
  });
});
