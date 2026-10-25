import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SCRYPT_SALT = 'xcreener-api-key-v1';

export function hashApiKey(plaintext: string): string {
  return scryptSync(plaintext, SCRYPT_SALT, 64).toString('hex');
}

export function verifyApiKey(plaintext: string, storedHash: string): boolean {
  const computed = hashApiKey(plaintext);
  const a = Buffer.from(computed, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

export function generateApiKeySecret(): string {
  return randomBytes(32).toString('base64url');
}
