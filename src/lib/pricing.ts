/**
 * Team Falcons Pricing — 9-axis matrix engine.
 * Ported from Apps Script Code.gs (computeLine).
 *
 *  Final = SocialPrice × ConfidenceCap
 *          × (1 - BrandLoyaltyPct) × (1 + ExclusivityPct)
 *          × CrossVerticalMult × EngagementQualityMult × ProductionStyleMult
 *          × (1 + RightsPct) × (0.5 if Companion)
 *  (AuthorityFloor disabled — was inflating cheap deliverables. See computeLine.)
 *
 *  SocialPrice    = BaseFee × Eng × Aud × Seas × CType × Lang × AuthFactor
 *  AuthorityFloor = IRL     × FloorShare × Seas × Lang × AuthFactor
 *  AuthFactor     = 1 + ObjectiveWeight × (Authority − 1)
 *  Confidence cap: pending=0.75 · estimated=0.9 · rounded=1.0 · exact=1.0
 *  Axis gating when confidence incomplete: Eng≤1.2, Auth≤1.3, Seas≤1.25
 */

export type MeasurementConfidence = 'pending' | 'estimated' | 'rounded' | 'exact';

export interface LineInput {
  baseFee: number;      // platform rate from roster
  irl?: number;         // IRL fee (0 for creators)
  eng?: number;         // engagement factor
  aud?: number;         // audience quality factor
  seas?: number;        // seasonality factor
  ctype?: number;       // content type factor (Organic/Integrated/Sponsored)
  lang?: number;        // language factor
  auth?: number;        // raw authority factor
  obj?: number;         // objective weight (0..1)
  conf?: MeasurementConfidence;
  floorShare?: number;  // tier floor share
  rightsPct?: number;   // add-on uplift (cumulative)
  qty?: number;         // quantity
  /**
   * Companion role flag. When true, the talent is appearing as a featured guest
   * in another creator's content (cameo, supporting role, walk-on). Final unit
   * price is multiplied by 0.5 — half-rate, capped, applied uniformly across
   * whatever deliverable the line represents. Composes with all other axes.
   */
  isCompanion?: boolean;
  // ─── Creator-specific per-quote multipliers (auto-loaded from the creator
  //     record; per-line overridable in the Configurator). World best practice
  //     for creator pricing — captures negotiation context that pure
  //     CPM × reach can't model.
  brandLoyaltyPct?: number;          // 0 / 0.10 / 0.20 / 0.30 — discount for recurring brand
  exclusivityPremiumPct?: number;    // 0 / 0.25 / 0.50 / 1.0 — category-exclusivity premium
  crossVerticalMultiplier?: number;  // 1.0 / 1.15 / 1.30 — non-endemic brand reach premium
  engagementQualityModifier?: number;// 0.85 / 1.0 / 1.15 / 1.25 — based on actual ER%
  productionStyleMultiplier?: number;// 0.9 (raw) / 1.0 / 1.20 (scripted) / 1.40 (full studio)
}

export interface LineOutput {
  authFactor: number;
  engGated: number;
  authGated: number;
  seasGated: number;
  confCap: number;
  socialPrice: number;
  floorPrice: number;
  preAddOn: number;
  finalUnit: number;
  finalAmount: number;
  // Per-line multiplier breakdown (so Configurator can surface 'why'):
  brandLoyaltyApplied: number;
  exclusivityApplied: number;
  crossVerticalApplied: number;
  engagementQualityApplied: number;
  productionStyleApplied: number;
}

