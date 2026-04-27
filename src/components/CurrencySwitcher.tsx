'use client';
import { useCurrency } from '@/lib/currency/Currency';

/**
 * SAR / USD toggle. The FX rate is the Saudi peg (3.75) — locked.
 * Conversion is just SAR amount ÷ 3.75 when USD is selected.
 */
export function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency();

  return (
    <div className="px-3 py-2 border-t border-white/10">
      <div className="text-[10px] uppercase tracking-wider text-white/50 mb-1.5 px-1">
        Display currency
      </div>
      <div className="inline-flex rounded-md bg-white/5 p-0.5 text-xs w-full">
        {(['SAR', 'USD'] as const).map(c => (
          <button
            key={c}
            type="button"
            onClick={() => setCurrency(c)}
            className={[
              'flex-1 px-2.5 py-1 rounded font-semibold transition',
              currency === c
                ? 'bg-white text-navy'
                : 'text-white/60 hover:text-white hover:bg-white/5',
            ].join(' ')}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="text-[10px] text-white/40 mt-1 px-1">
        1 USD = 3.75 SAR (peg)
      </div>
    </div>
  );
}
