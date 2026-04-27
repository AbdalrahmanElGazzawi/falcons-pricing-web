'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Global currency context — controls how SAR-canonical amounts display
 * across roster, calculator, dashboard, and builder previews.
 *
 * The Saudi riyal is pegged at 3.75 SAR per 1 USD. The peg is locked.
 * Per-quote currency is still saved on the quote row (locks the display
 * choice for historical PDFs); this context governs the live preference.
 */

export type DisplayCurrency = 'SAR' | 'USD';

const COOKIE_CCY  = 'falcons_ccy';
const KEY_CCY     = 'falcons_ccy_v1';

export const FALCONS_USD_PEG = 3.75;

interface CurrencyCtx {
  currency: DisplayCurrency;
  usdRate: number;       // always 3.75 — exposed for back-compat
  setCurrency: (c: DisplayCurrency) => void;
  setUsdRate: (r: number) => void;  // no-op — peg is locked
  /** Convert a SAR-canonical amount into the display currency, formatted. */
  fmt: (sar: number) => string;
}

const Ctx = createContext<CurrencyCtx | null>(null);

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === 'undefined') return;
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${oneYear}; path=/; SameSite=Lax`;
}

function readInitialCcy(): DisplayCurrency {
  if (typeof document === 'undefined') return 'SAR';
  try {
    const ls = localStorage.getItem(KEY_CCY);
    if (ls === 'SAR' || ls === 'USD') return ls;
  } catch {}
  const c = readCookie(COOKIE_CCY);
  if (c === 'SAR' || c === 'USD') return c;
  return 'SAR';
}

export function CurrencyProvider({
  children,
  initialCurrency,
}: {
  children: React.ReactNode;
  initialCurrency?: DisplayCurrency;
  initialRate?: number;  // accepted for back-compat with layout.tsx, ignored
}) {
  const [currency, setCurrencyState] = useState<DisplayCurrency>(initialCurrency ?? 'SAR');

  // Reconcile after hydration in case server cookie disagreed with client storage.
  useEffect(() => {
    const ccy = readInitialCcy();
    if (ccy !== currency) setCurrencyState(ccy);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setCurrency = useCallback((c: DisplayCurrency) => {
    setCurrencyState(c);
    try { localStorage.setItem(KEY_CCY, c); } catch {}
    writeCookie(COOKIE_CCY, c);
  }, []);

  // Peg is locked. setUsdRate is a no-op kept for component back-compat.
  const setUsdRate = useCallback(() => { /* peg is locked at 3.75 */ }, []);

  const fmt = useCallback((sar: number) => {
    const n = Number(sar) || 0;
    if (currency === 'USD') {
      return `$ ${Math.round(n / FALCONS_USD_PEG).toLocaleString('en-US')}`;
    }
    return `SAR ${Math.round(n).toLocaleString('en-US')}`;
  }, [currency]);

  const value = useMemo<CurrencyCtx>(
    () => ({ currency, usdRate: FALCONS_USD_PEG, setCurrency, setUsdRate, fmt }),
    [currency, setCurrency, setUsdRate, fmt]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCurrency() {
  const v = useContext(Ctx);
  if (!v) {
    return {
      currency: 'SAR' as DisplayCurrency,
      usdRate: FALCONS_USD_PEG,
      setCurrency: () => {},
      setUsdRate: () => {},
      fmt: (sar: number) => `SAR ${Math.round(Number(sar) || 0).toLocaleString('en-US')}`,
    };
  }
  return v;
}