export function computeLine(p: LineInput): LineOutput {
  const conf = (p.conf ?? 'exact').toLowerCase() as MeasurementConfidence;
  const auth = p.auth ?? 1;
  const obj = p.obj ?? 0;
  const eng = p.eng ?? 1;
  const aud = p.aud ?? 1;
  const seas = p.seas ?? 1;
  const ctype = p.ctype ?? 1;
  const lang = p.lang ?? 1;
  const floorShare = p.floorShare ?? 0.5;
  const qty = p.qty ?? 1;

  const authRaw = 1 + obj * (auth - 1);

  const cap = (val: number, max: number): number => {
    if (conf === 'pending') return 1;
    if (conf === 'estimated') return Math.min(val, max);
    return val;
  };

  const engGated = cap(eng, 1.2);
  const authGated = cap(authRaw, 1.3);
  const seasGated = cap(seas, 1.25);

  const confCap =
    conf === 'pending' ? 0.75 :
    conf === 'estimated' ? 0.9 :
    1.0;

  const socialPrice = Math.round(
    p.baseFee * engGated * aud * seasGated * ctype * lang * authGated
  );
  // AuthorityFloor disabled. Originally enforced a minimum line price of
  // IRL × floorShare so a top-tier player couldn't be under-priced for cheap
  // deliverables — but with rate-card-anchored base rates it overrides
  // valid cheap deliverables (TikTok Repost 1,800 SAR base inflated to
  // 13,750 SAR by the floor). Hard-coded to 0 so saved drafts with stale
  // floorShare=0.5 also compute correctly without DB sync.
  const floorPrice = 0;

  const preAddOn = Math.max(socialPrice, floorPrice);
  const brandLoyaltyPct        = Math.max(0, Math.min(0.5, p.brandLoyaltyPct ?? 0));
  const exclusivityPremiumPct  = Math.max(0, Math.min(2.0, p.exclusivityPremiumPct ?? 0));
  const crossVerticalMult      = Math.max(0.5, Math.min(2.0, p.crossVerticalMultiplier ?? 1.0));
  const engagementQualityMult  = Math.max(0.5, Math.min(2.0, p.engagementQualityModifier ?? 1.0));
  const productionStyleMult    = Math.max(0.5, Math.min(2.0, p.productionStyleMultiplier ?? 1.0));

  const finalUnitOrganic = Math.round(preAddOn * confCap);
  // Stack creator multipliers on the organic line BEFORE rights uplift, so
  // rights add on top of the negotiated base. Brand loyalty is a discount
  // (1 - x); exclusivity is a premium (1 + x); the others are direct mults.
  const afterCreatorMults = Math.round(
    finalUnitOrganic
      * (1 - brandLoyaltyPct)
      * (1 + exclusivityPremiumPct)
      * crossVerticalMult
      * engagementQualityMult
      * productionStyleMult
  );
  const withRights = Math.round(afterCreatorMults * (1 + (p.rightsPct ?? 0)));
  const finalUnit = p.isCompanion ? Math.round(withRights * 0.5) : withRights;
  const finalAmount = Math.round(finalUnit * qty);

  return {
    authFactor: +authRaw.toFixed(3),
    engGated, authGated, seasGated, confCap,
    socialPrice, floorPrice, preAddOn,
    finalUnit, finalAmount,
    brandLoyaltyApplied:        brandLoyaltyPct,
    exclusivityApplied:         exclusivityPremiumPct,
    crossVerticalApplied:       crossVerticalMult,
    engagementQualityApplied:   engagementQualityMult,
    productionStyleApplied:     productionStyleMult,
  };
}

/** Sum an array of lines into a subtotal + totals with add-on uplift + VAT. */
export function computeQuoteTotals(params: {
  lines: { finalAmount: number }[];
  addonsUpliftPct?: number;
  vatRate?: number;
}) {
  const subtotal = params.lines.reduce((acc, l) => acc + (l.finalAmount || 0), 0);
  const addons = params.addonsUpliftPct ?? 0;
  const vat = params.vatRate ?? 0.15;
  const preVat = Math.round(subtotal * (1 + addons));
  const vatAmount = Math.round(preVat * vat);
  const total = preVat + vatAmount;
  return { subtotal, preVat, vatAmount, total, addonsUpliftPct: addons, vatRate: vat };
}

