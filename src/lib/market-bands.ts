/**
 * Market-band lookup helpers.
 *
 *  resolveMarketBand({ tier, game, market, platform })
 *    → returns the most-specific active band for that cell.
 *    → preference order: exact game match → universal (game IS NULL) → null.
 *
 * Bands are the input range used by the F/A/S/C panel and the quote
 * builder's variance register. Each band carries source attribution so the
 * UI can show "where does this number come from?" per cell.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type MarketBandSource =
  | 'peer_rate_card'
  | 'methodology_v2_baseline'
  | 'closed_deal_history'
  | 'manual_override';

export interface MarketBand {
  id: string;
  tier_code: string;
  game: string | null;
  audience_market: string;
  platform: string;
  min_sar: number;
  median_sar: number;
  max_sar: number;
  source: MarketBandSource | string;
  source_url: string | null;
  source_notes: string | null;
  effective_from: string;
  effective_to: string | null;
  notes: string | null;
}

export interface BandQuery {
  tier:     string;          // 'Tier S' | 'Tier 1' | …
  game?:    string | null;   // null/undefined → universal lookup only
  market:   string;          // 'KSA' | 'MENA' | 'Global' | …
  platform: string;          // canonical key, e.g. 'rate_ig_reel'
}

/**
 * Resolve the active market band for a given cell.
 * Returns the most-specific match (game-specific preferred over universal).
 */
export async function resolveMarketBand(
  supabase: SupabaseClient,
  q: BandQuery,
): Promise<MarketBand | null> {
  // Step 1 — exact game match
  if (q.game) {
    const { data } = await supabase
      .from('market_bands')
      .select('*')
      .eq('tier_code', q.tier)
      .eq('audience_market', q.market)
      .eq('platform', q.platform)
      .eq('game', q.game)
      .is('effective_to', null)
      .maybeSingle();
    if (data) return data as MarketBand;
  }

  // Step 2 — universal fallback (game IS NULL)
  const { data } = await supabase
    .from('market_bands')
    .select('*')
    .eq('tier_code', q.tier)
    .eq('audience_market', q.market)
    .eq('platform', q.platform)
    .is('game', null)
    .is('effective_to', null)
    .maybeSingle();

  return (data as MarketBand) ?? null;
}

/**
 * Pure-function variant for client-side use when the full bands array is
 * already in memory (e.g. admin page). Same preference order.
 */
export function pickBand(
  bands: MarketBand[],
  q: BandQuery,
): MarketBand | null {
  const active = bands.filter(b => !b.effective_to);
  // exact game match
  if (q.game) {
    const exact = active.find(b =>
      b.tier_code === q.tier &&
      b.audience_market === q.market &&
      b.platform === q.platform &&
      b.game === q.game
    );
    if (exact) return exact;
  }
  // universal
  return active.find(b =>
    b.tier_code === q.tier &&
    b.audience_market === q.market &&
    b.platform === q.platform &&
    b.game == null
  ) ?? null;
}

/** Audience-market guesser from a player/creator nationality string. */
export function audienceMarketFromNationality(nat: string | null | undefined): string {
  const n = (nat ?? '').trim().toLowerCase();
  if (!n) return 'Global';
  if (n.startsWith('saudi')) return 'KSA';
  const mena = ['emirati', 'bahraini', 'kuwaiti', 'qatari', 'omani',
                'egyptian', 'jordanian', 'lebanese', 'tunisian', 'moroccan',
                'algerian', 'iraqi', 'syrian', 'palestinian', 'yemeni', 'sudanese'];
  if (mena.includes(n)) return 'MENA';
  return 'Global';
}

/** Human-friendly source label */
export function sourceLabel(s: string | null | undefined): string {
  switch (s) {
    case 'peer_rate_card':         return 'Peer rate card';
    case 'methodology_v2_baseline':return 'Methodology v2';
    case 'closed_deal_history':    return 'Closed-deal history';
    case 'manual_override':        return 'Manual override';
    default: return s ?? '—';
  }
}
