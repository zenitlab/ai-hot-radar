'use client';

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';

/**
 * Theme lives in the `data-theme` attribute on <html>. An inline script in
 * app/layout.tsx sets it before first paint (saved choice, else the system
 * setting); this provider only reads it and writes it on toggle. A choice is
 * saved to localStorage only when the reader toggles, so visitors who never
 * do keep following their system setting.
 */

type Theme = 'dark' | 'light';
const STORAGE_KEY = 'aihot-theme';
const CHANGE_EVENT = 'aihot-theme-change';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
});

const readTheme = (): Theme =>
  document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, readTheme, () => 'dark' as Theme);

  const toggleTheme = useCallback(() => {
    const next: Theme = readTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode: the choice lasts for this page only */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
