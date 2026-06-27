import { getMissingKeysForLocale, SUPPORTED_LOCALES } from '../src/index';

let failed = false;

for (const locale of SUPPORTED_LOCALES) {
  const missing = getMissingKeysForLocale(locale);
  if (missing.length > 0) {
    failed = true;
    console.error(`Missing keys for ${locale}:`, missing.join(', '));
  }
}

if (failed) {
  process.exit(1);
}

console.log('All i18n keys present for supported locales.');
