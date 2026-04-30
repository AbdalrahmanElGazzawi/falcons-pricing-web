import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import path from 'node:path';
import fs from 'node:fs';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/auth';

export const runtime = 'nodejs';

// Brand colours
const GREEN = '#2ED06E';
const GREEN_DARK = '#1D9E75';
const NAVY = '#0B2340';
const INK = '#0F172A';
const LABEL = '#475569';
const MUTE = '#94A3B8';
const LIGHT = '#F1F5F9';
const LINE = '#E2E8F0';

// FX-aware formatter — SAR canonical → presentation currency.
// fmtMoney now also converts when given USD + rate (was a no-op before).
function fmtFX(sarAmount: number, ccy: string, rate: number): string {
  const n = Number(sarAmount) || 0;
  if (ccy === 'USD') {
    const usd = rate > 0 ? n / rate : n;
    return `$ ${Math.round(usd).toLocaleString('en-US')}`;
  }
  if (ccy === 'AED') return `AED ${Math.round(n).toLocaleString('en-US')}`;
  return `SAR ${Math.round(n).toLocaleString('en-US')}`;
}
// Local fmtMoney shim — proxies to fmtFX so internal callers convert correctly.
// Default rate is the Saudi peg (3.75) which is what older code assumed.
function fmtMoney(n: number, ccy = 'SAR', rate = 3.75) {
  return fmtFX(Number(n) || 0, ccy, rate);
}
function fmtPct(n: number) { return `${(n * 100).toFixed(0)}%`; }
function fmtMult(n: number) { return `${Number(n).toFixed(2)}×`; }
function dateStr(iso?: string) { return iso ? new Date(iso).toLocaleDateString('en-GB') : '—'; }

import { labelForFactor } from '@/lib/pricing';

