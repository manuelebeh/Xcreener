import { describe, expect, it } from 'vitest';
import { createTokenBucket } from './collab-ws';

describe('createTokenBucket', () => {
  it('allows a burst, then refills at the configured rate', () => {
    let now = 0;
    const take = createTokenBucket(20, 50, () => now);

    const burst = Array.from({ length: 60 }, () => take());
    expect(burst.filter(Boolean)).toHaveLength(50);
    expect(take()).toBe(false);

    now += 100; // 2 tokens at 20/s
    expect(take()).toBe(true);
    expect(take()).toBe(true);
    expect(take()).toBe(false);
  });
});
