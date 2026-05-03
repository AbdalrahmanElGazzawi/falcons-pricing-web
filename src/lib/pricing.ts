/**
 * Team Falcons Pricing — 9-axis matrix engine.
 *
 * Floor-First model (post Migration 030):
 *   • base_rate_anchor in the DB is the talent's defensible FLOOR for IG Reel.
 *   • All other rate_* columns derive as floor × platform_ratio.
 *   • Multipliers stack ABOVE the floor; engine never quotes below baseFee
 *     for a non-companion line (enforceFloor=true, default).
 *   • Companion lines bypass the floor (their fee = 0.5 × solo by design).
 *
 *  Final = MAX(SocialPrice, AuthorityFloor) × ConfidenceCap × (1 + RightsPct) × CompanionMult
 *
 *  SocialPrice    = BaseFee × Eng × Aud × Seas × CType × Lang × AuthFactor
 *  AuthorityFloor = IRL     × FloorShare × Seas × Lang × AuthFactor
 *  AuthFactor     = 1 + ObjectiveWeight × (Authority − 1)
 *
 *  ─── DataCompleteness drives everything else ──────────────────────────
 *  Replaces the old Shikenso-flavoured `MeasurementConfidence` semantics.
 *  Every talent today carries one of four states; the engine derives
 *  axis caps and the ConfidenceCap haircut from that state.
 *
 *    full              → all axes live, ConfidenceCap = 1.00, no caps
 *    socials_only      → Authority capped at 1.15, ConfidenceCap = 0.95
 *    tournament_only   → Eng/Aud locked at 1.00, ConfidenceCap = 0.95
 *    minimal           → all axes locked at 1.00, ConfidenceCap = 0.85
 *
 *  The old MeasurementConfidence values (pending/estimated/rounded/exact)
 *  remain on the database column for back-compat and audit history, but
 *  the active driver is now `data_completeness`. Old values map cleanly:
 *    pending   → minimal
 *    estimated → derived from has_social_data + has_tournament_data
 *    rounded   → derived from has_social_data + has_tournament_data
 *    exact     → 'full' (data is verified)
 */

export type DataCompleteness =
  | 'full'
  | 'socials_only'
  | 'tournament_only'
  | 'minimal';

/** @deprecated kept only for back-compat with stored quote rows */
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
  /**
   * Data state of this talent. Drives axis caps and the ConfidenceCap haircut.
   * Pass either `dataCompleteness` (preferred, post-Migration 022) or the
   * legacy `conf` field; if both are passed, dataCompleteness wins.
   */
  dataCompleteness?: DataCompleteness;
  conf?: MeasurementConfidence; // legacy
  floorShare?: number;  // tier floor share
  rightsPct?: number;   // add-on uplift (cumulative)
  qty?: number;         // quantity
  /**
   * Talent appearing as a featured guest in another creator's content
   * (cameo, supporting role, walk-on). Final unit price multiplied by 0.5.
   */
  isCompanion?: boolean;
  /**
   * Per-talent achievement decay factor written by the Liquipedia scraper.
   * Scales the AuthorityFloor only — protects pros whose tournament value
   * is fading without affecting their social-derived SocialPrice. Default
   * 1.0 if scraper hasn't run or talent has no tournament data.
   */
  achievementDecay?: number;
  /**
   * Creator-specific multipliers (added by QuoteBuilder + QuoteConfigurator).
   * Currently passed through but not consumed in the SocialPrice/AuthorityFloor
   * math — they're stored for the per-line creator multiplier override panel
   * and surfaced in the quote PDF. Math wiring is a follow-up phase.
   */
  brandLoyaltyPct?: number;
  exclusivityPremiumPct?: number;
  crossVerticalMultiplier?: number;
  engagementQualityModifier?: number;
  productionStyleMultiplier?: number;
  /**
   * Floor enforcement (Migration 030): when true (default), final unit price
   * never drops below baseFee for a non-companion line. Multipliers can only
   * push UP from the floor. Set to false ONLY for explicitly-approved deals
   * that need to dip below floor (variance register logs them).
   */
  enforceFloor?: boolean;
  /**
   * Channel multiplier (Migration 035). Scales `baseFee` and `irl` BEFORE
   * axes apply, so each sales channel has its own floor:
   *   • direct_brand        = 1.00  (full engine number)
   *   • agency_brokered     = 0.65 / 0.50 / 0.35  (light / standard / heavy)
   *   • strategic_account   = 0.65  (top-5 repeat brand, private rate)
   * Defaults to 1.00 for back-compat with quotes prepared before Migration 035.
   */
  channelMultiplier?: number;
}

/**
 * Channel preset table (Migration 035). Keep client-side copy in sync with
 * the seed data in `public.channel_multipliers`. Used by the quote builder
 * to look up the multiplier for a chosen (channel, intensity) pair.
 */
