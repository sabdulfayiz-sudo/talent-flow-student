import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  detectLocale,
  I18nContext,
  interpolate,
  LANG_KEY,
  lookup,
  type I18nContextValue,
  type Locale,
} from './index';

/**
 * Lightweight, zero-dependency i18n provider.
 *
 * - Locales live in `./{en,ru,uz}.json` as nested objects.
 * - `t('a.b.c')` walks the tree; falls back to English and then to the
 *   raw key if the key is missing in the active locale.
 * - `t('greet', { name: 'Ada' })` substitutes `{name}` tokens.
 * - The active locale is persisted to `localStorage[LANG_KEY]`.
 * - Updating the locale also writes `<html lang>` so screen readers and
 *   browser spellcheck pick up the change.
 */
const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(() => detectLocale());

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(LANG_KEY, next);
    } catch {
      // ignore quota / privacy errors
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const resolved = lookup(locale, key);
      return interpolate(resolved ?? key, params);
    },
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export default I18nProvider;