// Map an axis multiplier to a human label — talent-aware (uses labelForFactor from pricing engine).
function axisLabel(axis: string, value: number, kind: 'player' | 'creator' = 'player'): string {
  const round = (v: number) => Math.round(v * 100) / 100;
  const v = round(value);
  // Translate short axis key → labelForFactor's expected key
  const axisMap: Record<string, 'engagement'|'audience'|'authority'|'language'|'seasonality'|'production'|'contentType'> = {
    eng: 'engagement',
    aud: 'audience',
    seas: kind === 'creator' ? 'production' : 'seasonality',
    ctype: 'contentType',
    lang: 'language',
    auth: 'authority',
  };
  const k = axisMap[axis];
  if (!k) return fmtMult(v);
  const lbl = labelForFactor(k, v, kind);
  if (lbl.includes('×')) return lbl; // unmatched fallback
  return `${lbl} (${fmtMult(v)})`;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const sb = createServiceClient();

  let quote;
  if (token) {
    const { data } = await sb.from('quotes').select('*').eq('client_token', token).single();
    quote = data;
  } else {
    const { denied } = await requireAuth();
    if (denied) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    const { data } = await sb.from('quotes').select('*').eq('id', params.id).single();
    quote = data;
  }
  if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: lines } = await sb.from('quote_lines').select('*').eq('quote_id', quote.id).order('sort_order');

  // Allow ?ccy=USD|SAR&rate=N to override the stored currency / FX at render time.
  // Internal use only — the public client portal (token path) sticks with the saved
  // currency + rate to avoid rep-side ambiguity.
  const ccyOverride = (url.searchParams.get('ccy') || '').toUpperCase();
  const rateOverrideRaw = url.searchParams.get('rate');
  const rateOverride = rateOverrideRaw ? Number(rateOverrideRaw) : NaN;
  const currency = (token ? null : (ccyOverride === 'USD' || ccyOverride === 'SAR' ? ccyOverride : null))
    || quote.currency
    || 'SAR';
  const usdRate = (!token && Number.isFinite(rateOverride) && rateOverride > 0)
    ? rateOverride
    : Number(quote.usd_rate || 3.75);
  const vatRate = Number(quote.vat_rate || 0.15);
  const subtotal = Number(quote.pre_vat || quote.subtotal || 0);
  const vatAmount = Number(quote.vat_amount || subtotal * vatRate);
  const total = Number(quote.total || subtotal + vatAmount);

  const preparedName = quote.prepared_by_name || '';
  const preparedTitle = quote.prepared_by_title || '';
  const preparedEmail = quote.prepared_by_email || quote.owner_email || '';
  const approvedName = quote.approved_by_name || '';
  const approvedEmail = quote.approved_by_email || '';
  const approvedAt = quote.approved_at;

  // Billing detail fields (added 2026-04-30 to mirror Falcons Odoo quotation layout).
  const clientAddress = (quote.client_address || '').toString();
  const clientVat = (quote.client_vat_number || '').toString();
  const clientCountry = (quote.client_country || '').toString();
  const paymentTerms = (quote.payment_terms || 'Immediate Payment').toString();

  // Expiration: explicit value, else default to issue date + 9 days (matches Odoo default).
  const issuedAt = quote.sent_at || quote.created_at;
  const expiresAt = quote.expires_at
    ? new Date(quote.expires_at)
    : (issuedAt ? new Date(new Date(issuedAt).getTime() + 9 * 86400000) : null);

  // Falcons company info — static legal block. Matches CR / VAT on the Odoo invoices.
  const FALCONS_COMPANY = {
    nameAr: 'شركة فالكون الرياضية',
    countryAr: 'المملكة العربية السعودية',
    addrLine1: '7661, King Abdulaziz Rd',
    addrLine2: 'Riyadh, Al-Yasmeen',
    crLabel: 'س.ج 1010653211',
    vat: '311123387600003',
  };

  // Static bank block — same account printed on existing Falcons quotations.
  const BANK = {
    holder: 'شركة فالكون الرياضية',
    name: 'Bank Albilad',
    account: '436132655700028',
    iban: 'SA4315000436132655700028',
    swift: 'ALBISARIXXX',
  };

  const doc = new PDFDocument({ size: 'A4', margin: 0 });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>(resolve => doc.on('end', () => resolve(Buffer.concat(chunks))));

  const W = doc.page.width;
  const H = doc.page.height;
  const MARGIN = 40;

  // ═══ COVER PAGE ═══════════════════════════════════════════════════════════
  // Full-bleed navy backdrop with brand-side accents and the headline figures.
  doc.rect(0, 0, W, H).fill(NAVY);
  // top accent strip
  doc.rect(0, 0, W, 6).fill(GREEN);
  // bottom accent strip
  doc.rect(0, H - 6, W, 6).fill(GREEN);
  // soft decorative circles (top-right, bottom-left) for depth
  doc.circle(W - 80, 90, 130).fillOpacity(0.06).fill('#FFFFFF').fillOpacity(1);
  doc.circle(60, H - 100, 100).fillOpacity(0.04).fill('#FFFFFF').fillOpacity(1);

  // Logo (big, centered horizontally)
  try {
    const logoPath = path.join(process.cwd(), 'public', 'falcon-mark.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, W / 2 - 50, 80, { width: 100, height: 100 });
    }
  } catch {}

  // Brand wordmark
  doc.fillColor('white').font('Helvetica-Bold').fontSize(28)
    .text('TEAM FALCONS', 0, 200, { width: W, align: 'center', characterSpacing: 1 });
  doc.fillColor('#94A3B8').font('Helvetica').fontSize(10)
    .text('PRICING OS  ·  ESPORTS TALENT QUOTATION', 0, 234, { width: W, align: 'center', characterSpacing: 2 });

  // Divider
  doc.rect(W / 2 - 30, 268, 60, 2).fill(GREEN);

  // QUOTATION — massive
  doc.fillColor('white').font('Helvetica-Bold').fontSize(56)
    .text('QUOTATION', 0, 290, { width: W, align: 'center', characterSpacing: 4 });

  // Client name
  doc.fillColor('#cbd5e1').font('Helvetica').fontSize(11)
    .text('PREPARED FOR', 0, 380, { width: W, align: 'center', characterSpacing: 2 });
  doc.fillColor('white').font('Helvetica-Bold').fontSize(24)
    .text(quote.client_name || '—', 0, 400, { width: W, align: 'center' });
  if (quote.campaign) {
    doc.fillColor('#94A3B8').font('Helvetica').fontSize(11)
      .text('CAMPAIGN', 0, 444, { width: W, align: 'center', characterSpacing: 2 });
    doc.fillColor('white').font('Helvetica').fontSize(14)
      .text(quote.campaign, 0, 460, { width: W, align: 'center' });
  }

  // Headline TOTAL block — green gradient simulated with stacked rects
  const totalBoxW = 360;
  const totalBoxX = W / 2 - totalBoxW / 2;
  const totalBoxY = 504;
  doc.roundedRect(totalBoxX, totalBoxY, totalBoxW, 90, 10).fill(GREEN_DARK);
  doc.roundedRect(totalBoxX, totalBoxY, totalBoxW, 24, 10).fill(GREEN);
  doc.fillColor('#0B2340').font('Helvetica-Bold').fontSize(8)
    .text('TOTAL  (VAT INCLUSIVE)', totalBoxX, totalBoxY + 8, { width: totalBoxW, align: 'center', characterSpacing: 1.5 });
  doc.fillColor('white').font('Helvetica-Bold').fontSize(28)
    .text(fmtFX(total, currency, usdRate), totalBoxX, totalBoxY + 38, { width: totalBoxW, align: 'center' });

  // Talent mix preview — distinct names as small pills (max 8 visible)
  const distinctNames: string[] = Array.from(new Set((lines || []).map((l: any) => l.talent_name)));
  if (distinctNames.length > 0) {
    doc.fillColor('#94A3B8').font('Helvetica').fontSize(9)
      .text('TALENT MIX', 0, totalBoxY + 110, { width: W, align: 'center', characterSpacing: 1.5 });
    let chipsY = totalBoxY + 128;
    let chipsX = MARGIN;
    const visible = distinctNames.slice(0, 8);
    const widths: number[] = [];
    visible.forEach(n => {
      const w = doc.font('Helvetica').fontSize(10).widthOfString(n) + 18;
      widths.push(w);
    });
    if (distinctNames.length > 8) {
      const more = `+ ${distinctNames.length - 8} more`;
      const w = doc.font('Helvetica').fontSize(10).widthOfString(more) + 18;
      widths.push(w);
      visible.push(more);
    }
    const totalW = widths.reduce((a, b) => a + b + 6, -6);
    chipsX = (W - totalW) / 2;
    visible.forEach((n, i) => {
      doc.roundedRect(chipsX, chipsY, widths[i], 22, 11).fillOpacity(0.12).fill('#FFFFFF').fillOpacity(1);
      doc.fillColor('white').font('Helvetica').fontSize(10)
        .text(n, chipsX, chipsY + 6, { width: widths[i], align: 'center' });
      chipsX += widths[i] + 6;
    });
  }

  // Footer block — quote number, date, prepared by
  const footY = H - 100;
  doc.fillColor('#94A3B8').font('Helvetica').fontSize(8)
    .text('QUOTE #',          MARGIN,           footY,     { characterSpacing: 1.5 });
  doc.fillColor('white').font('Helvetica-Bold').fontSize(12)
    .text(quote.quote_number || '—', MARGIN, footY + 12);

  doc.fillColor('#94A3B8').font('Helvetica').fontSize(8)
    .text('DATE',             W / 2 - 30,       footY,     { characterSpacing: 1.5 });
  doc.fillColor('white').font('Helvetica').fontSize(11)
    .text(dateStr(quote.sent_at || quote.created_at), W / 2 - 30, footY + 13);

  doc.fillColor('#94A3B8').font('Helvetica').fontSize(8)
    .text('PREPARED BY',      W - MARGIN - 140, footY,     { characterSpacing: 1.5, width: 140, align: 'right' });
  doc.fillColor('white').font('Helvetica').fontSize(11)
    .text(preparedName || '—', W - MARGIN - 140, footY + 13, { width: 140, align: 'right' });

  // Start new page for the body
  doc.addPage({ size: 'A4', margin: 0 });

  // ═══ HEADER (gradient navy → green) ═══
  // PDFKit doesn't do real gradients, simulate with stacked rectangles
  doc.rect(0, 0, W, 110).fill(NAVY);
  doc.rect(0, 90, W, 8).fill(GREEN);

  // Logo — bigger, centered vertically
  try {
    const logoPath = path.join(process.cwd(), 'public', 'falcon-mark.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, MARGIN, 18, { width: 60, height: 60 });
    }
  } catch { /* no logo */ }

  // Title block
  doc.fillColor('white').font('Helvetica-Bold').fontSize(22).text('TEAM FALCONS', MARGIN + 76, 28);
  doc.font('Helvetica').fontSize(10).fillColor('#cbd5e1').text('Pricing OS  ·  Esports Talent Quotation', MARGIN + 76, 56);

  // Quote # in top-right (single line — date moves into the dedicated date strip below)
  const trX = W - 220;
  doc.fillColor('#94A3B8').font('Helvetica').fontSize(8).text('QUOTATION #', trX, 30, { characterSpacing: 1.5 });
  doc.fillColor('white').font('Helvetica-Bold').fontSize(16).text(quote.quote_number || '—', trX, 44);

  // ═══ BILLING BLOCK — two columns (matches Odoo template) ═══
  // Left:  Falcons company legal info
  // Right: Client name + address + VAT
  let y = 130;
  const billLeftX = MARGIN;
  const billRightX = W / 2 + 20;
  const billColW = (W - MARGIN * 2) / 2 - 10;

  // Falcons block (left)
  doc.fillColor(LABEL).font('Helvetica').fontSize(8).text('FROM', billLeftX, y, { characterSpacing: 1.5 });
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(11).text(FALCONS_COMPANY.nameAr, billLeftX, y + 12, { width: billColW });
  doc.fillColor(INK).font('Helvetica').fontSize(9.5);
  doc.text(FALCONS_COMPANY.countryAr, billLeftX, y + 28, { width: billColW });
  doc.text(FALCONS_COMPANY.addrLine1, billLeftX, y + 42, { width: billColW });
  doc.text(FALCONS_COMPANY.addrLine2, billLeftX, y + 56, { width: billColW });
  doc.fillColor(LABEL).fontSize(9).text(FALCONS_COMPANY.crLabel, billLeftX, y + 72, { width: billColW });
  doc.text(`VAT: ${FALCONS_COMPANY.vat}`, billLeftX, y + 86, { width: billColW });

  // Client block (right)
  doc.fillColor(LABEL).font('Helvetica').fontSize(8).text('BILL TO', billRightX, y, { characterSpacing: 1.5 });
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(11).text(quote.client_name || '—', billRightX, y + 12, { width: billColW });
  let clientYCursor = y + 28;
  if (clientAddress) {
    doc.fillColor(INK).font('Helvetica').fontSize(9.5);
    const addrHeight = doc.heightOfString(clientAddress, { width: billColW, lineGap: 1 });
    doc.text(clientAddress, billRightX, clientYCursor, { width: billColW, lineGap: 1 });
    clientYCursor += addrHeight + 4;
  }
  if (clientCountry) {
    doc.fillColor(INK).font('Helvetica').fontSize(9.5).text(clientCountry, billRightX, clientYCursor, { width: billColW });
    clientYCursor += 14;
  }
  if (clientVat) {
    doc.fillColor(LABEL).font('Helvetica').fontSize(9).text(`VAT Number: ${clientVat}`, billRightX, clientYCursor, { width: billColW });
    clientYCursor += 14;
  }
  if (preparedEmail && !clientAddress && !clientVat) {
    // Lightweight fallback when no formal billing details captured yet
    doc.fillColor(LABEL).font('Helvetica').fontSize(9).text(`Contact: ${preparedEmail}`, billRightX, clientYCursor, { width: billColW });
    clientYCursor += 14;
  }

  y = Math.max(y + 102, clientYCursor + 8);

  // ═══ DATE / EXPIRATION / SALESPERSON STRIP ═══
  const stripTop = y;
  const stripH = 44;
  doc.rect(MARGIN, stripTop, W - MARGIN * 2, stripH).fillOpacity(0.6).fill(LIGHT).fillOpacity(1);

  const stripCols = [
    { label: 'QUOTATION DATE', value: dateStr(issuedAt) },
    { label: 'EXPIRATION',     value: expiresAt ? dateStr(expiresAt.toISOString()) : '—' },
    { label: 'SALESPERSON',    value: preparedName || '—' },
  ];
  if (approvedName) {
    stripCols.push({ label: 'APPROVED BY', value: approvedName });
  }
  const stripColW = (W - MARGIN * 2) / stripCols.length;
  stripCols.forEach((c, i) => {
    const sx = MARGIN + stripColW * i;
    doc.fillColor(GREEN_DARK).font('Helvetica-Bold').fontSize(8.5).text(c.label, sx + 14, stripTop + 9, { width: stripColW - 16, characterSpacing: 1.2 });
    doc.fillColor(INK).font('Helvetica').fontSize(11).text(c.value, sx + 14, stripTop + 22, { width: stripColW - 16 });
  });
  y = stripTop + stripH + 16;

  // Campaign line (centered subtitle if present)
  if (quote.campaign) {
    doc.fillColor(LABEL).font('Helvetica').fontSize(9).text('CAMPAIGN', MARGIN, y, { characterSpacing: 1.5 });
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(11).text(quote.campaign, MARGIN, y + 12, { width: W - MARGIN * 2 });
    y += 32;
  }

  // ═══ LINE ITEMS TABLE ═══
  const tableX = MARGIN;
  const tableW = W - MARGIN * 2;
  const col = {
    desc: tableX + 10,
    unit: tableX + tableW * 0.55,
    qty:  tableX + tableW * 0.73,
    amt:  tableX + tableW * 0.82,
  };
  const colEnd = tableX + tableW - 10;

  doc.rect(tableX, y, tableW, 24).fill(GREEN_DARK);
  doc.fillColor('white').font('Helvetica-Bold').fontSize(10);
  doc.text('Description', col.desc, y + 8);
  doc.text('Unit cost', col.unit, y + 8, { width: tableW * 0.16, align: 'right' });
  doc.text('Qty', col.qty, y + 8, { width: tableW * 0.07, align: 'right' });
  doc.text('Amount', col.amt, y + 8, { width: colEnd - col.amt, align: 'right' });
  y += 24;

  doc.font('Helvetica').fontSize(10).fillColor(INK);
  const rowH = 22;
  (lines || []).forEach((l: any, idx: number) => {
    if (idx % 2 === 0) doc.rect(tableX, y, tableW, rowH).fill(LIGHT);
    doc.fillColor(INK).font('Helvetica').fontSize(10);
    const tKind = l.talent_type === 'creator' ? 'creator' : 'player';
    const kindBadge = tKind === 'creator' ? 'CREATOR' : 'PLAYER';
    doc.fillColor(INK).font('Helvetica').fontSize(10);
    doc.text(`${l.talent_name} — ${l.platform}`, col.desc, y + 7, { width: tableW * 0.5 });
    // Small uppercase kind chip below the name (subtle)
    doc.fillColor(MUTE).font('Helvetica').fontSize(7).text(kindBadge, col.desc, y + 19, { width: tableW * 0.5 });
    doc.text(fmtMoney(Number(l.final_unit || 0), currency, usdRate), col.unit, y + 7, { width: tableW * 0.16, align: 'right' });
    doc.text(`${Number(l.qty || 1)}`, col.qty, y + 7, { width: tableW * 0.07, align: 'right' });
    doc.text(fmtMoney(Number(l.final_amount || 0), currency, usdRate), col.amt, y + 7, { width: colEnd - col.amt, align: 'right' });
    y += rowH;
  });
  if (!lines || lines.length === 0) {
    doc.fillColor(LABEL).font('Helvetica-Oblique').fontSize(10).text('No line items', col.desc, y + 10);
    y += rowH;
  }
  doc.moveTo(tableX, y).lineTo(tableX + tableW, y).strokeColor(LINE).lineWidth(0.5).stroke();
  y += 22;

  // ═══ PRICING METHODOLOGY (transparent breakdown of the multipliers) ═══
  const methX = tableX;
  const methW = tableW * 0.55;
  const methTop = y;
  doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(10).text('PRICING METHODOLOGY', methX, y);
  y += 14;
  doc.fillColor(LABEL).font('Helvetica').fontSize(8.5);
  const formulaText = 'Final = MAX(Social Price, Authority Floor) × Confidence Cap × (1 + Rights Uplift)';
  const formulaHeight = doc.heightOfString(formulaText, { width: methW, lineGap: 1 });
  doc.text(formulaText, methX, y, { width: methW, lineGap: 1 });
  y += formulaHeight + 8;

  // Campaign-level axes — talent-aware labels
  const hasCreator = (lines || []).some((l: any) => l.talent_type === 'creator');
  const hasPlayer  = (lines || []).some((l: any) => l.talent_type === 'player');
  const dominantKind: 'player' | 'creator' = hasCreator && !hasPlayer ? 'creator' : 'player';
  doc.fillColor(MUTE).font('Helvetica').fontSize(7.5).text(
    hasCreator && hasPlayer ? 'CAMPAIGN AXES (mixed roster)' :
    dominantKind === 'creator' ? 'CAMPAIGN AXES (creator pricing)' : 'CAMPAIGN AXES',
    methX, y
  );
  y += 11;
  const audienceLabel = dominantKind === 'creator' ? 'Audience fit' : 'Audience';
  const seasLabel     = dominantKind === 'creator' ? 'Production'   : 'Seasonality';
  const axes: Array<[string, string, number]> = [
    ['Engagement',  'eng',   Number(quote.eng_factor || 1)],
    [audienceLabel, 'aud',   Number(quote.audience_factor || 1)],
    [seasLabel,     'seas',  Number(quote.seasonality_factor || 1)],
    ['Content',     'ctype', Number(quote.content_type_factor || 1)],
    ['Language',    'lang',  Number(quote.language_factor || 1)],
    ['Authority',   'auth',  Number(quote.authority_factor || 1)],
  ];
  doc.font('Helvetica').fontSize(8.5).fillColor(INK);
  axes.forEach(([name, key, val]) => {
    doc.fillColor(LABEL).text(`${name}:`, methX, y);
    doc.fillColor(INK).text(axisLabel(key, val, dominantKind), methX + 80, y);
    y += 11;
  });
  if (Number(quote.addons_uplift_pct || 0) > 0) {
    doc.fillColor(LABEL).text('Add-on uplift:', methX, y);
    doc.fillColor(INK).text(`+${fmtPct(Number(quote.addons_uplift_pct))}`, methX + 80, y);
    y += 11;
  }
  if (currency === 'USD') {
    doc.fillColor(LABEL).text('FX rate:', methX, y);
    doc.fillColor(INK).text(`${usdRate.toFixed(2)} SAR per 1 USD`, methX + 80, y);
    y += 11;
  }


  // Brand brief block (conditional — only render if anything captured)
  const briefFields: Array<[string, string]> = [];
  if (Array.isArray(quote.demo_target) && quote.demo_target.length > 0)
    briefFields.push(['Demographic', (quote.demo_target as string[]).join(', ')]);
  if (quote.gender_skew && quote.gender_skew !== 'mixed')
    briefFields.push(['Gender skew', String(quote.gender_skew).replace(/^./, c => c.toUpperCase())]);
  if (quote.region) briefFields.push(['Region', quote.region]);
  if (quote.kpi_focus) briefFields.push(['Primary KPI', String(quote.kpi_focus).replace(/^./, c => c.toUpperCase())]);
  if (quote.exclusivity) briefFields.push(['Exclusivity', `${quote.exclusivity_months || ''}mo category lockout`.trim()]);

  if (briefFields.length > 0) {
    doc.fillColor(MUTE).font('Helvetica').fontSize(7.5).text('BRAND BRIEF', methX, y);
    y += 11;
    briefFields.forEach(([name, val]) => {
      doc.fillColor(LABEL).font('Helvetica').fontSize(8.5).text(`${name}:`, methX, y);
      doc.fillColor(INK).font('Helvetica').text(val, methX + 80, y, { width: methW - 80 });
      y += 11;
    });
    y += 4;
  }

  // Notes block on right
  let notesY = methTop;
  const notesX = MARGIN + tableW * 0.58;
  const notesW = tableW * 0.42;
  doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(10).text('SPECIAL NOTES', notesX, notesY);
  notesY += 14;
  doc.fillColor(LABEL).font('Helvetica').fontSize(9);
  const notes = quote.notes ||
    '1. Payment within 30 days\n2. 50% down payment on acceptance\n3. Tax invoice issued upon receipt of payment';
  doc.text(notes, notesX, notesY, { width: notesW, lineGap: 4 });

  // ═══ TOTALS BOX ═══
  y = Math.max(y, notesY) + 24;
  const tBoxW = tableW * 0.45;
  const tBoxX = MARGIN + tableW - tBoxW;

  doc.fillColor(LABEL).font('Helvetica').fontSize(10).text('Untaxed Amount', tBoxX, y);
  doc.fillColor(INK).font('Helvetica-Bold').text(fmtFX(subtotal, currency, usdRate), tBoxX, y, { width: tBoxW, align: 'right' });
  y += 18;
  doc.fillColor(LABEL).font('Helvetica').text(`VAT Taxes (${(vatRate*100).toFixed(0)}%)`, tBoxX, y);
  doc.fillColor(INK).font('Helvetica').text(fmtFX(vatAmount, currency, usdRate), tBoxX, y, { width: tBoxW, align: 'right' });
  y += 22;
  doc.rect(tBoxX, y - 4, tBoxW, 28).fill(GREEN);
  doc.fillColor('white').font('Helvetica-Bold').fontSize(13);
  doc.text('Total', tBoxX + 12, y + 2);
  doc.text(fmtFX(total, currency, usdRate), tBoxX, y + 2, { width: tBoxW - 12, align: 'right' });
  y += 36;

  // ═══ PAYMENT DETAILS BLOCK ═══
  // Mirrors the bank info on the existing Falcons Odoo quotation.
  const payX = MARGIN;
  const payW = tableW * 0.55;
  doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(10).text('PAYMENT DETAILS', payX, y);
  let payY = y + 14;
  const payRow = (label: string, value: string) => {
    doc.fillColor(LABEL).font('Helvetica').fontSize(8.5).text(label, payX, payY, { width: 140 });
    doc.fillColor(INK).font('Helvetica').fontSize(9).text(value, payX + 140, payY, { width: payW - 140 });
    payY += 13;
  };
  payRow("Bank Account Holder's Name:", BANK.holder);
  payRow('Bank Name:', BANK.name);
  payRow('Account #:', BANK.account);
  payRow('IBAN:', BANK.iban);
  payRow('BIC / SWIFT:', BANK.swift);
  payRow('Payment terms:', paymentTerms);

  y = Math.max(y + 36, payY) + 8;

  // ═══ SIGNATURE BLOCKS ═══
  y += 20;
  const sigW = (tableW - 40) / 2;
  const sigLeftX = MARGIN;
  const sigRightX = MARGIN + sigW + 40;

  // Prepared by
  doc.fillColor(MUTE).font('Helvetica').fontSize(7.5).text('PREPARED BY', sigLeftX, y);
  doc.moveTo(sigLeftX, y + 38).lineTo(sigLeftX + sigW, y + 38).strokeColor(INK).lineWidth(0.7).stroke();
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(9.5).text(preparedName || '—', sigLeftX, y + 44);
  if (preparedTitle) {
    doc.fillColor(LABEL).font('Helvetica-Oblique').fontSize(8).text(preparedTitle, sigLeftX, y + 56);
    doc.fillColor(LABEL).font('Helvetica').fontSize(8).text(preparedEmail || '—', sigLeftX, y + 68);
    doc.fillColor(MUTE).fontSize(7.5).text(`Date: ${dateStr(quote.created_at)}`, sigLeftX, y + 80);
  } else {
    doc.fillColor(LABEL).font('Helvetica').fontSize(8).text(preparedEmail || '—', sigLeftX, y + 56);
    doc.fillColor(MUTE).fontSize(7.5).text(`Date: ${dateStr(quote.created_at)}`, sigLeftX, y + 70);
  }

  // Approved by
  doc.fillColor(MUTE).font('Helvetica').fontSize(7.5).text('APPROVED BY', sigRightX, y);
  doc.moveTo(sigRightX, y + 38).lineTo(sigRightX + sigW, y + 38).strokeColor(INK).lineWidth(0.7).stroke();
  if (approvedName) {
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(9.5).text(approvedName, sigRightX, y + 44);
    doc.fillColor(LABEL).font('Helvetica').fontSize(8).text(approvedEmail, sigRightX, y + 56);
    doc.fillColor(MUTE).fontSize(7.5).text(`Date: ${dateStr(approvedAt)}`, sigRightX, y + 70);
  } else {
    doc.fillColor(MUTE).font('Helvetica-Oblique').fontSize(8).text('Pending approval', sigRightX, y + 44);
  }

  // ═══ FOOTER (green band) ═══
  const footerH = 60;
  const footerY = H - footerH;
  doc.rect(0, footerY, W, footerH).fill(GREEN);
  doc.fillColor('white').font('Helvetica').fontSize(9);
  doc.text('King Abdulaziz Road, Riyadh, Saudi Arabia, Al-Yasmeen District', MARGIN, footerY + 8, {
    width: W - MARGIN * 2, align: 'center',
  });
  doc.fontSize(8).fillColor('#e7faf0');
  doc.text('Phone: +966 53370 4233  ·  Sales@falcons.sa  ·  store.falcons.sa', MARGIN, footerY + 22, {
    width: W - MARGIN * 2, align: 'center',
  });
  // VAT / CR strip (mirrors the Odoo PDF "311123387600003 ... FALCONS" line)
  doc.fillColor('white').font('Helvetica-Bold').fontSize(8);
  doc.text(FALCONS_COMPANY.vat, MARGIN, footerY + 40, { characterSpacing: 1 });
  doc.text('FALCONS', 0, footerY + 40, { width: W - MARGIN, align: 'right', characterSpacing: 1.5 });

  doc.end();
  const buf = await done;

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${quote.quote_number || 'quote'}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
