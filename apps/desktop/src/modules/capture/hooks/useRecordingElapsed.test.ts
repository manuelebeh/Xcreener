import { describe, expect, it } from 'vitest';
import { computeRecordingElapsedSecs } from './useRecordingElapsed';

describe('computeRecordingElapsedSecs', () => {
  it('counts whole seconds from start time', () => {
    const start = 1_000_000;
    expect(computeRecordingElapsedSecs(start + 500, start, 0, false, null)).toBe(0);
    expect(computeRecordingElapsedSecs(start + 999, start, 0, false, null)).toBe(0);
    expect(computeRecordingElapsedSecs(start + 1_000, start, 0, false, null)).toBe(1);
    expect(computeRecordingElapsedSecs(start + 2_500, start, 0, false, null)).toBe(2);
  });

  it('excludes accumulated and active pause time', () => {
    const start = 0;
    expect(computeRecordingElapsedSecs(10_000, start, 3_000, false, null)).toBe(7);
    // Paused at 7s - display stays at 7 while clock runs
    expect(computeRecordingElapsedSecs(10_000, start, 0, true, 7_000)).toBe(7);
  });

  it('caps elapsed at max duration', () => {
    expect(computeRecordingElapsedSecs(35_000, 0, 0, false, null, 30)).toBe(30);
  });

  it('never returns negative elapsed', () => {
    expect(computeRecordingElapsedSecs(500, 1_000, 0, false, null)).toBe(0);
  });
});
