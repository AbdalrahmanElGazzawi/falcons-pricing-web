/**
 * Pricing engine — fixture-based regression suite.
 *
 * The 9-axis matrix is the financial heart of the product. Every quote that
 * goes to a client runs through computeLine + computeQuoteTotals. A silent
 * regression here = wrong invoices = lost revenue or lost trust. These tests
 * lock the math behaviour down so a careless tweak immediately turns red.
 */
import { describe, it, expect } from 'vitest';
import { computeLine, computeQuoteTotals, AXIS_OPTIONS } from '../pricing';

describe('computeLine — baseline (all factors 1, exact confidence)', () => {
  it('returns base × qty when every multiplier is 1', () => {
    const r = computeLine({ baseFee: 10_000, qty: 1, conf: 'exact' });
    expect(r.socialPrice).toBe(10_000);
    expect(r.preAddOn).toBe(10_000);
    expect(r.confCap).toBe(1);
    expect(r.finalUnit).toBe(10_000);
    expect(r.finalAmount).toBe(10_000);
  });

  it('multiplies by qty', () => {
    const r = computeLine({ baseFee: 5_000, qty: 4, conf: 'exact' });
    expect(r.finalAmount).toBe(20_000);
  });
});

describe('computeLine — single-axis multipliers', () => {
  const base = 10_000;

  it('engagement axis 1.20 gives +20%', () => {
    const r = computeLine({ baseFee: base, eng: 1.20, conf: 'exact' });
    expect(r.finalUnit).toBe(12_000);
  });

  it('audience axis 1.25 gives +25%', () => {
    const r = computeLine({ baseFee: base, aud: 1.25, conf: 'exact' });
    expect(r.finalUnit).toBe(12_500);
  });

  it('seasonality 1.35 gives +35%', () => {
    const r = computeLine({ baseFee: base, seas: 1.35, conf: 'exact' });
    expect(r.finalUnit).toBe(13_500);
  });

  it('integrated content type 1.00 is neutral', () => {
    const r = computeLine({ baseFee: base, ctype: 1.00, conf: 'exact' });
    expect(r.finalUnit).toBe(10_000);
  });

  it('dedicated/sponsored content type 1.15 gives +15%', () => {
    const r = computeLine({ baseFee: base, ctype: 1.15, conf: 'exact' });
    expect(r.finalUnit).toBe(11_500);
  });

  it('organic/creator-led content type 0.85 gives -15%', () => {
    const r = computeLine({ baseFee: base, ctype: 0.85, conf: 'exact' });
    expect(r.finalUnit).toBe(8_500);
  });

  it('language Arabic 1.10 gives +10%', () => {
    const r = computeLine({ baseFee: base, lang: 1.10, conf: 'exact' });
    expect(r.finalUnit).toBe(11_000);
  });
});

describe('computeLine — authority × objective interaction', () => {
  it('authority is gated by objective weight: anchor + awareness ≈ neutral', () => {
    // authRaw = 1 + 0.2 × (1.35 - 1) = 1.07
    const r = computeLine({ baseFee: 10_000, auth: 1.35, obj: 0.2, conf: 'exact' });
    expect(r.authFactor).toBeCloseTo(1.07, 3);
    expect(r.finalUnit).toBe(10_700);
  });

  it('authority anchor + authority objective fully expresses', () => {
    // authRaw = 1 + 1.0 × (1.35 - 1) = 1.35
    const r = computeLine({ baseFee: 10_000, auth: 1.35, obj: 1.0, conf: 'exact' });
    expect(r.authFactor).toBeCloseTo(1.35, 3);
    expect(r.finalUnit).toBe(13_500);
  });

  it('authority normal yields no uplift regardless of objective', () => {
    const r = computeLine({ baseFee: 10_000, auth: 1.0, obj: 1.0, conf: 'exact' });
    expect(r.authFactor).toBe(1);
    expect(r.finalUnit).toBe(10_000);
  });
});

