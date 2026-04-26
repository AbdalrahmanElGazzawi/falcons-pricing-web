'use client';
import { useDisplayCurrency } from '@/lib/use-display-currency';

/**
 * Demo-grade currency toggle. Reads + writes the cross-page preference
 * via useDisplayCurrency, so flipping here syncs every other surface
 * that subscribes (roster, quote detail, quote log, sales log, etc.).
 */
export function CurrencyPill({ className = '' }: { className?: string }) {
  const [ccy, setCcy] = useDisplayCurrency();
  return (
    <div
      className={
        'inline-flex items-center rounded-lg border border-line overflow-hidden bg-white ' +
        className
      }
      title="Display currency. Persists across pages and tabs."
    >
      {(['SAR', 'USD'] as const).map((c, i) => (
        <button
          key={c}
          type="button"
          onClick={() => setCcy(c)}
          className={[
            'px-2.5 py-1.5 text-xs font-medium transition',
            i > 0 ? 'border-l border-line' : '',
            ccy === c ? 'bg-green text-white' : 'text-label hover:text-ink',
          ].join(' ')}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
