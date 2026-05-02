'use client';
import { Coins } from 'lucide-react';

/**
 * Player-cut chip — surfaces what fraction of a deal the talent keeps.
 *
 *   commission = Falcons take as a fraction (0..1)
 *   playerCut  = 1 - commission
 *
 * Color cue:
 *   ≥ 70%  → green   (talent-friendly default)
 *   50-70% → blue    (premium / heritage)
 *   30-50% → amber   (heavily structured / high-burden)
 *   < 30%  → red     (Falcons-heavy, watch carefully)
 */
export function CutChip({ commission, size = 'md' }: { commission?: number | null; size?: 'sm' | 'md' }) {
  if (commission == null) return <span className="text-mute text-xs">—</span>;

  const pct = Math.max(0, Math.min(1, Number(commission)));
  const player = 1 - pct;
  const playerPct = Math.round(player * 1000) / 10;
  const falconsPct = Math.round(pct * 1000) / 10;

  const tone =
    player >= 0.70 ? 'bg-green/10 text-greenDark border-green/30 dark:bg-green/15' :
    player >= 0.50 ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/50' :
    player >= 0.30 ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700/50' :
                     'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/50';

  const px = size === 'sm' ? 'px-1.5 py-0 text-[10px]' : 'px-2 py-0.5 text-[11px]';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-semibold tabular-nums whitespace-nowrap ${tone} ${px}`}
      title={`Talent keeps ${playerPct}% · Falcons commission ${falconsPct}%`}
    >
      <Coins size={size === 'sm' ? 9 : 11} />
      <span className="opacity-60 font-normal">T</span>
      {playerPct}%
      <span className="opacity-50 font-normal">/</span>
      <span className="opacity-70 font-normal">F {falconsPct}%</span>
    </span>
  );
}
