/**
 * Client-side mirror of public.tier_anchor_ig_reel() / platform_ratio() /
 * game_base_multipliers — used in admin forms to show tier baseline hints
 * next to every rate input.
 *
 * Mirrors the SQL functions exactly (Migration 026). Refresh the
 * gameMultiplier table here when game_base_multipliers gets new rows.
 */

export const TIER_IG_REEL_ANCHOR: Record<string, number> = {
  'Tier S': 28000,
  'Tier 1': 18000,
  'Tier 2': 11000,
  'Tier 3':  6500,
  'Tier 4':  3500,
};

export const GAME_BASE_MULTIPLIER: Record<string, number> = {
  'VALORANT':                 1.20,
  'Chess':                    1.20,
  'Counterstrike2':           1.15,
  'Fortnite':                 1.15,
  'Call of Duty Black Ops 7': 1.10,
  'Dota2':                    1.10,
  'Apex Legends':             1.05,
  'Call of Duty Warzone':     1.05,
  'PUBG':                     1.00,
  'Rainbow Six Siege':        1.00,
  'Rocket League':            0.95,
  'Gran Turismo':             0.95,
  'EAFC25':                   0.95,
  'Trackmania':               0.95,
  'Overwatch2':               0.90,
  'Mobile Legends Bang Bang': 0.90,
  'Esports Influencers':      0.90,
  'Free Fire':                0.85,
  'Street Fighter':           0.85,
  'Tekken':                   0.85,
  'Fatal Fury':               0.80,
  'Crossfire':                0.75,
};

/** Player platform → IG-Reel ratio (Migration 026 platform_ratio()) */
export const PLATFORM_RATIO: Record<string, number> = {
  rate_ig_reel:        1.00,
  rate_ig_static:      0.65,
  rate_ig_story:       0.55,
  rate_ig_repost:      0.25,
  rate_ig_share:       0.15,
  rate_tiktok_video:   0.80,
  rate_tiktok_repost:  0.25,
  rate_tiktok_share:   0.35,
  rate_yt_short:       0.32,
  rate_yt_full:        1.85,
  rate_x_post:         0.20,
  rate_x_repost:       0.10,
  rate_x_share:        0.10,
  rate_fb_post:        0.16,
  rate_twitch_stream:  1.45,
  rate_twitch_integ:   0.66,
  rate_kick_stream:    1.45,
  rate_kick_integ:     0.66,
  rate_irl:            2.20,
  rate_usage_monthly:  1.50,
  rate_promo_monthly:  1.10,
  // Creator-specific (not in players.platform_ratio but useful for hints)
  rate_ig_reels:       1.00,
  rate_ig_post:        0.65,
  rate_tiktok_ours:    0.80,
  rate_tiktok_client:  0.95,
  rate_yt_preroll:     1.20,
  rate_yt_shorts:      0.32,
  rate_x_post_quote:   0.20,
  rate_snapchat:       0.40,
  rate_event_snap:     1.20,
  rate_twitch_kick_live: 1.45,
  rate_kick_irl:       1.40,
  rate_telegram:       0.30,
};

/** Conservative tier × game × platform baseline (Floor v3, no haircut). */
export function tierBaseline(
  tierCode?: string | null,
  game?: string | null,
  platformKey?: string,
): number | null {
  if (!tierCode) return null;
  const anchor = TIER_IG_REEL_ANCHOR[tierCode];
  if (!anchor) return null;
  const gMult: number = game ? (GAME_BASE_MULTIPLIER[game] ?? 1.0) : 1.0;
  const pRatio: number = platformKey ? (PLATFORM_RATIO[platformKey] ?? 1.0) : 1.0;
  return Math.round(anchor * gMult * pRatio);
}

/** Pretty-format SAR amount for hint text. */
export function fmtBaseline(n: number | null): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US').format(n);
}
