import { ed25519 } from '@noble/curves/ed25519.js';
import { describe, expect, it } from 'vitest';
import { verifyEntitlementToken } from './entitlement';

const NOW = 1_800_000_000;

function base64Url(bytes: Uint8Array | string): string {
  const binary =
    typeof bytes === 'string' ? bytes : Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function keyPair() {
  const secretKey = ed25519.utils.randomSecretKey();
  return { secretKey, publicKey: base64Url(ed25519.getPublicKey(secretKey)) };
}

function sign(
  secretKey: Uint8Array,
  claims: Record<string, unknown>,
  header: Record<string, unknown> = { alg: 'EdDSA' }
): string {
  const signed = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claims))}`;
  const signature = ed25519.sign(new TextEncoder().encode(signed), secretKey);
  return `${signed}.${base64Url(signature)}`;
}

const proClaims = { sub: 'user-1', plan: 'team_pro', iat: NOW - 10, exp: NOW + 3600 };

describe('verifyEntitlementToken', () => {
  it('accepts a valid token', () => {
    const { secretKey, publicKey } = keyPair();
    expect(verifyEntitlementToken(sign(secretKey, proClaims), publicKey, NOW, 'user-1')).toEqual({
      plan: 'team_pro',
      expiresAt: NOW + 3600,
    });
  });

  // Same token and key as the Rust test: proves the API (jose) and this verifier agree.
  it('accepts a token signed by the API library', () => {
    const token =
      'eyJhbGciOiJFZERTQSJ9.eyJwbGFuIjoidGVhbV9zdGFydGVyIiwic3ViIjoidXNlci0xIiwiaWF0IjoxNzk5OTk5OTkwLCJleHAiOjE4MDAwMDM2MDB9.CJS6QuQ7sujkxOqd3w34rid6hqbQxm56PnYRtCUqPQuWgLkD31YQngWNo4Cv2HH5Zrz7TP9QdQ26f_CjV0-1Cg';
    expect(
      verifyEntitlementToken(token, 'XcsqXF79sE-at8ZqsBudMIQSnOQbjYy15FqWoIwOEoo', NOW, 'user-1')
    ).toEqual({ plan: 'team_starter', expiresAt: NOW + 3600 });
  });

  it('rejects tampered claims', () => {
    const { secretKey, publicKey } = keyPair();
    const [header, , signature] = sign(secretKey, { ...proClaims, plan: 'free' }).split('.');
    const forged = `${header}.${base64Url(JSON.stringify(proClaims))}.${signature}`;
    expect(verifyEntitlementToken(forged, publicKey, NOW, 'user-1')).toBeNull();
  });

  it('rejects a token issued to another user', () => {
    const { secretKey, publicKey } = keyPair();
    expect(verifyEntitlementToken(sign(secretKey, proClaims), publicKey, NOW, 'user-2')).toBeNull();
    const noSub = sign(secretKey, { ...proClaims, sub: undefined });
    expect(verifyEntitlementToken(noSub, publicKey, NOW, 'user-1')).toBeNull();
  });

  it('rejects another key', () => {
    const token = sign(keyPair().secretKey, proClaims);
    expect(verifyEntitlementToken(token, keyPair().publicKey, NOW, 'user-1')).toBeNull();
  });

  it('rejects other algorithms', () => {
    const { secretKey, publicKey } = keyPair();
    expect(
      verifyEntitlementToken(sign(secretKey, proClaims, { alg: 'none' }), publicKey, NOW, 'user-1')
    ).toBeNull();
  });

  it('rejects expired tokens and tokens issued in the future', () => {
    const { secretKey, publicKey } = keyPair();
    const expired = sign(secretKey, { ...proClaims, iat: NOW - 7200, exp: NOW - 1 });
    const future = sign(secretKey, { ...proClaims, iat: NOW + 3600, exp: NOW + 7200 });
    expect(verifyEntitlementToken(expired, publicKey, NOW, 'user-1')).toBeNull();
    expect(verifyEntitlementToken(future, publicKey, NOW, 'user-1')).toBeNull();
  });

  it('rejects unknown plans and malformed tokens', () => {
    const { secretKey, publicKey } = keyPair();
    expect(
      verifyEntitlementToken(
        sign(secretKey, { ...proClaims, plan: 'gold' }),
        publicKey,
        NOW,
        'user-1'
      )
    ).toBeNull();
    expect(verifyEntitlementToken('not-a-token', publicKey, NOW, 'user-1')).toBeNull();
    expect(verifyEntitlementToken('a.b.c', publicKey, NOW, 'user-1')).toBeNull();
  });
});
