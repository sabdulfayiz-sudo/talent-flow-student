import { useCallback, useEffect, useState } from 'react';

export const THEME_KEY = 'tf-theme';
const DARK_CLASS = 'tf-dark';

export type Theme = 'light' | 'dark';

const detectInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

const applyTheme = (theme: Theme) => {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle(DARK_CLASS, theme === 'dark');
  document.documentElement.style.colorScheme = theme;
};

let listeners: Array<(theme: Theme) => void> = [];

const subscribe = (cb: (theme: Theme) => void) => {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
};

const broadcast = (theme: Theme) => {
  for (const cb of listeners) cb(theme);
};

/**
 * Centralized theme hook. Light/dark is mirrored to the `.tf-dark` class on
 * `<html>` and to localStorage, so reads on mount are stable and changes
 * propagate to every consumer in the same tab.
 */
export const useTheme = () => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const initial = detectInitialTheme();
    applyTheme(initial);
    return initial;
  });

  useEffect(() => subscribe(setThemeState), []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_KEY) return;
      const next: Theme = e.newValue === 'dark' ? 'dark' : 'light';
      applyTheme(next);
      setThemeState(next);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    window.localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
    setThemeState(next);
    broadcast(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [setTheme, theme]);

  return { theme, isDark: theme === 'dark', setTheme, toggleTheme };
};

export default useTheme;
