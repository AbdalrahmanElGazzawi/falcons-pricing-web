'use client';
import { useEffect, useState, useCallback } from 'react';

/**
 * Cross-page persistent currency preference. Quotes and revenue numbers
 * are stored canonically in SAR; this hook returns whichever currency the
 * user picked on the quote-detail pill (or any other surface) so the
 * roster, quote log, and dashboards stay in sync.
 *
 * Default: SAR. Persists in localStorage.
 *  - Cross-tab updates via 'storage' event (fires only in OTHER tabs).
 *  - Same-tab updates via a custom 'falcons:ccy' event so sibling
 *    consumers in the SAME tab re-render without a page refresh.
 */
const KEY = 'falcons.display_ccy';
const EVT = 'falcons:ccy';

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
    // Cross-tab sync (fires in OTHER tabs only — never in the originating tab)
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && (e.newValue === 'USD' || e.newValue === 'SAR')) {
        setCcyState(e.newValue);
      }
    };
    // Same-tab sync (fires in EVERY consumer of the hook in the current tab)
    const onLocal = (e: Event) => {
      const next = (e as CustomEvent).detail;
      if (next === 'SAR' || next === 'USD') setCcyState(next);
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(EVT, onLocal as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(EVT, onLocal as EventListener);
    };
  }, []);

  const setCcy = useCallback((next: Ccy) => {
    setCcyState(next);
    try { window.localStorage.setItem(KEY, next); } catch {}
    // Broadcast to other consumers in this same tab — storage event won't
    // fire in the tab that called setItem, so we need our own signal.
    try { window.dispatchEvent(new CustomEvent(EVT, { detail: next })); } catch {}
  }, []);

  return [hydrated ? ccy : 'SAR', setCcy];
}

/** Tiny pill component spec — wired by callers since each surface has its own design system. */
export function nextCcy(c: Ccy): Ccy { return c === 'SAR' ? 'USD' : 'SAR'; }