/** Human-friendly axis option catalogues (label + factor). */
export const AXIS_OPTIONS = {
  contentType: [
    { label: 'Organic / Creator-led', factor: 0.85 },
    { label: 'Integrated (Talent-led)', factor: 1.00 },
    { label: 'Sponsored (Client script)', factor: 1.15 },
  ],
  engagement: [
    { label: '<3% — Below baseline', factor: 0.90 },
    { label: '3% – 5% — Baseline', factor: 1.00 },
    { label: '5% – 7% — Above avg', factor: 1.10 },
    { label: '≥7% — Elite', factor: 1.20 },
  ],
  audience: [
    { label: 'Gaming-adjacent', factor: 1.00 },
    { label: 'Gaming-core', factor: 1.15 },
    { label: 'Elite brand-fit', factor: 1.25 },
  ],
  seasonality: [
    { label: 'Regular season', factor: 1.00 },
    { label: 'Playoffs / Major', factor: 1.20 },
    { label: 'Finals / Peak', factor: 1.35 },
  ],
  language: [
    { label: 'English', factor: 1.00 },
    { label: 'Arabic', factor: 1.10 },
    { label: 'Bilingual (EN + AR)', factor: 1.20 },
  ],
  authority: [
    { label: 'Normal',                       factor: 1.00 },
    { label: 'Proven / Established',         factor: 1.15 },
    { label: 'Elite Contender',              factor: 1.30 },
    { label: 'Global Star / Major Winner',   factor: 1.50 },
  ],
  objective: [
    { label: 'Awareness (Wt 0.2)', weight: 0.2 },
    { label: 'Consideration (Wt 0.5)', weight: 0.5 },
    { label: 'Conversion (Wt 0.7)', weight: 0.7 },
    { label: 'Authority (Wt 1.0)', weight: 1.0 },
  ],
  confidence: [
    // Labels reframed around the Shikenso integration timeline (Phase 2, Q3 2026).
    // Until that lands, almost every player sits at 'rounded' — manually-verified
    // FMG numbers rounded to the nearest 100. 'TBV' = To Be Verified via Shikenso.
    { label: 'Pending — no follower data (1.0× cap + haircut)',          value: 'pending'   as const },
    { label: 'Estimated — partial data, public sources (capped premiums)', value: 'estimated' as const },
    { label: 'TBV via Shikenso — manually verified (premiums active)',   value: 'rounded'   as const },
    { label: 'Verified — Shikenso confirmed',                            value: 'exact'     as const },
  ],
};

/** ──────────────────────────────────────────────────────────────────────────
 * Creator-specific axis options (from Content Creators Pricing Engine v3).
 * Players and creators have DIFFERENT semantics for several axes:
 *   - Authority: players talk championship credentials; creators talk
 *     conversion/community trust
 *   - Audience Fit: creators are sector-based (Sports / Tech / Anime /
 *     KSA / MENA / etc.), players are gaming-adjacent
 *   - Engagement: same shape but creator-tier specific bands
 * The Configurator + PDF should pick the right catalog by talent type.
 */
export const CREATOR_AXIS_OPTIONS = {
  engagement: [
    { label: '<2% — Low',          factor: 0.80 },
    { label: '2–4% — Below avg',   factor: 0.92 },
    { label: '4–6% — Base',        factor: 1.00 },
    { label: '6–8% — Good',        factor: 1.12 },
    { label: '8–10% — Strong',     factor: 1.25 },
    { label: '>10% — Premium',     factor: 1.40 },
  ],
  audience: [
    { label: 'Broad Generic',                    factor: 0.85 },
    { label: 'Gaming-aware',                     factor: 1.00 },
    { label: 'Core Gaming',                      factor: 1.08 },
    { label: 'Esports-native / Premium fit',     factor: 1.18 },
    { label: 'Youth Entertainment / Variety',    factor: 1.05 },
    { label: 'Comedy / Meme Culture',            factor: 1.05 },
    { label: 'Sports / Football / Active',       factor: 1.08 },
    { label: 'Anime / Geek / Fandom',            factor: 1.07 },
    { label: 'Family / Household / Mainstream',  factor: 0.98 },
    { label: 'KSA / Saudi Mass',                 factor: 1.12 },
    { label: 'MENA Arabic',                      factor: 1.15 },
    { label: 'GCC Premium / Affluent',           factor: 1.10 },
    { label: 'Tech / Telco / Devices',           factor: 1.06 },
    { label: 'Retail / QSR / FMCG',              factor: 1.03 },
    { label: 'Travel / Tourism / Destination',   factor: 1.00 },
    { label: 'Finance / Education / CSR',        factor: 0.97 },
  ],
  authority: [
    { label: 'Standard',                    factor: 1.00 },
    { label: 'Trusted niche leader',        factor: 1.10 },
    { label: 'Premium conversion driver',   factor: 1.20 },
    { label: 'Category-defining / Hero',    factor: 1.35 },
  ],
  language: [
    { label: 'English',          factor: 1.00 },
    { label: 'Arabic',           factor: 1.05 },
    { label: 'Bilingual (EN+AR)', factor: 1.12 },
  ],
  // Creators have a Production axis (replaces Seasonality which is player-relevant)
  production: [
    { label: 'Standard creation',         factor: 1.00 },
    { label: 'Scripted / extra revisions', factor: 1.10 },
    { label: 'On-ground / special shoot',  factor: 1.20 },
  ],
  objective: [
    { label: 'Awareness',                 weight: 0.35 },
    { label: 'Consideration / Traffic',   weight: 0.60 },
    { label: 'Conversion',                weight: 0.85 },
    { label: 'Trust / Authority',         weight: 1.00 },
  ],
};

