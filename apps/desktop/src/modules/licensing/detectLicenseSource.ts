import type { LicenseSource } from '@/shared/types/settings';

/** Detect Setapp distribution via env stub or receipt path (Setapp SDK integration pending review). */
export function detectLicenseSource(): LicenseSource {
  if (import.meta.env.VITE_LICENSE_SOURCE === 'setapp') {
    return 'setapp';
  }
  if (import.meta.env.VITE_LICENSE_SOURCE === 'appsumo') {
    return 'appsumo';
  }
  return 'direct';
}

export function isExternalLicense(source: LicenseSource): boolean {
  return source === 'setapp' || source === 'appsumo' || source === 'partner';
}
