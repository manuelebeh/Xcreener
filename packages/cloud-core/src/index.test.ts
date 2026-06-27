import { describe, expect, it } from 'vitest';
import { computeExpiresAt, isShareExpired, isShareExpiry } from './index';

describe('cloud-core expiry', () => {
  const now = new Date('2026-06-27T12:00:00.000Z');

  it('computes relative expiries', () => {
    expect(computeExpiresAt('1h', now)?.toISOString()).toBe('2026-06-27T13:00:00.000Z');
    expect(computeExpiresAt('24h', now)?.toISOString()).toBe('2026-06-28T12:00:00.000Z');
    expect(computeExpiresAt('7d', now)?.toISOString()).toBe('2026-07-04T12:00:00.000Z');
    expect(computeExpiresAt('permanent', now)).toBeNull();
  });

  it('detects expired shares', () => {
    expect(isShareExpired(null, now)).toBe(false);
    expect(isShareExpired(new Date('2026-06-27T11:00:00.000Z'), now)).toBe(true);
    expect(isShareExpired(new Date('2026-06-27T13:00:00.000Z'), now)).toBe(false);
  });

  it('validates expiry enum', () => {
    expect(isShareExpiry('24h')).toBe(true);
    expect(isShareExpiry('forever')).toBe(false);
  });
});
