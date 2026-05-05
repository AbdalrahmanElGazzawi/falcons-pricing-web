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
   * Creator-specific multipliers — wired into SocialPrice (Migration 059, May 5).
   * Sourced by QuoteBuilder + QuoteConfigurator from the creator record's
   * defaults, with per-line overrides. For player lines (no creator record),
   * all four resolve to neutral: brand_loyalty_pct=0 / exclusivity_premium_pct=0 /
   * cross_vertical_multiplier=1.0 / engagement_quality_modifier=1.0.
   * Each is clamped to a sane range to prevent runaway prices from a stray
   * input value:
   *   brandLoyaltyPct           clamped to [-50, +100]  (loyalty discount → premium)
   *   exclusivityPremiumPct     clamped to [0,   +100]  (premium only, no discount)
   *   crossVerticalMultiplier   clamped to [0.5, 2.0]   (multiplicative)
   *   engagementQualityModifier clamped to [0.5, 2.0]   (multiplicative)
   * The pct fields are converted to multipliers as (1 + pct/100) before
   * stacking into SocialPrice.
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
  /**
   * Stream activity multiplier (Migration 040). Applies to socialPrice when
   * the deliverable is a stream-type (twitch_stream, kick_stream, watchparty,
   * twitch_integ, kick_integ). Reflects last-30-day activity pulled from
   * Kick/Twitch APIs:
   *   inactive 0.70× / light 0.90× / regular 1.00× / active 1.10× /
   *   heavy 1.25× / pro 1.40×.
   * UI should show this dropdown only on stream lines and pass 1.00 (neutral)
   * for non-stream lines. Defaults to 1.00.
   */
  streamActivity?: number;
  // ── Migration 042 — World-class axes ─────────────────────────────────
  /**
   * Audience country mix vs target market (Migration 042).
   * Aligned >70% (1.40×) / 40-70% (1.20×) / Crossover 20-40% (1.00×) /
   * Mismatched <20% (0.70×). Brand-side ROI multiplier — what % of the
   * talent's audience is in the brand's target country.
   */
  audCountryMix?: number;
  /**
   * Audience age demo. Premium 25-44 (1.20×) / Mainstream 18-34 (1.00×) /
   * Youth 13-24 (0.85×). Banks/auto/finance pay premium for older.
   */
  audAgeDemo?: number;
  /**
   * Product integration depth. Passive 0.90× / Active 1.00× / Endorsement
   * 1.20× / Long-term ambassador 1.45×. Distinct from content-type axis.
   */
  integrationDepth?: number;
  /**
   * First-look / launch exclusivity window. Standard 1.00× / 48h regional
   * first 1.20× / 24h global first 1.40× / Launch-day exclusive 1.65×.
   */
  firstLook?: number;
  /**
   * Real-time / live moment. Standard 1.00× / Match-live 1.30× / Trophy
   * moment 1.50×. Authenticity-driven, irreplaceable.
   */
  realTimeLive?: number;
  /**
   * Lifestyle context. Training facility 1.00× / At-home casual 0.95× /
   * Lifestyle (gym/travel/event) 1.10×.
   */
  lifestyleContext?: number;
  /**
   * Brand safety score multiplier. Low <0.6 → 0.85× / Std 0.6-0.85 → 1.00× /
   * Premium >0.85 → 1.10×. Family/kids brands threshold-gated.
   */
  brandSafety?: number;
  /**
   * Collab size — number of unique talents in this quote. Per-line discount:
   *   1 (solo) 1.00× / 2 (duo) 0.85× / 3 (trio) 0.75× / 4+ (squad) 0.65×.
   * Caller (QuoteBuilder) counts unique talent IDs and passes count to each
   * line's computeLine call.
   */
  collabSize?: number;
  /**
   * Esports influencer specific axes (Migration 042). All optional, defaults
   * to 1.00× when omitted.
   */
  streamingConsistency?: number;   // <3mo 0.90 / 3-12mo 1.00 / 12mo+ 1.10 / 24mo+ 1.20
  chatHealth?: number;             // toxic 0.80 / mixed 0.95 / clean 1.05 / curated 1.15
  crossGameVersatility?: number;   // single 0.95 / 2-game 1.00 / variety 1.10
  // ── Migration 056 — Talent-submitted intake floor + agency gross-up ─────
  /**
   * Talent's submitted floor for this deliverable (SAR), as captured by the
   * /talent/<token> intake page and persisted on `players.min_rates[key]`.
   * When > 0, this is treated as a defensible floor *on top of* the
   * existing engine floor (effBaseFee). The engine grosses it up by
   * `agencyFeePct` if any, then takes max(finalUnit, grossedFloor).
   * `talentFloorHit` is set on LineOutput when this floor controlled the price.
   * Default 0 (no intake floor — engine math wins as before).
   *
   * APPROVAL GATE (Mig 062, May 5): the value passed in here is ALREADY
   * gated by the call site on `players.intake_status === 'approved'` —
   * meaning admin has reviewed and approved the talent submission.
   * Submitted-but-not-yet-approved intakes pass 0 (no-op). The engine
   * itself doesn't know about intake_status; gating is per-call-site
   * because that's where the player record is in scope.
   */
  talentSubmittedFloor?: number;
  /**
   * Agency fee % declared by the talent on the intake form (0–50). Used to
   * gross up `talentSubmittedFloor` so the talent's NET take-home matches
   * what they submitted after the agency takes its cut.
   *   grossedFloor = talentSubmittedFloor × (1 + agencyFeePct/100)
   * Default 0 (talent represents themselves directly).
   */
  agencyFeePct?: number;
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
  // ── Migration 056 — Talent intake floor + agency gross-up ───────────────
  /** Raw intake-submitted floor (SAR), pre-agency gross-up. 0 = none on file. */
  talentFloorRaw?: number;
  /** After agency gross-up: floorRaw × (1 + agencyFeePct/100). 0 = none. */
  talentFloorGrossed?: number;
  /** True if the grossed talent floor controlled the final price. */
  talentFloorHit?: boolean;
  /** SAR added by the talent-floor enforcement (finalUnit - rawUnit). */
  talentFloorDelta?: number;
  /** Agency fee % used in the gross-up (mirrored for the breakdown UI). */
  agencyFeePctApplied?: number;
  /**
   * Which input controlled the final unit price:
   *   'engine'       — multipliers landed above all floors (normal path)
   *   'base_floor'   — engine baseFee floor enforced (Migration 030)
   *   'talent_floor' — intake-submitted floor (with agency gross-up) won
   */
  priceController?: 'engine' | 'base_floor' | 'talent_floor';
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

  // Production style multiplier (Migration 039).
  const prodMult = p.productionStyleMultiplier ?? 1.0;
  // Stream activity multiplier (Migration 040).
  const streamMult = p.streamActivity ?? 1.0;
  // Migration 042 — world-class axes
  const audCountryMixMult = p.audCountryMix ?? 1.0;
  const audAgeMult        = p.audAgeDemo ?? 1.0;
  const integrationMult   = p.integrationDepth ?? 1.0;
  const firstLookMult     = p.firstLook ?? 1.0;
  const realTimeLiveMult  = p.realTimeLive ?? 1.0;
  const lifestyleMult     = p.lifestyleContext ?? 1.0;
  const brandSafetyMult   = p.brandSafety ?? 1.0;
  // Collab discount derived from collabSize (engine bakes in -15%/-25%/-35%)
  const collabSize = Math.max(1, p.collabSize ?? 1);
  const collabMult = collabSize === 1 ? 1.00
                   : collabSize === 2 ? 0.85
                   : collabSize === 3 ? 0.75
                   : 0.65;
  // Esports-influencer specific axes (default neutral when not passed)
  const streamingConsistencyMult = p.streamingConsistency ?? 1.0;
  const chatHealthMult           = p.chatHealth ?? 1.0;
  const crossGameMult            = p.crossGameVersatility ?? 1.0;

  // Creator-specific multipliers (Migration 059, May 5 — moved from
  // passed-through to consumed). Clamped to sane ranges; pct fields convert
  // to multipliers as (1 + pct/100). Player lines pass neutral defaults.
  const brandLoyaltyMult       = 1 + Math.max(-50, Math.min(100, p.brandLoyaltyPct ?? 0)) / 100;
  const exclusivityPremiumMult = 1 + Math.max(0,   Math.min(100, p.exclusivityPremiumPct ?? 0)) / 100;
  const crossVerticalMult      = Math.max(0.5, Math.min(2.0, p.crossVerticalMultiplier ?? 1.0));
  const engagementQualityMult  = Math.max(0.5, Math.min(2.0, p.engagementQualityModifier ?? 1.0));

  const socialPrice = Math.round(
    effBaseFee * engGated * audGated * seasGated * ctype * lang * authGated
    * prodMult * streamMult
    * audCountryMixMult * audAgeMult * integrationMult
    * firstLookMult * realTimeLiveMult * lifestyleMult * brandSafetyMult
    * collabMult
    * streamingConsistencyMult * chatHealthMult * crossGameMult
    * brandLoyaltyMult * exclusivityPremiumMult * crossVerticalMult * engagementQualityMult
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

  // ── Migration 056 — Talent intake floor + agency gross-up ────────────────
  // Layered ON TOP of the baseFee floor: when the talent has submitted a
  // floor for this deliverable via the /talent/<token> intake, treat it as a
  // defensible minimum after grossing up by the agency fee they declared.
  // Companion lines bypass (they're explicitly half-priced by design).
  const talentFloorRaw = Math.max(0, Math.round(p.talentSubmittedFloor ?? 0));
  const agencyFeePctApplied = Math.max(0, Math.min(50, p.agencyFeePct ?? 0));
  const talentFloorGrossed = talentFloorRaw > 0
    ? Math.round(talentFloorRaw * (1 + agencyFeePctApplied / 100))
    : 0;
  let talentFloorHit = false;
  let talentFloorDelta = 0;
  const allowTalentFloor = enforceFloor; // same gate: skip companion / opt-out lines
  const beforeTalentFloor = finalUnit;
  if (allowTalentFloor && talentFloorGrossed > 0 && finalUnit < talentFloorGrossed) {
    talentFloorHit = true;
    talentFloorDelta = Math.round(talentFloorGrossed - finalUnit);
    finalUnit = talentFloorGrossed;
  }

  // Determine which input controlled the final unit price.
  // Talent-floor wins last → so if it bumped, it controls.
  const priceController: 'engine' | 'base_floor' | 'talent_floor' =
    talentFloorHit ? 'talent_floor'
    : floorHit     ? 'base_floor'
    :                'engine';

  const finalAmount = Math.round(finalUnit * qty);

  return {
    authFactor: +authRaw.toFixed(3),
    engGated, audGated, authGated, seasGated, confCap,
    socialPrice, floorPrice, preAddOn,
    finalUnit, finalAmount,
    ...(floorHit ? { floorHit, floorDelta } : {}),
    ...(talentFloorRaw > 0 ? {
      talentFloorRaw,
      talentFloorGrossed,
      agencyFeePctApplied,
      ...(talentFloorHit ? { talentFloorHit, talentFloorDelta } : {}),
    } : {}),
    priceController,
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
    { label: 'Organic / Creator-led',           factor: 0.85 },
    { label: 'Integrated (Talent-led)',         factor: 1.00 },
    { label: 'Sponsored (Client script)',       factor: 1.15 },
    { label: 'Co-created brand collab',         factor: 1.20 },  // NEW
    { label: 'Gameplay / Playtest review',      factor: 1.25 },  // NEW (Xsolla-class)
    { label: 'Educational / Tutorial',          factor: 1.10 },  // NEW
  ],
  engagement: [
    { label: '<2% — Below baseline',            factor: 0.85 },  // NEW (more granular)
    { label: '2–3% — Baseline (low)',           factor: 0.95 },  // NEW
    { label: '3–5% — Solid',                    factor: 1.00 },
    { label: '5–7% — Above avg',                factor: 1.10 },
    { label: '7–10% — Strong',                  factor: 1.20 },
    { label: '10–15% — Elite',                  factor: 1.30 },  // NEW
    { label: '>15% — Outlier (rare)',           factor: 1.45 },  // NEW
  ],
  audience: [
    { label: 'Gaming-adjacent',                 factor: 1.00 },
    { label: 'Gaming-core',                     factor: 1.15 },
    { label: 'Elite brand-fit',                 factor: 1.25 },
    { label: 'KSA / Saudi mass',                factor: 1.20 },  // NEW
    { label: 'MENA Arabic gaming',              factor: 1.18 },  // NEW
    { label: 'GCC premium / affluent',          factor: 1.15 },  // NEW
    { label: 'Tech-savvy / device buyers',      factor: 1.12 },  // NEW
    { label: 'Family-friendly mass',            factor: 0.95 },  // NEW
  ],
  // Seasonality (Migration 040). EWC + Ramadan + game-launch granular bands.
  seasonality: [
    { label: 'Off-season / dead window',        factor: 0.90 },  // NEW
    { label: 'Regular season',                  factor: 1.00 },
    { label: 'Pre-event hype window',           factor: 1.10 },  // NEW
    { label: 'Brand peak (Black Friday etc)',   factor: 1.20 },  // NEW
    { label: 'Ramadan window',                  factor: 1.25 },  // NEW
    { label: 'Major / Worlds / Regional finals', factor: 1.30 },
    { label: 'Game launch week',                factor: 1.35 },  // NEW
    { label: 'Finals / Championship night',     factor: 1.45 },
    { label: 'Esports World Cup (KSA-hosted)',  factor: 1.50 },  // NEW (the big one)
  ],
  // Language (Migration 040). Dialect-aware. Khaleeji is the Saudi-resonant
  // bump because mass-market Saudi brands prefer it over MSA.
  language: [
    { label: 'English',                         factor: 1.00 },
    { label: 'Arabic — MSA',                    factor: 1.05 },
    { label: 'Arabic — Khaleeji (Saudi/Gulf)',  factor: 1.20 },  // NEW
    { label: 'Arabic — Egyptian',               factor: 1.10 },  // NEW
    { label: 'Arabic — Levantine',              factor: 1.05 },  // NEW
    { label: 'Bilingual (EN + AR)',             factor: 1.25 },
    { label: 'Trilingual (EN + AR + EN-CC)',    factor: 1.30 },  // NEW
    { label: 'Spanish',                         factor: 1.05 },
    { label: 'Portuguese',                      factor: 1.05 },
    { label: 'French',                          factor: 1.05 },
    { label: 'Russian',                         factor: 1.00 },
    { label: 'Korean',                          factor: 1.05 },
  ],
  authority: [
    { label: 'Normal',                          factor: 1.00 },
    { label: 'Proven / Established',            factor: 1.15 },
    { label: 'Elite Contender',                 factor: 1.30 },
    { label: 'Global Star / Major Winner',      factor: 1.50 },
    { label: 'Iconic / Hall-of-Fame',           factor: 1.70 },  // NEW
  ],
  // Stream activity — last 30 days (Kick/Twitch). Migration 040.
  // Apply only on stream-type deliverables; non-stream lines keep neutral.
  streamActivity: [
    { label: 'Inactive (0 hr / 30d)',           factor: 0.70 },
    { label: 'Light (1–10 hr / 30d)',           factor: 0.90 },
    { label: 'Regular (10–30 hr / 30d)',        factor: 1.00 },
    { label: 'Active (30–60 hr / 30d)',         factor: 1.10 },
    { label: 'Heavy streamer (60+ hr / 30d)',   factor: 1.25 },
    { label: 'Pro full-time (100+ hr / 30d)',   factor: 1.40 },
  ],
  // ── Migration 042 — World-class axes ─────────────────────────────────
  // Audience country mix vs brand target market (% audience in target).
  audCountryMix: [
    { label: 'Mismatched <20% in target',       factor: 0.70 },
    { label: 'Crossover 20–40%',                factor: 1.00 },
    { label: 'Aligned 40–70%',                  factor: 1.20 },
    { label: 'Strongly aligned >70%',           factor: 1.40 },
  ],
  audAgeDemo: [
    { label: 'Youth-skewed 13–24',              factor: 0.85 },
    { label: 'Mainstream 18–34',                factor: 1.00 },
    { label: 'Premium 25–44 (high-spend)',      factor: 1.20 },
  ],
  integrationDepth: [
    { label: 'Passive (logo visible)',          factor: 0.90 },
    { label: 'Active (talent uses product)',    factor: 1.00 },
    { label: 'Endorsement (talent vouches)',    factor: 1.20 },
    { label: 'Long-term ambassador',            factor: 1.45 },
  ],
  firstLook: [
    { label: 'Standard (no exclusivity)',       factor: 1.00 },
    { label: '48h regional first',              factor: 1.20 },
    { label: '24h global first',                factor: 1.40 },
    { label: 'Launch-day exclusive (full day)', factor: 1.65 },
  ],
  realTimeLive: [
    { label: 'Standard (recorded / scheduled)', factor: 1.00 },
    { label: 'Live during talent\'s match',     factor: 1.30 },
    { label: 'Trophy moment / win celebration', factor: 1.50 },
  ],
  lifestyleContext: [
    { label: 'At-home casual',                  factor: 0.95 },
    { label: 'Training facility (Falcons HQ)',  factor: 1.00 },
    { label: 'Lifestyle (gym/travel/event)',    factor: 1.10 },
  ],
  brandSafety: [
    { label: 'Low (<0.6) — risky for premium',  factor: 0.85 },
    { label: 'Standard (0.6–0.85)',             factor: 1.00 },
    { label: 'Premium (>0.85) — family-safe',   factor: 1.10 },
  ],
  collabSize: [
    { label: 'Solo',                            factor: 1.00 },
    { label: 'Duo (2 talents)',                 factor: 0.85 },
    { label: 'Trio (3 talents)',                factor: 0.75 },
    { label: 'Squad (4+ talents)',              factor: 0.65 },
  ],
  signatureAssetLock: [   // Stretch addon, not socialPrice multiplier — surfaced in addons UI
    { label: 'None',                            factor: 0.00 },
    { label: 'Asset lock — 30d',                factor: 0.30 },
    { label: 'Asset lock — 90d',                factor: 0.60 },
    { label: 'Asset lock — 6mo',                factor: 1.20 },
    { label: 'Asset lock — 12mo',               factor: 2.00 },
  ],
  brandCategoryExclusivity: [   // Stretch addon
    { label: 'None',                            factor: 0.00 },
    { label: 'Category exclusive — 30d',        factor: 0.15 },
    { label: 'Category exclusive — 90d',        factor: 0.35 },
    { label: 'Category exclusive — 180d',       factor: 0.60 },
    { label: 'Category exclusive — 12mo',       factor: 1.10 },
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

/** Player rights bundles (Migration 040). Same shape as creator catalog
 * but tuned for player deliverables (longer usage, broader exclusivity). */
export const PLAYER_RIGHTS_BUNDLES = [
  { label: 'None',                          uplift: 0.00 },
  { label: 'Organic repost — 30d',          uplift: 0.08 },
  { label: 'Organic repost — 90d',          uplift: 0.15 },
  { label: 'Organic repost — 180d',         uplift: 0.25 },
  { label: 'Paid usage — 30d',              uplift: 0.30 },
  { label: 'Paid usage — 90d',              uplift: 0.65 },
  { label: 'Paid usage — 180d',             uplift: 1.10 },
  { label: 'Paid usage — 12mo',             uplift: 1.80 },
  { label: 'Whitelisting — 30d',            uplift: 0.40 },
  { label: 'Whitelisting — 90d',            uplift: 1.00 },
  { label: 'Cross-platform paid — 90d',     uplift: 0.85 },
  { label: 'Cross-platform paid — 180d',    uplift: 1.40 },
  { label: 'Owned channels (web/email)',    uplift: 0.10 },
  { label: 'OOH / Print ad — 6mo',          uplift: 0.50 },
  { label: 'OOH / Print ad — 12mo',         uplift: 1.00 },
  { label: 'TV / Broadcast — single market', uplift: 1.20 },
  { label: 'TV / Broadcast — global',       uplift: 2.50 },
  { label: 'All owned + paid — 90d',        uplift: 1.30 },
  { label: 'All owned + paid — 12mo',       uplift: 2.20 },
];

/** Player extra add-ons (Migration 040). Exclusivity, rush, co-brand, custom. */
export const PLAYER_EXTRA_ADDONS = [
  { label: 'None',                          uplift: 0.00 },
  // Exclusivity windows
  { label: 'Exclusivity — 30d',             uplift: 0.20 },
  { label: 'Exclusivity — 90d',             uplift: 0.45 },
  { label: 'Exclusivity — 180d',            uplift: 0.75 },
  { label: 'Exclusivity — 12mo',            uplift: 1.30 },
  { label: 'Category exclusive — 90d',      uplift: 0.30 },
  { label: 'Category exclusive — 180d',     uplift: 0.55 },
  // Rush
  { label: 'Rush — 72h',                    uplift: 0.10 },
  { label: 'Rush — 48h',                    uplift: 0.20 },
  { label: 'Rush — 24h',                    uplift: 0.35 },
  { label: 'Rush — same-day',               uplift: 0.50 },
  // Co-brand
  { label: 'Co-brand — minor (logo on)',    uplift: 0.10 },
  { label: 'Co-brand — major (joint creative)', uplift: 0.25 },
  { label: 'Co-brand — hero (talent + brand HQ)', uplift: 0.50 },
  // Custom production
  { label: 'Branded backdrop / set',        uplift: 0.15 },
  { label: 'Product placement / hero shot', uplift: 0.20 },
  { label: 'Scripted creative direction',   uplift: 0.10 },
  { label: 'Raw footage delivered',         uplift: 0.15 },
  { label: 'Extra cut-downs (3-5 versions)', uplift: 0.15 },
  // Multi-talent / multi-shoot bundles
  { label: 'Multi-talent campaign discount', uplift: -0.10 },
  { label: 'Multi-month always-on',         uplift: -0.15 },
];

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

/** ──────────────────────────────────────────────────────────────────────────
 * Esports Influencer axis catalog (Migration 040).
 * Hybrid: borrows player Engagement/Seasonality/Language but uses creator-
 * style Audience sectors and conversion-focused Authority. Shared catalog
 * for esports influencers (game='Esports Influencers' or role='Influencer').
 */
export const ESPORTS_INFLUENCER_AXIS_OPTIONS = {
  contentType: AXIS_OPTIONS.contentType,
  engagement:  AXIS_OPTIONS.engagement,
  audience: [
    { label: 'Esports core',                   factor: 1.10 },
    { label: 'Pro-team fan base',              factor: 1.15 },
    { label: 'Casual gamer',                   factor: 1.00 },
    { label: 'KSA / Saudi gaming mass',        factor: 1.20 },
    { label: 'MENA Arabic gaming',             factor: 1.18 },
    { label: 'GCC premium / affluent gamers',  factor: 1.15 },
    { label: 'Tech / Devices crossover',       factor: 1.10 },
    { label: 'Streaming-native (Twitch/Kick)', factor: 1.08 },
    { label: 'Cross-vertical (variety)',       factor: 1.00 },
    { label: 'Family-safe gaming',             factor: 1.05 },
  ],
  authority: [
    { label: 'Standard influencer',            factor: 1.00 },
    { label: 'Trusted niche voice',            factor: 1.10 },
    { label: 'Community pillar',               factor: 1.20 },
    { label: 'Category-defining hero',         factor: 1.35 },
    { label: 'Gaming-mainstream icon',         factor: 1.50 },
  ],
  language:        AXIS_OPTIONS.language,
  seasonality:     AXIS_OPTIONS.seasonality,
  production:      AXIS_OPTIONS.production,
  objective:       AXIS_OPTIONS.objective,
  streamActivity:  AXIS_OPTIONS.streamActivity,
  // Migration 042 — shared world-class axes
  audCountryMix:    AXIS_OPTIONS.audCountryMix,
  audAgeDemo:       AXIS_OPTIONS.audAgeDemo,
  integrationDepth: AXIS_OPTIONS.integrationDepth,
  firstLook:        AXIS_OPTIONS.firstLook,
  realTimeLive:     AXIS_OPTIONS.realTimeLive,
  lifestyleContext: AXIS_OPTIONS.lifestyleContext,
  brandSafety:      AXIS_OPTIONS.brandSafety,
  collabSize:       AXIS_OPTIONS.collabSize,
  signatureAssetLock:        AXIS_OPTIONS.signatureAssetLock,
  brandCategoryExclusivity:  AXIS_OPTIONS.brandCategoryExclusivity,
  // Esports-influencer specific (Migration 042)
  streamingConsistency: [
    { label: 'Inconsistent (<3 months)',      factor: 0.90 },
    { label: 'Building (3–12 months)',        factor: 1.00 },
    { label: 'Consistent (12+ months)',       factor: 1.10 },
    { label: 'Veteran (24+ months)',          factor: 1.20 },
  ],
  chatHealth: [
    { label: 'Toxic / unmoderated',           factor: 0.80 },
    { label: 'Mixed',                         factor: 0.95 },
    { label: 'Clean / well-moderated',        factor: 1.05 },
    { label: 'Curated / premium-safe',        factor: 1.15 },
  ],
  subscriberBand: [   // Twitch/Kick subs (paying audience)
    { label: '<500 subs',                     factor: 0.90 },
    { label: '500–2k subs',                   factor: 1.00 },
    { label: '2k–10k subs',                   factor: 1.15 },
    { label: '10k+ subs',                     factor: 1.30 },
  ],
  crossGameVersatility: [
    { label: 'Single-game specialist',        factor: 0.95 },
    { label: '2-game streamer',               factor: 1.00 },
    { label: 'Variety streamer (3+)',         factor: 1.10 },
  ],
  charityHistory: [
    { label: 'No charity stream history',     factor: 1.00 },
    { label: '1–3 charity streams',           factor: 1.05 },
    { label: 'Regular charity / ESG-aligned', factor: 1.15 },
  ],
  communityHealth: [
    { label: 'Low / inactive Discord',        factor: 0.95 },
    { label: 'Average community',             factor: 1.00 },
    { label: 'Active Discord / off-platform', factor: 1.08 },
    { label: 'Thriving (10k+ active members)', factor: 1.18 },
  ],
  dataCompleteness: AXIS_OPTIONS.dataCompleteness,
};

/** Helper — pick the right axis catalog based on talent type */
export function axisOptionsForTalent(
  kind: 'player' | 'creator' | 'esports_influencer',
) {
  if (kind === 'creator')           return CREATOR_AXIS_OPTIONS;
  if (kind === 'esports_influencer') return ESPORTS_INFLUENCER_AXIS_OPTIONS;
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