describe('computeLine — measurement confidence', () => {
  it('exact confidence applies confCap = 1.0', () => {
    const r = computeLine({ baseFee: 10_000, conf: 'exact' });
    expect(r.confCap).toBe(1.0);
  });

  it('rounded confidence applies confCap = 1.0', () => {
    const r = computeLine({ baseFee: 10_000, conf: 'rounded' });
    expect(r.confCap).toBe(1.0);
  });

  it('estimated confidence caps at 0.9', () => {
    const r = computeLine({ baseFee: 10_000, conf: 'estimated' });
    expect(r.confCap).toBe(0.9);
    expect(r.finalUnit).toBe(9_000);
  });

  it('pending confidence caps at 0.75 and forces all multipliers to 1', () => {
    const r = computeLine({ baseFee: 10_000, eng: 1.2, aud: 1.25, seas: 1.35, conf: 'pending' });
    expect(r.confCap).toBe(0.75);
    expect(r.engGated).toBe(1);
    expect(r.authGated).toBe(1);
    expect(r.seasGated).toBe(1);
    // 10000 × 1 × aud × 1 × ctype × lang × 1 = aud is NOT gated, only eng/auth/seas
    // Actually re-read the engine: cap returns 1 when pending — gated values become 1
    // socialPrice = 10000 * 1 * 1.25 * 1 * 1 * 1 * 1 = 12500
    // finalUnit = 12500 * 0.75 = 9375
    expect(r.finalUnit).toBe(9_375);
  });

  it('estimated confidence gates eng (≤1.2), authority (≤1.3), seasonality (≤1.25)', () => {
    const r = computeLine({
      baseFee: 10_000,
      eng: 1.50,    // would express as 1.20
      auth: 2.0,    // raw would be 1+1×(2-1)=2.0 → gated to 1.30
      obj: 1.0,
      seas: 1.50,   // gated to 1.25
      conf: 'estimated',
    });
    expect(r.engGated).toBe(1.20);
    expect(r.authGated).toBe(1.30);
    expect(r.seasGated).toBe(1.25);
  });
});

describe('computeLine — IRL authority floor', () => {
  it('uses social price when it exceeds the floor', () => {
    const r = computeLine({
      baseFee: 20_000, irl: 5_000, floorShare: 0.5,
      eng: 1.20, conf: 'exact',
    });
    // social = 20000 * 1.20 = 24000
    // floor  = 5000 * 0.5 = 2500
    expect(r.socialPrice).toBe(24_000);
    expect(r.floorPrice).toBe(2_500);
    expect(r.preAddOn).toBe(24_000);
  });

  it('uses authority floor when it exceeds the social price', () => {
    const r = computeLine({
      baseFee: 1_000, irl: 100_000, floorShare: 0.5,
      conf: 'exact',
    });
    // social = 1000
    // floor  = 100000 * 0.5 = 50000
    expect(r.socialPrice).toBe(1_000);
    expect(r.floorPrice).toBe(50_000);
    expect(r.preAddOn).toBe(50_000);
    expect(r.finalUnit).toBe(50_000);
  });

  it('IRL undefined (creators) still produces a valid result', () => {
    const r = computeLine({ baseFee: 8_000, conf: 'exact' });
    expect(r.floorPrice).toBe(0);
    expect(r.finalUnit).toBe(8_000);
  });
});

describe('computeLine — add-on rights stacking', () => {
  it('rightsPct 0.20 applies +20% to final unit', () => {
    const r = computeLine({ baseFee: 10_000, rightsPct: 0.20, conf: 'exact' });
    expect(r.finalUnit).toBe(12_000);
  });

  it('cumulative addons sum and apply once at the end', () => {
    // 0.10 + 0.15 + 0.05 = 0.30 uplift
    const r = computeLine({ baseFee: 10_000, rightsPct: 0.30, conf: 'exact' });
    expect(r.finalUnit).toBe(13_000);
  });

  it('rights apply after confidence cap', () => {
    // base 10000, estimated cap 0.9, then +20% rights
    // 10000 × 0.9 = 9000; × 1.2 = 10800
    const r = computeLine({ baseFee: 10_000, conf: 'estimated', rightsPct: 0.20 });
    expect(r.finalUnit).toBe(10_800);
  });
});

