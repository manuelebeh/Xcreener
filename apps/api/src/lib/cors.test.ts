import { describe, expect, it } from 'vitest';
import { isOriginAllowed } from './cors';

describe('isOriginAllowed', () => {
  const allowed = ['http://localhost:3000', 'https://snapglow.app'];

  it('allows missing origin (non-browser clients)', () => {
    expect(isOriginAllowed(undefined, allowed)).toBe(true);
  });

  it('allows configured origins', () => {
    expect(isOriginAllowed('http://localhost:3000', allowed)).toBe(true);
  });

  it('rejects unknown origins', () => {
    expect(isOriginAllowed('https://evil.example', allowed)).toBe(false);
  });
});
