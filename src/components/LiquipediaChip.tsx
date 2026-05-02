'use client';
import { ExternalLink, Trophy, AlertCircle, CircleDashed, RefreshCw } from 'lucide-react';

type Player = {
  liquipedia_url?: string | null;
  liquipedia_synced_at?: string | null;
  prize_money_24mo_usd?: number | null;
  peak_tournament_tier?: 'S' | 'A' | 'B' | 'C' | 'unrated' | null | string;
  last_major_finish_date?: string | null;
  last_major_placement?: string | null;
};

/**
 * Liquipedia status chip.
 *
 *   no URL     → red dashed badge "no link"
 *   has URL,   → amber 'needs sync' chip with the link icon
 *   not synced
 *   synced     → green chip showing peak tier + prize $; tooltip lists last
 *                major placement + days since sync; clicks open Liquipedia
 *
 * Renders inline anywhere a player row appears.
 */
export function LiquipediaChip({ p, size = 'md' }: { p: Player; size?: 'sm' | 'md' }) {
  const px = size === 'sm' ? 'px-1.5 py-0 text-[10px]' : 'px-2 py-0.5 text-[11px]';
  const ic = size === 'sm' ? 9 : 11;

  if (!p.liquipedia_url) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border bg-red-50 text-red-700 border-red-200 font-semibold whitespace-nowrap ${px}`}
        title="No Liquipedia URL set — add it from the player's full editor"
      >
        <CircleDashed size={ic} /> no link
      </span>
    );
  }

  const url = p.liquipedia_url;
  const synced = !!p.liquipedia_synced_at;
  const ageDays = synced ? Math.floor((Date.now() - new Date(p.liquipedia_synced_at!).getTime()) / 86400000) : null;
  const stale = synced && ageDays != null && ageDays > 30;

  if (!synced) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        onClick={e => e.stopPropagation()}
        className={`inline-flex items-center gap-1 rounded-full border bg-orange-50 text-orange-700 border-orange-200 font-semibold whitespace-nowrap hover:bg-orange-100 ${px}`}
        title="URL set but never synced — click 'Sync all Liquipedia' at the top, or open this profile to sync individually"
      >
        <RefreshCw size={ic} /> needs sync
        <ExternalLink size={ic - 1} className="opacity-60" />
      </a>
    );
  }

  const prize = Number(p.prize_money_24mo_usd ?? 0);
  const tier = (p.peak_tournament_tier ?? '').toString().toUpperCase();
  const tierIsMajor = tier === 'S' || tier === 'A';
  const tone = tierIsMajor
    ? 'bg-green/10 text-greenDark border-green/30'
    : 'bg-bg text-mute border-line';

  const titleLines = [
    `Synced ${ageDays === 0 ? 'today' : `${ageDays}d ago`}${stale ? ' (stale — re-sync)' : ''}`,
    prize > 0 ? `Prize money 24mo: $${prize.toLocaleString('en-US')}` : 'No tracked prize money in 24mo',
    p.peak_tournament_tier && p.peak_tournament_tier !== 'unrated' ? `Peak tier: ${tier}` : null,
    p.last_major_placement && p.last_major_finish_date
      ? `Last major: ${p.last_major_placement} on ${p.last_major_finish_date}`
      : null,
  ].filter(Boolean).join(' · ');

  // Compact prize money for display
  const prizeStr = prize >= 1_000_000 ? `$${(prize / 1_000_000).toFixed(1)}M`
                  : prize >= 1_000     ? `$${Math.round(prize / 1_000)}K`
                  : prize > 0          ? `$${prize}`
                  : '';

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      onClick={e => e.stopPropagation()}
      className={`inline-flex items-center gap-1 rounded-full border ${tone} font-semibold whitespace-nowrap hover:bg-green/15 ${px}`}
      title={titleLines}
    >
      <Trophy size={ic} />
      {tier && tier !== 'UNRATED' ? <span className="font-bold">{tier}</span> : null}
      {prizeStr && <span className="tabular-nums">{prizeStr}</span>}
      {!tier && !prizeStr && <span>synced</span>}
      {stale && <AlertCircle size={ic - 1} className="text-orange-600" />}
      <ExternalLink size={ic - 1} className="opacity-60" />
    </a>
  );
}

/**
 * Aggregate stats helper. Returns counts the coverage banner needs.
 */
export function liquipediaStats<T extends Player>(players: T[]) {
  const total = players.length;
  let hasUrl = 0, synced = 0, withPrize = 0;
  let totalPrize = 0;
  let stale = 0;
  for (const p of players) {
    if (p.liquipedia_url) hasUrl++;
    if (p.liquipedia_synced_at) {
      synced++;
      const ageDays = Math.floor((Date.now() - new Date(p.liquipedia_synced_at).getTime()) / 86400000);
      if (ageDays > 30) stale++;
    }
    const prize = Number(p.prize_money_24mo_usd ?? 0);
    if (prize > 0) { withPrize++; totalPrize += prize; }
  }
  return {
    total,
    hasUrl,
    missingUrl: total - hasUrl,
    synced,
    hasUrlUnsynced: hasUrl - synced,
    withPrize,
    totalPrize,
    stale,
  };
}
