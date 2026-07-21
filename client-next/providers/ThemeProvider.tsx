'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react';

/**
 * Theme provider — behavior mirrors the original client/src/hooks/useTheme.ts:
 * storage key 'aihot-theme', default 'dark', theme applied via the
 * `data-theme` attribute on <html> (light palette lives under
 * [data-theme="light"] in globals.css).
 */

type Theme = 'dark' | 'light';
const STORAGE_KEY = 'aihot-theme';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  // SSR-safe: start with 'dark' (matches :root defaults), then sync from
  // localStorage after mount.
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (saved === 'light' || saved === 'dark') setTheme(saved);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(
    () => setTheme(t => (t === 'dark' ? 'light' : 'dark')),
    [],
  );

  // Memoize the context value so consumers only re-render when theme
  // actually changes, not on every ThemeProvider render.
  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
