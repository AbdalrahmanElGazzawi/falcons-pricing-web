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

function fmtMoney(n: number, ccy = 'SAR') {
  return `${ccy} ${Math.round(n).toLocaleString('en-US')}`;
}
// FX-aware formatter — SAR canonical → presentation currency
function fmtFX(sarAmount: number, ccy: string, rate: number): string {
  const n = Number(sarAmount) || 0;
  if (ccy === 'USD') {
    const usd = rate > 0 ? n / rate : n;
    return `$ ${Math.round(usd).toLocaleString('en-US')}`;
  }
  if (ccy === 'AED') return `AED ${Math.round(n).toLocaleString('en-US')}`;
  return `SAR ${Math.round(n).toLocaleString('en-US')}`;
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

  // Allow ?ccy=USD|SAR to override the stored currency at render time. Internal use only —
  // the public client portal still uses the saved currency to avoid rep-side ambiguity.
  const ccyOverride = (url.searchParams.get('ccy') || '').toUpperCase();
  const currency = (token ? null : (ccyOverride === 'USD' || ccyOverride === 'SAR' ? ccyOverride : null))
    || quote.currency
    || 'SAR';
  const usdRate  = Number(quote.usd_rate || 3.75);
  const vatRate = Number(quote.vat_rate || 0.15);
  const subtotal = Number(quote.pre_vat || quote.subtotal || 0);
  const vatAmount = Number(quote.vat_amount || subtotal * vatRate);
  const total = Number(quote.total || subtotal + vatAmount);

  const preparedName = quote.prepared_by_name || '';
  const preparedEmail = quote.prepared_by_email || quote.owner_email || '';
  const approvedName = quote.approved_by_name || '';
  const approvedEmail = quote.approved_by_email || '';
  const approvedAt = quote.approved_at;

  const doc = new PDFDocument({ size: 'A4', margin: 0 });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>(resolve => doc.on('end', () => resolve(Buffer.concat(chunks))));

  const W = doc.page.width;
  const H = doc.page.height;
  const MARGIN = 40;

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

  // Quote # + Date in top-right
  const trX = W - 220;
  doc.fillColor('#94A3B8').font('Helvetica').fontSize(8).text('QUOTE #', trX, 24);
  doc.fillColor('white').font('Helvetica-Bold').fontSize(13).text(quote.quote_number || '—', trX, 36);
  doc.fillColor('#94A3B8').font('Helvetica').fontSize(8).text('DATE', trX, 58);
  doc.fillColor('white').font('Helvetica').fontSize(10).text(dateStr(quote.sent_at || quote.created_at), trX, 70);

  // ═══ INFO BLOCK ═══
  let y = 130;
  const labelCol = MARGIN;
  const valueCol = MARGIN + 110;
  const rightLabelCol = W - 240;
  const rightValueCol = W - 130;

  const drawKV = (label: string, value: string, lx: number, vx: number) => {
    doc.fillColor(LABEL).font('Helvetica').fontSize(9).text(label, lx, y);
    doc.fillColor(INK).font('Helvetica-Bold').text(value || '—', vx, y);
  };

  drawKV('Prepared by:', preparedName || '—', labelCol, valueCol);
  drawKV('Client:', quote.client_name || '—', rightLabelCol, rightValueCol);
  y += 16;
  drawKV('Email:', preparedEmail || '—', labelCol, valueCol);
  if (quote.campaign) drawKV('Campaign:', quote.campaign, rightLabelCol, rightValueCol);
  y += 16;
  if (approvedName) {
    drawKV('Approved by:', approvedName, labelCol, valueCol);
    drawKV('Approved on:', dateStr(approvedAt), rightLabelCol, rightValueCol);
    y += 16;
  }

  y += 12;

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
    doc.text(fmtMoney(Number(l.final_unit || 0), currency), col.unit, y + 7, { width: tableW * 0.16, align: 'right' });
    doc.text(`${Number(l.qty || 1)}`, col.qty, y + 7, { width: tableW * 0.07, align: 'right' });
    doc.text(fmtMoney(Number(l.final_amount || 0), currency), col.amt, y + 7, { width: colEnd - col.amt, align: 'right' });
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

  doc.fillColor(LABEL).font('Helvetica').fontSize(10).text('SUBTOTAL', tBoxX, y);
  doc.fillColor(INK).font('Helvetica-Bold').text(fmtFX(subtotal, currency, usdRate), tBoxX, y, { width: tBoxW, align: 'right' });
  y += 18;
  doc.fillColor(LABEL).font('Helvetica').text(`VAT (${(vatRate*100).toFixed(0)}%)`, tBoxX, y);
  doc.fillColor(INK).font('Helvetica').text(fmtFX(vatAmount, currency, usdRate), tBoxX, y, { width: tBoxW, align: 'right' });
  y += 22;
  doc.rect(tBoxX, y - 4, tBoxW, 28).fill(GREEN);
  doc.fillColor('white').font('Helvetica-Bold').fontSize(13);
  doc.text('TOTAL', tBoxX + 12, y + 2);
  doc.text(fmtFX(total, currency, usdRate), tBoxX, y + 2, { width: tBoxW - 12, align: 'right' });
  y += 36;

  // ═══ SIGNATURE BLOCKS ═══
  y += 20;
  const sigW = (tableW - 40) / 2;
  const sigLeftX = MARGIN;
  const sigRightX = MARGIN + sigW + 40;

  // Prepared by
  doc.fillColor(MUTE).font('Helvetica').fontSize(7.5).text('PREPARED BY', sigLeftX, y);
  doc.moveTo(sigLeftX, y + 38).lineTo(sigLeftX + sigW, y + 38).strokeColor(INK).lineWidth(0.7).stroke();
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(9.5).text(preparedName || '—', sigLeftX, y + 44);
  doc.fillColor(LABEL).font('Helvetica').fontSize(8).text(preparedEmail || '—', sigLeftX, y + 56);
  doc.fillColor(MUTE).fontSize(7.5).text(`Date: ${dateStr(quote.created_at)}`, sigLeftX, y + 70);

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
  const footerH = 50;
  const footerY = H - footerH;
  doc.rect(0, footerY, W, footerH).fill(GREEN);
  doc.fillColor('white').font('Helvetica').fontSize(9);
  doc.text('King Abdulaziz Road, Riyadh, Saudi Arabia, Al-Yasmeen District', MARGIN, footerY + 12, {
    width: W - MARGIN * 2, align: 'center',
  });
  doc.fontSize(8).fillColor('#e7faf0');
  doc.text('Phone: +966 53370 4233  ·  Sales@falcons.sa  ·  store.falcons.sa', MARGIN, footerY + 28, {
    width: W - MARGIN * 2, align: 'center',
  });

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
