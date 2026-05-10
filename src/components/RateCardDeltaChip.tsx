'use client';
import { TrendingUp, TrendingDown, Equal, History } from 'lucide-react';

/**
 * Rate-card delta chip — show the gap between the methodology rate
 * (what the engine quotes today) and the historical rate-card price.
 *
 *   Methodology > rate-card → green up-arrow with +X%
 *   Methodology < rate-card → red down-arrow with -X% (we under-price vs old card!)
 *   Methodology = rate-card → muted equals
 *
 * Tooltip carries source + capture date + the absolute SAR diff so sales
 * can defend the gap to a brand at-a-glance.
 */
export function RateCardDeltaChip({
  methodologySar, rateCardSar, captureDate, source,
}: {
  methodologySar: number | null | undefined;
  rateCardSar: number | null | undefined;
  captureDate?: string | null;
  source?: string | null;
}) {
  const m = Number(methodologySar) || 0;
  const r = Number(rateCardSar)    || 0;
  if (!r || !m) return null;

  const delta = m - r;
  const pct = Math.round((delta / r) * 100);
  const dir: 'up' | 'down' | 'flat' = pct > 1 ? 'up' : pct < -1 ? 'down' : 'flat';

  const tone =
    dir === 'up'   ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700/50' :
    dir === 'down' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700/50' :
                     'bg-bg dark:bg-card text-mute border-line';

  const Icon = dir === 'up' ? TrendingUp : dir === 'down' ? TrendingDown : Equal;
  const sign = pct > 0 ? '+' : '';
  const tooltip = [
    `Old rate card: SAR ${r.toLocaleString('en-US')}`,
    `Methodology:   SAR ${m.toLocaleString('en-US')}`,
    `Delta: ${sign}${pct}% (SAR ${(delta > 0 ? '+' : '')}${delta.toLocaleString('en-US')})`,
    source ? `Source: ${source}` : null,
    captureDate ? `Captured: ${captureDate}` : null,
  ].filter(Boolean).join('\n');

  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1 py-0 rounded text-[9px] font-bold tabular-nums whitespace-nowrap border ${tone}`}
      title={tooltip}
    >
      <Icon size={9} />
      {sign}{pct}%
    </span>
  );
}

/**
 * Stacked currency cell — renders the methodology price (primary line) and
 * a small rate-card secondary line underneath when historical exists.
 * Drop-in replacement for `<td>{fmtCurrency(...)}</td>` cells.
 */
export function RateCellWithHistory({
  sar,
  historicalSar,
  ccy,
  rate = 3.75,
  captureDate,
  source,
  anchorPremium,
}: {
  sar: number | null | undefined;
  historicalSar: number | null | undefined;
  ccy: 'SAR' | 'USD';
  rate?: number;
  captureDate?: string | null;
  source?: string | null;
  /**
   * Migration 071 — Authority Tier anchor premium (×1.40 / ×1.20 / ×1.10 / ×1.00 / ×0.95 / ×1.00).
   * When provided and != 1.0, the cell shows EFFECTIVE baseFee as the headline
   * (stored × premium) and stored rate as a small subtitle. Lets sales see the
   * same number the engine uses at quote time, without changing the underlying
   * stored value.
   */
  anchorPremium?: number;
}) {
  const stored = Number(sar) || 0;
  if (!stored) return <span className="text-mute">—</span>;

  const premium = Number(anchorPremium) || 1.0;
  const effective = Math.round(stored * premium);
  const liftActive = premium !== 1.0;

  const fmt = (n: number) =>
    ccy === 'USD'
      ? `$ ${Math.round(n / rate).toLocaleString('en-US')}`
      : `SAR ${Math.round(n).toLocaleString('en-US')}`;

  const r = Number(historicalSar) || 0;

  return (
    <div className="flex flex-col items-end leading-tight tabular-nums">
      <span
        className="text-ink font-medium"
        title={liftActive ? `Effective baseFee = stored ${fmt(stored)} × ${premium.toFixed(2)} anchor premium (Mig 071)` : undefined}
      >
        {fmt(effective)}
      </span>
      {r > 0 && (
        <span
          className="text-[10px] text-mute inline-flex items-center gap-1"
          title={`Old rate card: ${fmt(r)} · ${source ?? ''}${captureDate ? ' · ' + captureDate : ''}`}
        >
          <History size={9} />
          {fmt(r)}
        </span>
      )}
    </div>
  );
}