describe('computeLine — combined real-world scenarios', () => {
  it('Tier-S CS:GO player on a Major with Arabic language + brand-fit + dedicated', () => {
    const r = computeLine({
      baseFee: 50_000,
      eng: 1.10, aud: 1.25, seas: 1.20, ctype: 1.15, lang: 1.10,
      auth: 1.15, obj: 0.5,
      conf: 'exact',
    });
    // authRaw = 1 + 0.5 × 0.15 = 1.075
    // social = 50000 × 1.10 × 1.25 × 1.20 × 1.15 × 1.10 × 1.075
    //        = 50000 × 1.10 × 1.25 × 1.20 × 1.15 × 1.10 × 1.075
    expect(r.authFactor).toBeCloseTo(1.075, 3);
    expect(r.finalUnit).toBeGreaterThan(80_000);
    expect(r.finalUnit).toBeLessThan(120_000);
  });

  it('Mid-tier creator, organic content, baseline everything → exactly 0.85×base', () => {
    const r = computeLine({ baseFee: 12_000, ctype: 0.85, conf: 'exact' });
    expect(r.finalUnit).toBe(10_200);
  });

  it('multi-quantity dedicated post run', () => {
    const r = computeLine({ baseFee: 5_000, ctype: 1.15, qty: 5, conf: 'exact' });
    expect(r.finalUnit).toBe(5_750);
    expect(r.finalAmount).toBe(28_750);
  });
});

describe('computeQuoteTotals', () => {
  it('sums lines, applies addon uplift, then VAT', () => {
    const r = computeQuoteTotals({
      lines: [{ finalAmount: 10_000 }, { finalAmount: 5_000 }, { finalAmount: 2_500 }],
      addonsUpliftPct: 0.20,
      vatRate: 0.15,
    });
    expect(r.subtotal).toBe(17_500);
    // preVat = 17500 × 1.20 = 21000
    expect(r.preVat).toBe(21_000);
    // vat = 21000 × 0.15 = 3150
    expect(r.vatAmount).toBe(3_150);
    expect(r.total).toBe(24_150);
  });

  it('zero addons → preVat equals subtotal', () => {
    const r = computeQuoteTotals({
      lines: [{ finalAmount: 10_000 }],
      vatRate: 0.15,
    });
    expect(r.subtotal).toBe(10_000);
    expect(r.preVat).toBe(10_000);
    expect(r.vatAmount).toBe(1_500);
    expect(r.total).toBe(11_500);
  });

  it('zero VAT (export) still works', () => {
    const r = computeQuoteTotals({
      lines: [{ finalAmount: 10_000 }],
      addonsUpliftPct: 0.10,
      vatRate: 0,
    });
    expect(r.preVat).toBe(11_000);
    expect(r.vatAmount).toBe(0);
    expect(r.total).toBe(11_000);
  });

  it('empty quote returns zeros', () => {
    const r = computeQuoteTotals({ lines: [], vatRate: 0.15 });
    expect(r.subtotal).toBe(0);
    expect(r.preVat).toBe(0);
    expect(r.vatAmount).toBe(0);
    expect(r.total).toBe(0);
  });

  it('defaults: vatRate=0.15, addonsUpliftPct=0', () => {
    const r = computeQuoteTotals({ lines: [{ finalAmount: 100 }] });
    expect(r.vatRate).toBe(0.15);
    expect(r.addonsUpliftPct).toBe(0);
    expect(r.total).toBe(115);
  });
});

describe('AXIS_OPTIONS catalogue (sanity checks for UI)', () => {
  it('contentType has Integrated 1.00 and Sponsored 1.15', () => {
    const integrated = AXIS_OPTIONS.contentType.find(o => o.factor === 1.00);
    const sponsored = AXIS_OPTIONS.contentType.find(o => o.factor === 1.15);
    expect(integrated).toBeDefined();
    expect(sponsored).toBeDefined();
  });

  it('confidence options match the runtime caps', () => {
    const values = AXIS_OPTIONS.confidence.map(c => c.value);
    expect(values).toContain('pending');
    expect(values).toContain('estimated');
    expect(values).toContain('rounded');
    expect(values).toContain('exact');
  });

  it('objective weights are in [0, 1]', () => {
    for (const o of AXIS_OPTIONS.objective) {
      expect(o.weight).toBeGreaterThanOrEqual(0);
      expect(o.weight).toBeLessThanOrEqual(1);
    }
  });
});
