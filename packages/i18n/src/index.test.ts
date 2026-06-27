import { describe, expect, it } from 'vitest';
import { getMissingKeysForLocale, isSupportedLocale, resolveLocale } from './index';

describe('i18n', () => {
  it('resolves supported locales', () => {
    expect(isSupportedLocale('fr')).toBe(true);
    expect(isSupportedLocale('xx')).toBe(false);
  });

  it('falls back to en', () => {
    expect(resolveLocale('invalid')).toBe('en');
  });

  it('has complete fr translations for MVP keys', () => {
    expect(getMissingKeysForLocale('fr')).toEqual([]);
  });
});
