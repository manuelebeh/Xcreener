import { I18nProvider, initI18n, resolveLocale, type SupportedLocale } from '@snapglow/i18n';
import { type ReactNode, useEffect } from 'react';

interface SnapGlowI18nProviderProps {
  children: ReactNode;
  locale?: SupportedLocale | string | null;
}

export function SnapGlowI18nProvider({ children, locale }: SnapGlowI18nProviderProps) {
  const resolved = resolveLocale(locale ?? null);
  const i18n = initI18n(resolved);

  useEffect(() => {
    void i18n.changeLanguage(resolved);
  }, [i18n, resolved]);

  return <I18nProvider i18n={i18n}>{children}</I18nProvider>;
}