export const CHANNEL_PRESETS = [
  { channel: 'direct_brand',       intensity: null,        multiplier: 1.00,
    label: 'Direct brand',
    description: 'Brand contacts Falcons directly. Full engine floor applies.' },
  { channel: 'agency_brokered',    intensity: 'light',     multiplier: 0.65,
    label: 'Agency-brokered (Light)',
    description: 'Agency facilitates a brand-requested deal. Light handling.' },
  { channel: 'agency_brokered',    intensity: 'standard',  multiplier: 0.50,
    label: 'Agency-brokered (Standard)',
    description: 'Standard MENA agency margin. Creative + reporting + brand liaison.' },
  { channel: 'agency_brokered',    intensity: 'heavy',     multiplier: 0.35,
    label: 'Agency-brokered (Heavy)',
    description: 'Agency owns brand relationship end-to-end. Falcons supplies talent only.' },
  { channel: 'strategic_account',  intensity: null,        multiplier: 0.65,
    label: 'Strategic account',
    description: 'Top-5 repeat brand with 90-day exclusivity. Private rate.' },
] as const;

export type SalesChannel = 'direct_brand' | 'agency_brokered' | 'strategic_account';
export type ChannelIntensity = 'light' | 'standard' | 'heavy';

/** Resolve channel multiplier from a (channel, intensity) pair. */
export function resolveChannelMultiplier(
  channel: SalesChannel,
  intensity?: ChannelIntensity | null,
): number {
  const match = CHANNEL_PRESETS.find(p =>
    p.channel === channel &&
    ((p.intensity ?? null) === (intensity ?? null))
  );
  return match?.multiplier ?? 1.00;
}

export interface LineOutput {
  authFactor: number;
  engGated: number;
  audGated: number;
  authGated: number;
  seasGated: number;
  confCap: number;
  socialPrice: number;
  floorPrice: number;
  preAddOn: number;
  finalUnit: number;
  finalAmount: number;
  /** Floor enforcement: true if engine clamped finalUnit up to baseFee. */
  floorHit?: boolean;
  /** Floor enforcement: SAR amount the floor enforcement added. */
  floorDelta?: number;
  appliedState: DataCompleteness;
}

/** Map legacy MeasurementConfidence onto a DataCompleteness state. */
function legacyToCompleteness(conf?: MeasurementConfidence): DataCompleteness {
  switch (conf) {
    case 'pending':   return 'minimal';
    case 'estimated': return 'socials_only';
    case 'rounded':   return 'socials_only';
    case 'exact':     return 'full';
    default:          return 'socials_only';
  }
}

/**
 * Caps + haircut driven by talent data state.
 * Returns the multipliers to apply to each axis and the ConfidenceCap.
 */
export function gatesForState(state: DataCompleteness) {
  switch (state) {
    case 'full':
      return { engCap: Infinity, audCap: Infinity, authCap: Infinity, seasCap: Infinity, confCap: 1.00 };
    case 'socials_only':
      // No tournament data → Authority claim less defensible. Cap it.
      return { engCap: Infinity, audCap: Infinity, authCap: 1.15, seasCap: Infinity, confCap: 0.95 };
    case 'tournament_only':
      // No social data → can't claim Eng/Aud premiums.
      return { engCap: 1.00, audCap: 1.00, authCap: Infinity, seasCap: Infinity, confCap: 0.95 };
    case 'minimal':
      // Staff/brand-new/no data → tier baseline only.
      return { engCap: 1.00, audCap: 1.00, authCap: 1.00, seasCap: 1.00, confCap: 0.85 };
  }
}

