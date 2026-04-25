'use client';
import { createContext, useCallback, useContext, useEffect, useState, useMemo } from 'react';

export type Theme = 'light' | 'dark';
const KEY = 'falcons_theme_v1';
const COOKIE = 'falcons_theme';

interface Ctx { theme: Theme; setTheme: (t: Theme) => void; toggle: () => void; }
const C = createContext<Ctx | null>(null);

function readInitial(): Theme {
  if (typeof document === 'undefined') return 'light';
  try {
    const ls = localStorage.getItem(KEY);
    if (ls === 'light' || ls === 'dark') return ls;
  } catch {}
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (m && (m[1] === 'light' || m[1] === 'dark')) return m[1] as Theme;
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

export function ThemeProvider({ children, initial }: { children: React.ReactNode; initial?: Theme }) {
  const [theme, setThemeState] = useState<Theme>(initial ?? 'light');

  useEffect(() => {
    const t = readInitial();
    if (t !== theme) setThemeState(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try { localStorage.setItem(KEY, t); } catch {}
    if (typeof document !== 'undefined') {
      const oneYear = 60 * 60 * 24 * 365;
      document.cookie = `${COOKIE}=${t}; max-age=${oneYear}; path=/; SameSite=Lax`;
    }
  }, []);

  const toggle = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [theme, setTheme]);

  const value = useMemo(() => ({ theme, setTheme, toggle }), [theme, setTheme, toggle]);
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useTheme() {
  const v = useContext(C);
  return v ?? { theme: 'light' as Theme, setTheme: () => {}, toggle: () => {} };
}