/** Creator rights bundles (separate from one-line "addons" used at quote level) */
export const CREATOR_RIGHTS_BUNDLES = [
  { label: 'None',                  uplift: 0.00 },
  { label: 'Organic repost 90d',    uplift: 0.10 },
  { label: 'Organic repost 180d',   uplift: 0.20 },
  { label: 'Paid usage 30d',        uplift: 0.25 },
  { label: 'Paid usage 90d',        uplift: 0.60 },
  { label: 'Paid usage 180d',       uplift: 1.00 },
  { label: 'Whitelisting 30d',      uplift: 0.35 },
  { label: 'Whitelisting 90d',      uplift: 0.90 },
  { label: 'Website / email only',  uplift: 0.10 },
  { label: 'All owned + paid 90d',  uplift: 1.20 },
];

/** Creator extra add-ons — exclusivity windows, rush surcharges, raw footage */
export const CREATOR_EXTRA_ADDONS = [
  { label: 'None',           uplift: 0.00 },
  { label: 'Exclusivity 30d',  uplift: 0.15 },
  { label: 'Exclusivity 90d',  uplift: 0.35 },
  { label: 'Exclusivity 180d', uplift: 0.60 },
  { label: 'Rush 72h',         uplift: 0.10 },
  { label: 'Rush 48h',         uplift: 0.20 },
  { label: 'Rush 24h',         uplift: 0.35 },
  { label: 'Raw footage',      uplift: 0.15 },
  { label: 'Extra cutdowns',   uplift: 0.10 },
];

/** Multi-line bundle discounts (apply at quote level after VAT-pre subtotal) */
export const CREATOR_BUNDLE_DISCOUNTS = [
  { label: 'None',                      discount: 0.00 },
  { label: '3–4 creators / lines',      discount: 0.05 },
  { label: '5–7 creators / lines',      discount: 0.08 },
  { label: '8+ creators / lines',       discount: 0.12 },
  { label: 'Always-on custom',          discount: 0.15 },
];

/** Helper — pick the right axis catalog based on talent type */
export function axisOptionsForTalent(kind: 'player' | 'creator') {
  if (kind === 'creator') return CREATOR_AXIS_OPTIONS;
  return AXIS_OPTIONS;
}

/** Resolve a numeric factor → human label, preferring the talent-aware catalog */
export function labelForFactor(
  axis: 'engagement' | 'audience' | 'authority' | 'language' | 'seasonality' | 'production' | 'contentType',
  factor: number,
  kind: 'player' | 'creator',
): string {
  const cat = kind === 'creator' ? (CREATOR_AXIS_OPTIONS as any) : (AXIS_OPTIONS as any);
  const list = cat[axis] as Array<{ label: string; factor: number }> | undefined;
  if (!list) return factor.toFixed(2) + '×';
  const m = list.find(o => Math.abs(o.factor - factor) < 0.005);
  return m ? m.label : factor.toFixed(2) + '×';
}
