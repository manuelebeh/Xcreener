import { I18nProvider, initI18n, resolveLocale, type SupportedLocale } from '@xcreener/i18n';
import { type ReactNode, useEffect } from 'react';

interface XcreenerI18nProviderProps {
  children: ReactNode;
  locale?: SupportedLocale | string | null;
}

export function XcreenerI18nProvider({ children, locale }: XcreenerI18nProviderProps) {
  const resolved = resolveLocale(locale ?? null);
  const i18n = initI18n(resolved);

  useEffect(() => {
    void i18n.changeLanguage(resolved);
  }, [i18n, resolved]);

  return <I18nProvider i18n={i18n}>{children}</I18nProvider>;
}
