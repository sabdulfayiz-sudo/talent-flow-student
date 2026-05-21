import {
  createContext,
  useContext,
} from 'react';
import en from './en.json';
import ru from './ru.json';
import uz from './uz.json';

export const LANG_KEY = 'tf-language';
export const SUPPORTED_LOCALES = ['en', 'ru', 'uz'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

type Dictionary = Record<string, unknown>;

export const DICTIONARIES: Record<Locale, Dictionary> = {
  en: en as Dictionary,
  ru: ru as Dictionary,
  uz: uz as Dictionary,
};

export const detectLocale = (): Locale => {
  if (typeof window === 'undefined') return 'en';
  const saved = window.localStorage.getItem(LANG_KEY);
  if (saved && (SUPPORTED_LOCALES as readonly string[]).includes(saved)) {
    return saved as Locale;
  }
  const navLang = (window.navigator.language || 'en').toLowerCase();
  if (navLang.startsWith('ru')) return 'ru';
  if (navLang.startsWith('uz')) return 'uz';
  return 'en';
};

const walk = (dict: Dictionary, path: string[]): unknown => {
  let cursor: unknown = dict;
  for (const segment of path) {
    if (
      cursor &&
      typeof cursor === 'object' &&
      segment in (cursor as Record<string, unknown>)
    ) {
      cursor = (cursor as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }
  return cursor;
};

export const lookup = (locale: Locale, key: string): string | undefined => {
  const segments = key.split('.');
  const direct = walk(DICTIONARIES[locale], segments);
  if (typeof direct === 'string') return direct;
  if (locale !== 'en') {
    const fallback = walk(DICTIONARIES.en, segments);
    if (typeof fallback === 'string') return fallback;
  }
  return undefined;
};

export const interpolate = (
  template: string,
  params?: Record<string, string | number>,
) => {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) => {
    const value = params[name];
    return value !== undefined && value !== null ? String(value) : match;
  });
};

export interface I18nContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export const useI18n = (): I18nContextValue => {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used inside <I18nProvider>');
  }
  return ctx;
};

export const useTranslation = useI18n;
