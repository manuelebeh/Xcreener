import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as de from './locales/de';
import * as en from './locales/en';
import * as fr from './locales/fr';
import * as ja from './locales/ja';

export const SUPPORTED_LOCALES = ['en', 'fr', 'de', 'ja'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  ja: '日本語',
};

export const DEFAULT_LOCALE: SupportedLocale = 'en';

const resources = {
  en: { common: en.commonEn, marketing: en.marketingEn, settings: en.settingsEn },
  fr: { common: fr.commonFr, marketing: fr.marketingFr, settings: fr.settingsFr },
  de: { common: de.commonDe, marketing: de.marketingDe, settings: de.settingsDe },
  ja: { common: ja.commonJa, marketing: ja.marketingJa, settings: ja.settingsJa },
};

export function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function resolveLocale(value: string | null | undefined): SupportedLocale {
  if (value && isSupportedLocale(value)) {
    return value;
  }
  if (typeof navigator !== 'undefined') {
    const browser = navigator.language.slice(0, 2);
    if (isSupportedLocale(browser)) {
      return browser;
    }
  }
  return DEFAULT_LOCALE;
}

let initialized = false;

export function initI18n(locale?: SupportedLocale): typeof i18n {
  const lng = locale ?? resolveLocale(null);

  if (initialized) {
    void i18n.changeLanguage(lng);
    return i18n;
  }

  void i18n.use(initReactI18next).init({
    resources,
    lng,
    fallbackLng: DEFAULT_LOCALE,
    defaultNS: 'common',
    interpolation: { escapeValue: false },
  });

  initialized = true;
  return i18n;
}

export { i18n };
export { I18nextProvider as I18nProvider, useTranslation } from 'react-i18next';
export { SnapGlowI18nProvider } from './provider';

export function getEnglishResourceKeys(): string[] {
  const keys: string[] = [];
  for (const ns of ['common', 'marketing', 'settings'] as const) {
    const bucket = resources.en[ns] as Record<string, string>;
    for (const key of Object.keys(bucket)) {
      keys.push(`${ns}.${key}`);
    }
  }
  return keys;
}

export function getMissingKeysForLocale(locale: SupportedLocale): string[] {
  if (locale === 'en') {
    return [];
  }
  const missing: string[] = [];
  for (const fullKey of getEnglishResourceKeys()) {
    const [ns, key] = fullKey.split('.') as [keyof typeof resources.en, string];
    const bucket = resources[locale][ns] as Record<string, string | undefined>;
    if (!bucket[key]) {
      missing.push(fullKey);
    }
  }
  return missing;
}
