/**
 * F/A/S/C pricing band computation — PR2.
 *
 * Sits alongside src/lib/pricing.ts (which holds the per-line `computeLine`
 * engine used by the quote builder). This module computes the four defensible
 * price points per platform per talent and returns full source attribution so
 * the admin UI can show the math.
 *
 *   Floor    = MAX(stated_minimum × 0.95, last_accepted_deal × 0.95,
 *                  cost_plus_floor, industry_floor)
 *   Anchor   = MAX(Floor × 1.05, base_rate × calibration_axes)
 *   Stretch  = Anchor × (1 + premium_stack), capped at Ceiling
 *   Ceiling  = market_band.max_sar  (tier × audience × platform)
 *
 * Each function returns {value, method, sources, inputs}. Sources are every
 * candidate that produced a finite number; method is the one that won the MAX
 * (or 'override' if a manual override is in effect for that band).
 *
 * Manual overrides are looked up FIRST and short-circuit everything when found.
 */

// ─── Types ────────────────────────────────────────────────────────────────

export type Band = 'floor' | 'anchor' | 'stretch' | 'ceiling';
export type TalentKind = 'player' | 'creator';

export interface MarketBandRow {
  tier_code: string;
  game: string | null;
  audience_market: string | null;
  platform: string;
  min_sar: number;
  median_sar: number;
  max_sar: number;
  source: string | null;
  source_url: string | null;
}

export interface ProductionGrade {
  code: 'standard' | 'enhanced' | 'premium' | 'custom';
  label: string;
  multiplier: number;
  cost_per_deliverable_sar: Record<string, number>;
}

export interface CampaignSummary {
  platform: string;
  deal_count: number;
  avg_sar: number;
  max_sar: number;
  last_sar: number;
  last_deal_date: string;
}

export interface ActiveOverride {
  band: Band;
  platform: string;
  override_value_sar: number;
  reason: string | null;
  effective_from: string;
  created_by_email: string | null;
  created_at: string;
}

export interface PricingInputs {
  talent_kind: TalentKind;
  talent_id: number;
  nickname: string;
  tier_code: string | null;
  game: string | null;
  audience_market: string | null;
  data_completeness: string | null;          // 'full' | 'socials_only' | 'tournament_only' | 'minimal'
  /** internal rate-card subset, keyed by rate_* column name */
  internal_rates: Record<string, number>;
  /** talent's submitted minimums (from /talent/<token>) — players only */
  min_rates: Record<string, number> | null;
  /** Calibration axes (players only — creators pass nulls and use defaults) */
  commission?: number | null;
  markup?: number | null;
  floor_share?: number | null;
  authority_factor?: number | null;
  default_seasonality?: number | null;
  default_language?: number | null;
  achievement_decay_factor?: number | null;
}

export interface BandResult {
  /** SAR. null if no method produced a value (e.g., no market band for that tier×audience). */
  value: number | null;
  /** Which method won the MAX, or 'override' if a manual override is in effect. */
  method: string;
  /** Every candidate that produced a finite number, in MAX order. */
  sources: Array<{ method: string; value: number; cite: string }>;
  /** All raw inputs that fed any method — for transparency in the UI. */
  inputs: Record<string, number | string | null>;
  /** True if this band is overridden manually. */
  overridden: boolean;
  /** Snapshot of the override row if overridden. */
  override?: ActiveOverride;
}

export interface AllBandsForPlatform {
  platform: string;
  /** Internal rate currently stored on the talent record. */
  internal_rate: number;
  floor: BandResult;
  anchor: BandResult;
  stretch: BandResult;
  ceiling: BandResult;
}

// ─── Defaults ─────────────────────────────────────────────────────────────

/** Conservative wiggle when treating a talent's stated min as the floor. */
const STATED_MIN_HAIRCUT = 0.95;
/** Same for last accepted deal. */
const LAST_DEAL_HAIRCUT = 0.95;
/** Anchor must be at least this much above the floor for negotiation room. */
const ANCHOR_FLOOR_LIFT = 1.05;

