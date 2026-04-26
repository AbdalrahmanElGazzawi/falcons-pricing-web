'use client';
import { useEffect, useState, useCallback } from 'react';

/**
 * Cross-page persistent currency preference. Quotes and revenue numbers
 * are stored canonically in SAR; this hook returns whichever currency the
 * user picked on the quote-detail pill (or any other surface) so the
 * roster, quote log, and dashboards stay in sync.
 *
 * Default: SAR. Persists in localStorage. Cross-tab updates via 'storage' event.
 */
const KEY = 'falcons.display_ccy';

type Ccy = 'SAR' | 'USD';

function readInitial(): Ccy {
  if (typeof window === 'undefined') return 'SAR';
  try {
    const v = window.localStorage.getItem(KEY);
    return v === 'USD' ? 'USD' : 'SAR';
  } catch { return 'SAR'; }
}

export function useDisplayCurrency(): [Ccy, (next: Ccy) => void] {
  const [ccy, setCcyState] = useState<Ccy>('SAR');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCcyState(readInitial());
    setHydrated(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && (e.newValue === 'USD' || e.newValue === 'SAR')) {
        setCcyState(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setCcy = useCallback((next: Ccy) => {
    setCcyState(next);
    try { window.localStorage.setItem(KEY, next); } catch {}
  }, []);

  return [hydrated ? ccy : 'SAR', setCcy];
}

/** Tiny pill component spec — wired by callers since each surface has its own design system. */
export function nextCcy(c: Ccy): Ccy { return c === 'SAR' ? 'USD' : 'SAR'; }