export function computeLine(p: LineInput): LineOutput {
  // Resolve the active state. dataCompleteness wins when both are passed.
  const state: DataCompleteness =
    p.dataCompleteness ?? legacyToCompleteness(p.conf);
  const gates = gatesForState(state);

  const auth = p.auth ?? 1;
  const obj = p.obj ?? 0;
  const eng = p.eng ?? 1;
  const aud = p.aud ?? 1;
  const seas = p.seas ?? 1;
  const ctype = p.ctype ?? 1;
  const lang = p.lang ?? 1;
  const floorShare = p.floorShare ?? 0.5;
  const qty = p.qty ?? 1;
  const decay = p.achievementDecay ?? 1.0;

  // Channel multiplier (Migration 035): scales baseFee + IRL before axes.
  // Each sales channel has its own floor — multipliers can never push below
  // the channel-adjusted baseFee. Defaults to 1.00 (direct_brand).
  const channelMult = p.channelMultiplier ?? 1.0;
  const effBaseFee = p.baseFee * channelMult;
  const effIrl = (p.irl ?? 0) * channelMult;

  const authRaw = 1 + obj * (auth - 1);

  // Apply state-driven caps
  const engGated  = Math.min(eng,    gates.engCap);
  const audGated  = Math.min(aud,    gates.audCap);
  const authGated = Math.min(authRaw, gates.authCap);
  const seasGated = Math.min(seas,   gates.seasCap);

  const confCap = gates.confCap;

  // Production style multiplier (Migration 039). 1.00 = standard, 1.10 = scripted,
  // 1.20 = on-ground/location, 1.35 = multi-day shoot. Defaults to 1.0 when omitted.
  const prodMult = p.productionStyleMultiplier ?? 1.0;

  const socialPrice = Math.round(
    effBaseFee * engGated * audGated * seasGated * ctype * lang * authGated * prodMult
  );
  // AuthorityFloor scales by achievement_decay so a 2019 Major winner
  // doesn't get the same protection as a 2025 Major winner.
  const floorPrice = Math.round(
    effIrl * floorShare * seasGated * lang * authGated * decay
  );

  const preAddOn = Math.max(socialPrice, floorPrice);
  const finalUnitOrganic = Math.round(preAddOn * confCap);
  const withRights = Math.round(finalUnitOrganic * (1 + (p.rightsPct ?? 0)));
  const rawUnit = p.isCompanion ? Math.round(withRights * 0.5) : withRights;

  // Floor enforcement (Migration 030). Default ON. Companion lines bypass.
  const enforceFloor = p.enforceFloor !== false && !p.isCompanion;
  let finalUnit = rawUnit;
  let floorHit = false;
  let floorDelta = 0;
  if (enforceFloor && effBaseFee > 0 && rawUnit < effBaseFee) {
    floorHit = true;
    floorDelta = Math.round(effBaseFee - rawUnit);
    finalUnit = Math.round(effBaseFee);
  }

  const finalAmount = Math.round(finalUnit * qty);

  return {
    authFactor: +authRaw.toFixed(3),
    engGated, audGated, authGated, seasGated, confCap,
    socialPrice, floorPrice, preAddOn,
    finalUnit, finalAmount,
    ...(floorHit ? { floorHit, floorDelta } : {}),
    appliedState: state,
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

/** Default lever values for a talent based on their data state. */
export function defaultLeversForState(state: DataCompleteness) {
  switch (state) {
    case 'full':
      return { eng: 1.0, aud: 1.0, seas: 1.0, ctype: 1.0, lang: 1.0, auth: 1.0, obj: 0.5 };
    case 'socials_only':
      return { eng: 1.0, aud: 1.0, seas: 1.0, ctype: 1.0, lang: 1.0, auth: 1.0, obj: 0.5 };
    case 'tournament_only':
      // Authority axis live (defensible from tournament data); Eng/Aud
      // pinned to 1.0 because we have no follower data to back a premium.
      return { eng: 1.0, aud: 1.0, seas: 1.0, ctype: 1.0, lang: 1.0, auth: 1.15, obj: 0.7 };
    case 'minimal':
      return { eng: 1.0, aud: 1.0, seas: 1.0, ctype: 1.0, lang: 1.0, auth: 1.0, obj: 0.2 };
  }
}

/** Human-readable description of a data state, for the builder UI. */
export const DATA_STATE_META: Record<DataCompleteness, {
  label: string; tone: 'green' | 'amber' | 'navy' | 'red'; hint: string;
}> = {
  full:             { label: 'Full data',        tone: 'green', hint: 'Socials + tournament data on file. All axes live.' },
  socials_only:     { label: 'Socials only',     tone: 'amber', hint: 'No tournament record. Authority capped at 1.15×.' },
  tournament_only:  { label: 'Tournament only',  tone: 'amber', hint: 'No social data. Engagement/Audience locked at 1.00×.' },
  minimal:          { label: 'Minimal',          tone: 'red',   hint: 'Tier baseline only. Confidence haircut 0.85×.' },
};

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
  // Production complexity (Migration 039). Mirrors the creator catalog
  // but with player-relevant labels (gameplay capture, on-site events).
  production: [
    { label: 'Standard creation',          factor: 1.00 },
    { label: 'Scripted / extra revisions', factor: 1.10 },
    { label: 'Location / on-ground shoot', factor: 1.20 },
    { label: 'Multi-day / production-heavy', factor: 1.35 },
  ],
  objective: [
    { label: 'Awareness (Wt 0.2)', weight: 0.2 },
    { label: 'Consideration (Wt 0.5)', weight: 0.5 },
    { label: 'Conversion (Wt 0.7)', weight: 0.7 },
    { label: 'Authority (Wt 1.0)', weight: 1.0 },
  ],
  // Data state replaces the Shikenso-flavoured confidence picker.
  // The labels here are surfaced verbatim in the builder.
  dataCompleteness: [
    { label: 'Full — socials + tournament data',   value: 'full'             as const },
    { label: 'Socials only — no tournament record', value: 'socials_only'    as const },
    { label: 'Tournament only — weak/no socials',   value: 'tournament_only' as const },
    { label: 'Minimal — staff / brand-new / no data', value: 'minimal'       as const },
  ],
  /** @deprecated kept for old quote rows */
  confidence: [
    { label: 'Pending (legacy)',   value: 'pending'   as const },
    { label: 'Estimated (legacy)', value: 'estimated' as const },
    { label: 'Rounded (legacy)',   value: 'rounded'   as const },
    { label: 'Exact (legacy)',     value: 'exact'     as const },
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
