import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import path from 'node:path';
import fs from 'node:fs';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/auth';

export const runtime = 'nodejs';

// Brand colours pulled from the Team Falcons quotation template
const GREEN = '#2ED06E';
const GREEN_DARK = '#1D9E75';
const INK = '#0F172A';
const LABEL = '#475569';
const LIGHT = '#F1F5F9';
const LINE = '#E2E8F0';

function fmtMoney(n: number, ccy = 'SAR') {
  return `${ccy} ${Math.round(n).toLocaleString('en-US')}`;
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

  const currency = quote.currency || 'SAR';
  const vatRate = Number(quote.vat_rate || 0.15);
  const subtotal = Number(quote.pre_vat || quote.subtotal || 0);
  const vatAmount = Number(quote.vat_amount || subtotal * vatRate);
  const total = Number(quote.total || subtotal + vatAmount);

  // Build PDF
  const doc = new PDFDocument({ size: 'A4', margin: 0 });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>(resolve => doc.on('end', () => resolve(Buffer.concat(chunks))));

  const W = doc.page.width;
  const H = doc.page.height;
  const MARGIN = 40;

  // ═══ GREEN BANNER (top) ═══
  doc.rect(0, 0, W, 72).fill(GREEN);

  // Logo
  try {
    const logoPath = path.join(process.cwd(), 'public', 'falcon-mark.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, MARGIN, 14, { width: 44, height: 44 });
    }
  } catch { /* no logo */ }

  doc.fillColor('white').font('Helvetica-Bold').fontSize(22).text('TEAM FALCONS', MARGIN + 56, 22);
  doc.font('Helvetica').fontSize(10).fillColor('#e7faf0').text('Pricing OS  ·  Quotation', MARGIN + 56, 48);

  // ═══ INFO BLOCK ═══
  let y = 98;
  const labelCol = MARGIN;
  const valueCol = MARGIN + 110;
  const rightLabelCol = W - 240;
  const rightValueCol = W - 130;

  doc.fillColor(LABEL).font('Helvetica').fontSize(9);
  doc.text('Employee Mail:', labelCol, y);
  doc.fillColor(INK).font('Helvetica-Bold').text(quote.owner_email || '—', valueCol, y);

  doc.fillColor(LABEL).font('Helvetica').text('Date:', rightLabelCol, y);
  doc.fillColor(INK).font('Helvetica-Bold').text(
    new Date(quote.sent_at || quote.created_at).toLocaleDateString('en-GB'),
    rightValueCol, y
  );

  y += 16;
  doc.fillColor(LABEL).font('Helvetica').text('Approved By:', labelCol, y);
  doc.fillColor(INK).font('Helvetica-Bold').text('—', valueCol, y);

  doc.fillColor(LABEL).font('Helvetica').text('Quote #:', rightLabelCol, y);
  doc.fillColor(INK).font('Helvetica-Bold').text(quote.quote_number || '—', rightValueCol, y);

  y += 16;
  doc.fillColor(LABEL).font('Helvetica').text('Client:', labelCol, y);
  doc.fillColor(INK).font('Helvetica-Bold').text(quote.client_name || '—', valueCol, y);

  if (quote.campaign) {
    doc.fillColor(LABEL).font('Helvetica').text('Campaign:', rightLabelCol, y);
    doc.fillColor(INK).font('Helvetica-Bold').text(quote.campaign, rightValueCol, y);
  }

  y += 30;

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

  // Table header (green background)
  doc.rect(tableX, y, tableW, 24).fill(GREEN_DARK);
  doc.fillColor('white').font('Helvetica-Bold').fontSize(10);
  doc.text('Description', col.desc, y + 8);
  doc.text('Unit cost', col.unit, y + 8, { width: tableW * 0.16, align: 'right' });
  doc.text('Qty', col.qty, y + 8, { width: tableW * 0.07, align: 'right' });
  doc.text('Amount', col.amt, y + 8, { width: colEnd - col.amt, align: 'right' });

  y += 24;

  // Rows
  doc.font('Helvetica').fontSize(10).fillColor(INK);
  const rowH = 22;
  (lines || []).forEach((l: any, idx: number) => {
    if (idx % 2 === 0) {
      doc.rect(tableX, y, tableW, rowH).fill(LIGHT);
    }
    doc.fillColor(INK).font('Helvetica').fontSize(10);
    doc.text(`${l.talent_name} — ${l.platform}`, col.desc, y + 7, { width: tableW * 0.5 });
    doc.text(fmtMoney(Number(l.final_unit || 0), currency), col.unit, y + 7, { width: tableW * 0.16, align: 'right' });
    doc.text(`${Number(l.qty || 1)}`, col.qty, y + 7, { width: tableW * 0.07, align: 'right' });
    doc.text(fmtMoney(Number(l.final_amount || 0), currency), col.amt, y + 7, { width: colEnd - col.amt, align: 'right' });
    y += rowH;
  });

  if (!lines || lines.length === 0) {
    doc.fillColor(LABEL).font('Helvetica-Oblique').fontSize(10);
    doc.text('No line items', col.desc, y + 10);
    y += rowH;
  }

  doc.moveTo(tableX, y).lineTo(tableX + tableW, y).strokeColor(LINE).lineWidth(0.5).stroke();
  y += 28;

  // ═══ NOTES + TOTALS BLOCK ═══
  const notesX = MARGIN;
  const notesW = tableW * 0.5;
  const totalsX = MARGIN + tableW * 0.58;
  const totalsW = tableW * 0.42;
  const blockTop = y;

  doc.fillColor(INK).font('Helvetica-Bold').fontSize(11).text('Special notes and instructions', notesX, y);
  y += 16;
  doc.fillColor(LABEL).font('Helvetica').fontSize(9);
  const notes = quote.notes ||
    '1. Payment within 30 days\n2. 50% down payment on acceptance\n3. Tax invoice issued upon receipt of payment';
  doc.text(notes, notesX, y, { width: notesW - 10, lineGap: 4 });

  // Totals on the right
  let ty = blockTop;
  const totalsLabelX = totalsX + 10;

  const drawTotalRow = (label: string, value: string, bold = false, highlighted = false) => {
    if (highlighted) {
      doc.rect(totalsX, ty - 2, totalsW, 26).fill(GREEN);
      doc.fillColor('white').font('Helvetica-Bold').fontSize(13);
      doc.text(label, totalsLabelX, ty + 5);
      doc.text(value, totalsLabelX, ty + 5, { width: totalsW - 20, align: 'right' });
      ty += 26;
    } else {
      doc.fillColor(bold ? INK : LABEL).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10);
      doc.text(label, totalsLabelX, ty + 2);
      doc.fillColor(INK).font(bold ? 'Helvetica-Bold' : 'Helvetica');
      doc.text(value, totalsLabelX, ty + 2, { width: totalsW - 20, align: 'right' });
      ty += 20;
    }
  };

  drawTotalRow('SUBTOTAL', fmtMoney(subtotal, currency), true);
  drawTotalRow(`(TAX RATE)  ${(vatRate * 100).toFixed(0)}%`, '', false);
  drawTotalRow('TAX', fmtMoney(vatAmount, currency), false);
  ty += 4;
  drawTotalRow('TOTAL', fmtMoney(total, currency), true, true);

  y = Math.max(ty, y + 90);

  // ═══ ADDRESS FOOTER (green band at bottom) ═══
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
