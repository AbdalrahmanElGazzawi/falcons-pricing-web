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
  | 'manual_override'
  // Migration 033: rows derived programmatically from existing parents
  | 'derived_from_v015_ratio'   // rate_ig_repost = 0.35 × rate_ig_post, etc.
  | 'derived_alias';            // rate_ig_post aliased from rate_ig_post

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
  /**
   * Derivation provenance (Migration 033). Always populated for rows created
   * after migration 033. Older rows may have an empty object.
   *
   * Shapes:
   *   { method: 'sot_v1_baseline',     note, version }
   *   { method: 'manual_peer_card',    note, version }
   *   { method: 'platform_alias',      aliased_from: 'rate_ig_post', note, version }
   *   { method: 'ratio_from_parent',   parent_platform: 'rate_ig_post', ratio: 0.35, origin: 'migration_015', version }
   */
  derivation?: Record<string, any> | null;
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
    case 'derived_from_v015_ratio':return 'Ratio-derived';
    case 'derived_alias':          return 'Platform alias';
    default: return s ?? '—';
  }
}

/**
 * Generate a human-readable explanation from a band's `derivation` jsonb.
 * Returns null if no derivation info is available.
 */
export function derivationLabel(d: Record<string, any> | null | undefined): string | null {
  if (!d || Object.keys(d).length === 0) return null;
  const m = d.method;
  if (m === 'sot_v1_baseline')   return `SOT v1 baseline. ${d.note ?? ''}`.trim();
  if (m === 'manual_peer_card')  return `Manual peer-card calibration. ${d.note ?? ''}`.trim();
  if (m === 'platform_alias')    return `Aliased from ${d.aliased_from} (same concept, different column name).`;
  if (m === 'ratio_from_parent') return `${d.ratio} × ${d.parent_platform} (origin: ${d.origin ?? 'documented ratio'}).`;
  return d.note ?? `${m ?? 'unknown'} derivation`;
}

