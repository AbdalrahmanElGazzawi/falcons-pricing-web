'use client';
import { ExternalLink, Trophy, AlertCircle, CircleDashed } from 'lucide-react';
import { useLocale } from '@/lib/i18n/Locale';

type Player = {
  liquipedia_url?: string | null;
  liquipedia_synced_at?: string | null;
  prize_money_24mo_usd?: number | null;
  peak_tournament_tier?: 'S' | 'A' | 'B' | 'C' | 'unrated' | null | string;
  last_major_finish_date?: string | null;
  last_major_placement?: string | null;
};

/**
 * Pull a clean label from the Liquipedia URL.
 * The roster's GAME column already shows the game, so we render the SLUG
 * (player handle on Liquipedia) only — saves ~120px per row on scroll.
 */
function urlLabel(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length === 0) return 'Liquipedia';
    const slug = parts.slice(1).join('/');
    if (slug) return decodeURIComponent(slug).replace(/_/g, ' ');
    return parts[0]; // game-only fallback (rare)
  } catch { return 'Liquipedia'; }
}

/**
 * Liquipedia link + sync status — explicit, readable text label so the link
 * is obvious in the roster row (not buried in an icon-only chip).
 *
 *   no URL    → red 'no link' badge (non-clickable)
 *   has URL   → clickable text link "{game}/{slug}" with external arrow,
 *               coloured by sync state:
 *                 unsynced    = orange
 *                 synced      = green (+ optional tier/prize tooltip)
 *                 stale (>30d)= amber
 */
export function LiquipediaChip({ p, size = 'md' }: { p: Player; size?: 'sm' | 'md' }) {
  const { t } = useLocale();
  const text = size === 'sm' ? 'text-[10px]' : 'text-[11px]';
  const ic = size === 'sm' ? 9 : 11;

  if (!p.liquipedia_url) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/50 font-semibold whitespace-nowrap ${text}`}
        title={t('liqui.no_link.tip')}
      >
        <CircleDashed size={ic} /> {t('liqui.no_link')}
      </span>
    );
  }

  const url = p.liquipedia_url;
  const label = urlLabel(url);
  const synced = !!p.liquipedia_synced_at;
  const ageDays = synced ? Math.floor((Date.now() - new Date(p.liquipedia_synced_at!).getTime()) / 86400000) : null;
  const stale = synced && ageDays != null && ageDays > 30;
  const prize = Number(p.prize_money_24mo_usd ?? 0);
  const tier = (p.peak_tournament_tier ?? '').toString().toUpperCase();
  const tierIsMajor = tier === 'S' || tier === 'A';

  const tone = !synced
    ? 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700/50 dark:hover:bg-orange-900/50'
    : stale
      ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
      : tierIsMajor
        ? 'bg-green/10 text-greenDark border-green/30 hover:bg-green/15'
        : 'bg-bg text-ink border-line hover:bg-bg/80 dark:bg-card dark:hover:bg-cardHover';

  const ageLine = !synced
    ? t('liqui.unsynced.tip')
    : (ageDays === 0
        ? t('liqui.synced_today')
        : t('liqui.synced_n_days').replace('{{n}}', String(ageDays))) +
      (stale ? ' (' + t('liqui.stale') + ')' : '');
  const titleLines = [
    ageLine,
    synced && prize > 0 ? t('liqui.prize_24mo').replace('{{n}}', prize.toLocaleString('en-US')) : null,
    synced && tier && tier !== 'UNRATED' ? t('liqui.peak_tier').replace('{{t}}', tier) : null,
    synced && p.last_major_placement && p.last_major_finish_date
      ? t('liqui.last_major').replace('{{p}}', p.last_major_placement).replace('{{d}}', p.last_major_finish_date)
      : null,
  ].filter(Boolean).join(' · ');

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      onClick={e => e.stopPropagation()}
      className={`group inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-semibold whitespace-nowrap transition ${tone} ${text}`}
      title={titleLines || url}
    >
      {synced ? <Trophy size={ic} /> : <ExternalLink size={ic} />}
      <span className="truncate max-w-[120px]">{label}</span>
      {synced && tier && tier !== 'UNRATED' && (
        <span className="px-1 rounded bg-white/60 dark:bg-black/30 text-[9px] font-bold tabular-nums">{tier}</span>
      )}
      {stale && <AlertCircle size={ic - 1} />}
      <ExternalLink size={ic - 1} className="opacity-50 group-hover:opacity-100" />
    </a>
  );
}

/** Aggregate stats helper for the coverage banner. */
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
    total, hasUrl,
    missingUrl: total - hasUrl,
    synced,
    hasUrlUnsynced: hasUrl - synced,
    withPrize,
    totalPrize,
    stale,
  };
}
