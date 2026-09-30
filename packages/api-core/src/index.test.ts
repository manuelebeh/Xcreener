import { describe, expect, it } from 'vitest';
import { generateApiKeySecret, hashApiKey, verifyApiKey } from './api-keys';
import {
  API_KEY_PREFIX,
  apiKeyDisplayPrefix,
  buildApiKeyPlaintext,
  isApiKeyPlaintext,
  isExportFormat,
} from './index';

describe('api-core keys', () => {
  it('generates and verifies api keys', () => {
    const secret = generateApiKeySecret();
    const plaintext = buildApiKeyPlaintext(secret);
    const hash = hashApiKey(plaintext);

    expect(plaintext.startsWith(API_KEY_PREFIX)).toBe(true);
    expect(isApiKeyPlaintext(plaintext)).toBe(true);
    expect(apiKeyDisplayPrefix(plaintext)).toHaveLength(API_KEY_PREFIX.length + 4);
    expect(verifyApiKey(plaintext, hash)).toBe(true);
    expect(verifyApiKey(`${plaintext}x`, hash)).toBe(false);
  });
});

describe('api-core export formats', () => {
  it('recognizes export formats', () => {
    expect(isExportFormat('png')).toBe(true);
    expect(isExportFormat('gif')).toBe(false);
  });
});