/** Default cost-plus splits when not supplied per-talent. */
const DEFAULTS = {
  talent_split_pct: 0.50,   // talent's share of revenue on a deal
  account_mgmt_pct: 0.10,   // Falcons account management overhead
  min_margin_pct:   0.20,   // minimum margin Falcons accepts
  /** Default premium stack (rights + relationship + bundle) when no opts. */
  default_premium_pct: 0.40,
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function num(v: any): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function findOverride(overrides: ActiveOverride[], platform: string, band: Band): ActiveOverride | undefined {
  return overrides.find(o => o.platform === platform && o.band === band);
}

/** Pick the market band row that best matches tier × audience × platform.
 *  Falls back to GLOBAL audience if the player's audience market doesn't have a band. */
function pickBand(
  bands: MarketBandRow[],
  tier_code: string | null,
  audience_market: string | null,
  platform: string,
  game: string | null,
): MarketBandRow | undefined {
  if (!tier_code) return undefined;
  // Exact match first: tier × audience × game × platform
  const exact = bands.find(b => b.tier_code === tier_code && b.audience_market === audience_market && b.platform === platform && b.game === game);
  if (exact) return exact;
  // Relax game
  const noGame = bands.find(b => b.tier_code === tier_code && b.audience_market === audience_market && b.platform === platform && b.game == null);
  if (noGame) return noGame;
  // Fall back to GLOBAL
  const global = bands.find(b => b.tier_code === tier_code && b.audience_market === 'GLOBAL' && b.platform === platform && b.game == null);
  if (global) return global;
  // Tier + platform alone (any audience)
  return bands.find(b => b.tier_code === tier_code && b.platform === platform);
}

// ─── Compute helpers ──────────────────────────────────────────────────────

export function computeFloor(args: {
  talent: PricingInputs;
  platform: string;
  bands: MarketBandRow[];
  campaigns: CampaignSummary[];
  productionGrade?: ProductionGrade;
  overrides: ActiveOverride[];
}): BandResult {
  const { talent, platform, bands, campaigns, productionGrade, overrides } = args;

  // Override short-circuit
  const ov = findOverride(overrides, platform, 'floor');
  if (ov) {
    return {
      value: ov.override_value_sar,
      method: 'override',
      sources: [{ method: 'override', value: ov.override_value_sar, cite: `Manual override by ${ov.created_by_email ?? 'admin'} on ${ov.effective_from}` }],
      inputs: { override_reason: ov.reason ?? '' },
      overridden: true,
      override: ov,
    };
  }

  const sources: Array<{ method: string; value: number; cite: string }> = [];
  const inputs: Record<string, number | string | null> = {};

  // 1. Talent's stated minimum × haircut
  const stated = num(talent.min_rates?.[platform]);
  inputs.stated_minimum_sar = stated;
  if (stated && stated > 0) {
    const v = Math.round(stated * STATED_MIN_HAIRCUT);
    sources.push({
      method: 'stated_minimum',
      value: v,
      cite: `Talent submitted ${stated.toLocaleString()} SAR via intake (× ${STATED_MIN_HAIRCUT} wiggle)`,
    });
  }

  // 2. Last accepted deal × haircut
  const camp = campaigns.find(c => c.platform === platform);
  const lastDeal = camp ? num(camp.last_sar) : null;
  inputs.last_deal_sar = lastDeal;
  inputs.last_deal_date = camp?.last_deal_date ?? null;
  if (lastDeal && lastDeal > 0) {
    const v = Math.round(lastDeal * LAST_DEAL_HAIRCUT);
    sources.push({
      method: 'last_accepted_deal',
      value: v,
      cite: `Last closed deal ${lastDeal.toLocaleString()} SAR on ${camp?.last_deal_date ?? '—'} (× ${LAST_DEAL_HAIRCUT})`,
    });
  }

  // 3. Cost-plus floor (only if production grade was supplied with a cost for this platform)
  if (productionGrade && productionGrade.code !== 'custom') {
    const cost = num(productionGrade.cost_per_deliverable_sar?.[platform]);
    inputs.production_cost_sar = cost;
    inputs.production_grade = productionGrade.label;
    if (cost && cost > 0) {
      const split = num(talent.commission) ?? DEFAULTS.account_mgmt_pct;
      const margin = num(talent.markup) ?? DEFAULTS.min_margin_pct;
      const denom = 1 - DEFAULTS.talent_split_pct - split - margin;
      if (denom > 0.05) {
        const v = Math.round(cost / denom);
        sources.push({
          method: 'cost_plus',
          value: v,
          cite: `Cost ${cost.toLocaleString()} SAR / (1 − ${(DEFAULTS.talent_split_pct * 100).toFixed(0)}% talent − ${(split * 100).toFixed(0)}% mgmt − ${(margin * 100).toFixed(0)}% margin)`,
        });
      }
    }
  }

  // 4. Industry floor from market_bands
  const band = pickBand(bands, talent.tier_code, talent.audience_market, platform, talent.game);
  inputs.market_band_min_sar = band?.min_sar ?? null;
  inputs.market_band_source = band?.source ?? null;
  if (band && band.min_sar > 0) {
    sources.push({
      method: 'industry_floor',
      value: Math.round(band.min_sar),
      cite: `Market band min for ${band.tier_code} × ${band.audience_market ?? 'any'} (source: ${band.source ?? 'internal'})`,
    });
  }

  // Pick MAX
  if (sources.length === 0) {
    return { value: null, method: 'no_data', sources: [], inputs, overridden: false };
  }
  sources.sort((a, b) => b.value - a.value);
  return {
    value: sources[0].value,
    method: sources[0].method,
    sources,
    inputs,
    overridden: false,
  };
}

export function computeAnchor(args: {
  talent: PricingInputs;
  platform: string;
  floor: BandResult;
  overrides: ActiveOverride[];
}): BandResult {
  const { talent, platform, floor, overrides } = args;

  const ov = findOverride(overrides, platform, 'anchor');
  if (ov) {
    return {
      value: ov.override_value_sar,
      method: 'override',
      sources: [{ method: 'override', value: ov.override_value_sar, cite: `Manual override by ${ov.created_by_email ?? 'admin'} on ${ov.effective_from}` }],
      inputs: { override_reason: ov.reason ?? '' },
      overridden: true,
      override: ov,
    };
  }

  const sources: Array<{ method: string; value: number; cite: string }> = [];
  const inputs: Record<string, number | string | null> = {};

  // 1. Floor + 5% (negotiation room)
  if (floor.value != null && floor.value > 0) {
    const v = Math.round(floor.value * ANCHOR_FLOOR_LIFT);
    sources.push({
      method: 'floor_plus_5',
      value: v,
      cite: `Floor (${floor.value.toLocaleString()}) × ${ANCHOR_FLOOR_LIFT} for negotiation room`,
    });
  }

  // 2. Base rate × calibration axes (engagement-neutral, audience-neutral defaults)
  const baseRate = num(talent.internal_rates[platform]);
  inputs.base_rate_sar = baseRate;
  if (baseRate && baseRate > 0) {
    // Calibration uses defaults if no per-talent values
    const seas = num(talent.default_seasonality) ?? 1.0;
    const lang = num(talent.default_language) ?? 1.0;
    const auth = num(talent.authority_factor) ?? 1.0;
    inputs.seasonality = seas;
    inputs.language = lang;
    inputs.authority = auth;
    // Data state may cap authority
    let authApplied = auth;
    if (talent.data_completeness === 'socials_only' && auth > 1.15) authApplied = 1.15;
    if (talent.data_completeness === 'minimal') authApplied = 1.0;
    inputs.authority_applied = authApplied;
    const calibration = seas * lang * authApplied;
    const v = Math.round(baseRate * calibration);
    sources.push({
      method: 'base_calibrated',
      value: v,
      cite: `Base ${baseRate.toLocaleString()} × ${calibration.toFixed(3)} (seas ${seas} × lang ${lang} × auth ${authApplied})`,
    });
  }

  if (sources.length === 0) {
    return { value: null, method: 'no_data', sources: [], inputs, overridden: false };
  }
  sources.sort((a, b) => b.value - a.value);
  return {
    value: sources[0].value,
    method: sources[0].method,
    sources,
    inputs,
    overridden: false,
  };
}

export function computeStretch(args: {
  talent: PricingInputs;
  platform: string;
  anchor: BandResult;
  ceiling: BandResult;
  premiumStackPct?: number;
  overrides: ActiveOverride[];
}): BandResult {
  const { talent, platform, anchor, ceiling, premiumStackPct, overrides } = args;

  const ov = findOverride(overrides, platform, 'stretch');
  if (ov) {
    return {
      value: ov.override_value_sar,
      method: 'override',
      sources: [{ method: 'override', value: ov.override_value_sar, cite: `Manual override by ${ov.created_by_email ?? 'admin'} on ${ov.effective_from}` }],
      inputs: { override_reason: ov.reason ?? '' },
      overridden: true,
      override: ov,
    };
  }

  const inputs: Record<string, number | string | null> = {};
  const sources: Array<{ method: string; value: number; cite: string }> = [];

  if (anchor.value == null || anchor.value <= 0) {
    return { value: null, method: 'no_data', sources, inputs, overridden: false };
  }

  const stack = premiumStackPct ?? DEFAULTS.default_premium_pct;
  inputs.anchor_sar = anchor.value;
  inputs.premium_stack_pct = stack;
  let v = Math.round(anchor.value * (1 + stack));
  let cap = false;
  if (ceiling.value != null && ceiling.value > 0 && v > ceiling.value) {
    cap = true;
    v = ceiling.value;
  }
  inputs.ceiling_capped = cap ? 'yes' : 'no';

  sources.push({
    method: cap ? 'capped_at_ceiling' : 'anchor_plus_premium',
    value: v,
    cite: cap
      ? `Anchor × (1 + ${(stack * 100).toFixed(0)}%) exceeded Ceiling — capped at ${ceiling.value!.toLocaleString()}`
      : `Anchor (${anchor.value.toLocaleString()}) × (1 + ${(stack * 100).toFixed(0)}% premium stack)`,
  });
  return { value: v, method: sources[0].method, sources, inputs, overridden: false };
}

export function getCeiling(args: {
  talent: PricingInputs;
  platform: string;
  bands: MarketBandRow[];
  overrides: ActiveOverride[];
}): BandResult {
  const { talent, platform, bands, overrides } = args;

  const ov = findOverride(overrides, platform, 'ceiling');
  if (ov) {
    return {
      value: ov.override_value_sar,
      method: 'override',
      sources: [{ method: 'override', value: ov.override_value_sar, cite: `Manual override by ${ov.created_by_email ?? 'admin'} on ${ov.effective_from}` }],
      inputs: { override_reason: ov.reason ?? '' },
      overridden: true,
      override: ov,
    };
  }

  const band = pickBand(bands, talent.tier_code, talent.audience_market, platform, talent.game);
  const inputs: Record<string, number | string | null> = {
    market_band_max_sar: band?.max_sar ?? null,
    market_band_source: band?.source ?? null,
    market_band_audience: band?.audience_market ?? null,
  };

  if (!band || !band.max_sar) {
    return { value: null, method: 'no_band', sources: [], inputs, overridden: false };
  }
  return {
    value: Math.round(band.max_sar),
    method: 'market_band_max',
    sources: [{
      method: 'market_band_max',
      value: Math.round(band.max_sar),
      cite: `Market band max for ${band.tier_code} × ${band.audience_market ?? 'any'} (source: ${band.source ?? 'internal'})`,
    }],
    inputs,
    overridden: false,
  };
}

/**
 * One-shot: compute all four bands for one platform, in correct order.
 * Used by the F/A/S/C panel which iterates platforms.
 */
export function computeBands(args: {
  talent: PricingInputs;
  platform: string;
  bands: MarketBandRow[];
  campaigns: CampaignSummary[];
  productionGrade?: ProductionGrade;
  overrides: ActiveOverride[];
  premiumStackPct?: number;
}): AllBandsForPlatform {
  const ceiling = getCeiling({ talent: args.talent, platform: args.platform, bands: args.bands, overrides: args.overrides });
  const floor   = computeFloor({ ...args });
  const anchor  = computeAnchor({ talent: args.talent, platform: args.platform, floor, overrides: args.overrides });
  const stretch = computeStretch({ talent: args.talent, platform: args.platform, anchor, ceiling, premiumStackPct: args.premiumStackPct, overrides: args.overrides });
  return {
    platform: args.platform,
    internal_rate: num(args.talent.internal_rates[args.platform]) ?? 0,
    floor, anchor, stretch, ceiling,
  };
}
