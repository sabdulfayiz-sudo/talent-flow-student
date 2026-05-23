import { useCallback, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_KEY = 'tf-theme';

const getSystemDark = () =>
  window.matchMedia('(prefers-color-scheme: dark)').matches;

const getResolvedDark = (mode: ThemeMode) => {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return getSystemDark();
};

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(THEME_KEY) as ThemeMode | null;
    return saved ?? 'light';
  });

  const isDark = getResolvedDark(mode);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, mode);
    document.documentElement.classList.toggle('tf-dark', isDark);
  }, [mode, isDark]);

  // Listen for system changes when in system mode
  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      document.documentElement.classList.toggle('tf-dark', getSystemDark());
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  // Listen for storage changes from other tabs / components
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === THEME_KEY) {
        const next = (e.newValue as ThemeMode) || 'light';
        setMode(next);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const setTheme = useCallback((next: ThemeMode) => {
    setMode(next);
    // Also dispatch a synthetic storage event so other components
    // in the same tab can react if they are listening.
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: THEME_KEY,
        newValue: next,
        oldValue: localStorage.getItem(THEME_KEY),
        storageArea: localStorage,
      }),
    );
  }, []);

  return { mode, isDark, setTheme };
}
