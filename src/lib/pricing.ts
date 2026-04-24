/**
 * Team Falcons Pricing — 9-axis matrix engine.
 * Ported from Apps Script Code.gs (computeLine).
 *
 *  Final = MAX(SocialPrice, AuthorityFloor) × ConfidenceCap × (1 + RightsPct)
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
  const floorPrice = Math.round(
    (p.irl ?? 0) * floorShare * seasGated * lang * authGated
  );

  const preAddOn = Math.max(socialPrice, floorPrice);
  const finalUnitOrganic = Math.round(preAddOn * confCap);
  const finalUnit = Math.round(finalUnitOrganic * (1 + (p.rightsPct ?? 0)));
  const finalAmount = Math.round(finalUnit * qty);

  return {
    authFactor: +authRaw.toFixed(3),
    engGated, authGated, seasGated, confCap,
    socialPrice, floorPrice, preAddOn,
    finalUnit, finalAmount,
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
    { label: 'Normal', factor: 1.00 },
    { label: 'Proven / Established', factor: 1.15 },
    { label: 'Anchor / Benchmark', factor: 1.35 },
  ],
  objective: [
    { label: 'Awareness (Wt 0.2)', weight: 0.2 },
    { label: 'Consideration (Wt 0.5)', weight: 0.5 },
    { label: 'Conversion (Wt 0.7)', weight: 0.7 },
    { label: 'Authority (Wt 1.0)', weight: 1.0 },
  ],
  confidence: [
    { label: 'Pending — no follower data', value: 'pending' as const },
    { label: 'Estimated — partial data', value: 'estimated' as const },
    { label: 'Rounded — manual verification', value: 'rounded' as const },
    { label: 'Exact — Shikenso verified', value: 'exact' as const },
  ],
};
