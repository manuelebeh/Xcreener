/**
 * Generates the Ed25519 key pair for desktop entitlements.
 *
 * - ENTITLEMENT_PRIVATE_KEY (API env, secret): signs entitlement tokens.
 * - XCREENER_ENTITLEMENT_PUBLIC_KEY (desktop build env, public): verifies them in Rust.
 *
 * Usage: pnpm --filter @xcreener/api exec tsx scripts/generate-entitlement-keys.ts
 */
import { exportJWK, exportPKCS8, generateKeyPair } from 'jose';

const { privateKey, publicKey } = await generateKeyPair('EdDSA', { extractable: true });
const privatePem = await exportPKCS8(privateKey);
const { x } = await exportJWK(publicKey);

console.log('# apps/api/.env.local (keep secret)');
console.log(`ENTITLEMENT_PRIVATE_KEY="${privatePem.trim().replaceAll('\n', '\\n')}"`);
console.log('\n# Desktop build environment (public, raw key, base64url)');
console.log(`XCREENER_ENTITLEMENT_PUBLIC_KEY=${x}`);
