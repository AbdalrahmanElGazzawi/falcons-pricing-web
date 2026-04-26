'use client';
import { fmtCurrency } from '@/lib/utils';
import { useDisplayCurrency } from '@/lib/use-display-currency';

/**
 * Tiny client wrapper that renders a SAR-canonical amount through the
 * shared cross-page currency preference. Used by the revenue page's
 * server component to keep the rest of the page server-rendered while
 * still letting the SAR/USD pill on other pages flip the displayed
 * numbers here when the user navigates back.
 */
export function RevenueMoney({ sar, usdRate }: { sar: number; usdRate?: number | null }) {
  const [ccy] = useDisplayCurrency();
  const rate = Number(usdRate) > 0 ? Number(usdRate) : 3.75;
  return <>{fmtCurrency(Number(sar) || 0, ccy, rate)}</>;
}
