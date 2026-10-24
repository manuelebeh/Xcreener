import { ed25519 } from '@noble/curves/ed25519.js';
import { isWorkspacePlan, type WorkspacePlan } from './index';

/** Tolerated drift between the API clock and the device. */
const CLOCK_SKEW_SECONDS = 300;

export interface VerifiedEntitlement {
  plan: WorkspacePlan;
  /** Unix seconds. */
  expiresAt: number;
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '='));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function decodeJson(segment: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(base64UrlToBytes(segment)));
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Checks a plan token signed by the API (`GET /v1/me/entitlement`). Same rules as the desktop
 * verifier (`src-tauri/src/entitlement.rs`): EdDSA only, strict RFC 8032 signature, issued
 * to `expectedUserId` (the `userId` returned next to the token), unexpired, not issued in the
 * future. Any failure returns null, which callers treat as the free plan.
 */
export function verifyEntitlementToken(
  token: string,
  publicKeyBase64Url: string,
  nowSeconds: number,
  expectedUserId: string
): VerifiedEntitlement | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  const [headerSegment, claimsSegment, signatureSegment] = parts as [string, string, string];

  if (decodeJson(headerSegment)?.alg !== 'EdDSA') {
    return null;
  }

  try {
    const signed = new TextEncoder().encode(`${headerSegment}.${claimsSegment}`);
    const valid = ed25519.verify(
      base64UrlToBytes(signatureSegment),
      signed,
      base64UrlToBytes(publicKeyBase64Url),
      { zip215: false }
    );
    if (!valid) {
      return null;
    }
  } catch {
    return null;
  }

  const claims = decodeJson(claimsSegment);
  const { sub, plan, iat, exp } = claims ?? {};
  if (sub !== expectedUserId) {
    return null;
  }
  if (typeof plan !== 'string' || !isWorkspacePlan(plan)) {
    return null;
  }
  if (typeof iat !== 'number' || typeof exp !== 'number') {
    return null;
  }
  if (exp <= nowSeconds || iat > nowSeconds + CLOCK_SKEW_SECONDS) {
    return null;
  }

  return { plan, expiresAt: exp };
}
