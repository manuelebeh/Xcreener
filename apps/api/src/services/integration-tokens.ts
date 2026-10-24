import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env } from '../env';

/**
 * Provider refresh tokens never reach clients in usable form. The API hands out a sealed
 * `refreshHandle` (AES-256-GCM, bound to the user and provider through the associated data)
 * and keeps nothing server side. A stolen handle is useless without the same SnapGlow account,
 * and cannot be redeemed directly at the provider.
 */

const VERSION = 'v1';
const IV_BYTES = 12;
const TAG_BYTES = 16;

function key(): Buffer | null {
  return env.INTEGRATION_TOKEN_KEY ? Buffer.from(env.INTEGRATION_TOKEN_KEY, 'base64') : null;
}

function associatedData(userId: string, provider: string): Buffer {
  return Buffer.from(`${VERSION}:${userId}:${provider}`);
}

export function canSealRefreshTokens(): boolean {
  return key() !== null;
}

export function sealRefreshToken(
  refreshToken: string,
  userId: string,
  provider: string
): string | null {
  const secret = key();
  if (!secret) {
    return null;
  }
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', secret, iv);
  cipher.setAAD(associatedData(userId, provider));
  const ciphertext = Buffer.concat([cipher.update(refreshToken, 'utf8'), cipher.final()]);
  const sealed = Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64url');
  return `${VERSION}.${sealed}`;
}

/** The refresh token, or null when the handle is malformed, tampered or issued to someone else. */
export function openRefreshHandle(handle: string, userId: string, provider: string): string | null {
  const secret = key();
  const [version, sealed] = handle.split('.');
  if (!secret || version !== VERSION || !sealed) {
    return null;
  }
  const bytes = Buffer.from(sealed, 'base64url');
  if (bytes.length <= IV_BYTES + TAG_BYTES) {
    return null;
  }
  try {
    const decipher = createDecipheriv('aes-256-gcm', secret, bytes.subarray(0, IV_BYTES));
    decipher.setAAD(associatedData(userId, provider));
    decipher.setAuthTag(bytes.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
    return Buffer.concat([
      decipher.update(bytes.subarray(IV_BYTES + TAG_BYTES)),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return null;
  }
}
