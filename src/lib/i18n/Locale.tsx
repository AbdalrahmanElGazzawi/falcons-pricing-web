'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Locale, DictKey } from './dict';
import { translate } from './dict';

const COOKIE = 'falcons_locale';
const KEY = 'falcons_locale_v1';

interface LocaleCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: DictKey) => string;
  dir: 'ltr' | 'rtl';
}

const Ctx = createContext<LocaleCtx | null>(null);

function readInitial(): Locale {
  if (typeof document === 'undefined') return 'en';
  // 1. localStorage
  try {
    const ls = localStorage.getItem(KEY);
    if (ls === 'en' || ls === 'ar') return ls;
  } catch {}
  // 2. cookie
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (m && (m[1] === 'en' || m[1] === 'ar')) return m[1] as Locale;
  // 3. browser
  const lang = (navigator?.language || 'en').toLowerCase();
  if (lang.startsWith('ar')) return 'ar';
  return 'en';
}

export function LocaleProvider({ children, initial }: { children: React.ReactNode; initial?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initial ?? 'en');
  const dir: 'ltr' | 'rtl' = locale === 'ar' ? 'rtl' : 'ltr';

  // After hydration, sync from client storage (in case server render disagreed)
  useEffect(() => {
    const detected = readInitial();
    if (detected !== locale) setLocaleState(detected);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reflect on <html> + body
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;
  }, [locale, dir]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem(KEY, l); } catch {}
    if (typeof document !== 'undefined') {
      // Cookie persists across tabs / SSR-friendly
      const oneYear = 60 * 60 * 24 * 365;
      document.cookie = `${COOKIE}=${l}; max-age=${oneYear}; path=/; SameSite=Lax`;
    }
  }, []);

  const t = useCallback((key: DictKey) => translate(key, locale), [locale]);

  const value = useMemo<LocaleCtx>(() => ({ locale, setLocale, t, dir }), [locale, setLocale, t, dir]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLocale() {
  const v = useContext(Ctx);
  if (!v) {
    // Fallback when used outside provider — degrade to English instead of throwing
    return {
      locale: 'en' as Locale,
      setLocale: () => {},
      t: (k: DictKey) => translate(k, 'en'),
      dir: 'ltr' as const,
    };
  }
  return v;
}
