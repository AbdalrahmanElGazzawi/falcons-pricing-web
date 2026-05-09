/**
 * Authority Tier — Esports Authority Methodology (Migration 071, May 9 2026)
 *
 * Replaces the single `achievement_decay_factor` (0.5–1.5) with a structured
 * 6-tier classification derived from peak_tournament_tier × last_major_placement
 * × last_major_finish_date × liquipedia_url. Each tier carries TWO multipliers:
 *
 *   - anchor_premium  → applied to baseFee in socialPrice (NEW)
 *   - floor_decay     → scales the AuthorityFloor (replaces achievement_decay_factor)
 *
 * HARD multipliers (Falcons EWC-champion positioning):
 *   AT-1 ×1.40 (World Champion · Tier-S 1st place within 12mo)
 *   AT-2 ×1.20 (Major Finalist · top-2 in 18mo or 1st 13–24mo old)
 *   AT-3 ×1.10 (Tier-1 Active · any Tier-S placement within 18mo)
 *   AT-4 ×1.00 (Active Pro · Tier-A or Tier-S 18–24mo)
 *   AT-5 ×0.95 (Emerging · Tier-B/C/unrated)
 *   AT-0 ×1.00 (No Authority Signal · coach / content-only / new — bug fix from 0.5)
 *
 * Engine reads coalesce(authority_tier_override, authority_tier).
 */

export type AuthorityTier = 'AT-0' | 'AT-1' | 'AT-2' | 'AT-3' | 'AT-4' | 'AT-5';

export interface AuthorityTierMeta {
  tier: AuthorityTier;
  displayLabel: string;
  chipEmoji: string | null;
  anchorPremium: number;
  floorDecay: number;
  description: string;
  displayOrder: number;
}

export const AUTHORITY_TIER_META: Record<AuthorityTier, AuthorityTierMeta> = {
  'AT-1': { tier: 'AT-1', displayLabel: 'World Champion',     chipEmoji: '🏆', anchorPremium: 1.40, floorDecay: 1.20, description: 'Tier-S 1st-place finish within last 12 months', displayOrder: 1 },
  'AT-2': { tier: 'AT-2', displayLabel: 'Major Finalist',     chipEmoji: '🥈', anchorPremium: 1.20, floorDecay: 1.10, description: 'Tier-S top-2 in 18mo or 1st 13–24mo old',        displayOrder: 2 },
  'AT-3': { tier: 'AT-3', displayLabel: 'Tier-1 Active',      chipEmoji: '⭐', anchorPremium: 1.10, floorDecay: 1.00, description: 'Tier-S any placement within 18mo',               displayOrder: 3 },
  'AT-4': { tier: 'AT-4', displayLabel: 'Active Pro',         chipEmoji: '·',  anchorPremium: 1.00, floorDecay: 0.90, description: 'Tier-A or Tier-S 18–24mo since major',           displayOrder: 4 },
  'AT-5': { tier: 'AT-5', displayLabel: 'Emerging',           chipEmoji: '·',  anchorPremium: 0.95, floorDecay: 0.85, description: 'Tier-B / Tier-C / unrated with some signal',     displayOrder: 5 },
  'AT-0': { tier: 'AT-0', displayLabel: 'No Authority Signal', chipEmoji: null, anchorPremium: 1.00, floorDecay: 1.00, description: 'No Liquipedia URL or no peak_tier',              displayOrder: 6 },
};

/**
 * Resolve a player's effective Authority Tier — admin override wins over auto-derived.
 * Returns null if no signal and no override (which engine treats as neutral 1.00).
 */
export function resolveAuthorityTier(p: {
  authority_tier?: AuthorityTier | string | null;
  authority_tier_override?: AuthorityTier | string | null;
}): AuthorityTier | null {
  const raw = p.authority_tier_override || p.authority_tier;
  if (!raw) return null;
  if (raw in AUTHORITY_TIER_META) return raw as AuthorityTier;
  return null;
}

/**
 * Get the anchor_premium multiplier for a player. Returns 1.00 (neutral) if no tier.
 * Apply to baseFee before campaign axes — this is the lift World Champions earn
 * regardless of follower count.
 */
export function getAnchorPremium(p: {
  authority_tier?: AuthorityTier | string | null;
  authority_tier_override?: AuthorityTier | string | null;
}): number {
  const t = resolveAuthorityTier(p);
  return t ? AUTHORITY_TIER_META[t].anchorPremium : 1.00;
}

/**
 * Get the floor_decay multiplier for a player. Returns 1.00 if no tier.
 * Scales the AuthorityFloor only — AT-0 fix means coaches/staff stop getting
 * the unjustified 50% haircut they had under achievement_decay_factor=0.5.
 */
export function getFloorDecay(p: {
  authority_tier?: AuthorityTier | string | null;
  authority_tier_override?: AuthorityTier | string | null;
}): number {
  const t = resolveAuthorityTier(p);
  return t ? AUTHORITY_TIER_META[t].floorDecay : 1.00;
}

/** Get full meta for the chip / popover. */
export function getAuthorityTierMeta(p: {
  authority_tier?: AuthorityTier | string | null;
  authority_tier_override?: AuthorityTier | string | null;
}): AuthorityTierMeta | null {
  const t = resolveAuthorityTier(p);
  return t ? AUTHORITY_TIER_META[t] : null;
}
