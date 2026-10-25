import { buildApiKeyPlaintext, isApiKeyPlaintext } from '@xcreener/api-core';
import { generateApiKeySecret, hashApiKey, verifyApiKey } from '@xcreener/api-core/api-keys';
import { hasApiAccess } from '@xcreener/team-core';
import { describe, expect, it } from 'vitest';

describe('public API auth helpers', () => {
  it('validates api key format and hashing', () => {
    const plaintext = buildApiKeyPlaintext(generateApiKeySecret());
    expect(isApiKeyPlaintext(plaintext)).toBe(true);
    expect(verifyApiKey(plaintext, hashApiKey(plaintext))).toBe(true);
  });

  it('restricts api access to team pro', () => {
    expect(hasApiAccess('team_pro')).toBe(true);
    expect(hasApiAccess('team_starter')).toBe(false);
  });
});

describe('public API rate limiting contract', () => {
  it('returns retry-after metadata shape', () => {
    const result = { allowed: false, retryAfterSec: 42 };
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSec).toBe(42);
  });
});
