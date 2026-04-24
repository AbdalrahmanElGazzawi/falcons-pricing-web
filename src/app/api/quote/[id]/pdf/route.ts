import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/auth';

export const runtime = 'nodejs';

// Brand colors
const NAVY = '#0B2340';
const GREEN = '#2ED06E';
const INK = '#0F172A';
const LABEL = '#475569';
const LINE = '#E2E8F0';

function fmt(n: number, ccy = 'SAR') {
  return `${ccy} ${Math.round(n).toLocaleString('en-US')}`;
}
function pct(n: number) {
  return `${(n * 100).toFixed(0)}%`;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  // Allow both authenticated staff and public (token-based) access via ?token=
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

  const [{ data: lines }, { data: addons }] = await Promise.all([
    sb.from('quote_lines').select('*').eq('quote_id', quote.id).order('sort_order'),
    sb.from('quote_addons').select('addon_id, uplift_pct, addons(label)').eq('quote_id', quote.id),
  ]);

  // Build PDF in-memory
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>(resolve => doc.on('end', () => resolve(Buffer.concat(chunks))));

  // ── Header band
  doc.rect(0, 0, doc.page.width, 110).fill(NAVY);
  doc.fillColor('white').fontSize(18).font('Helvetica-Bold').text('Team Falcons', 50, 35);
  doc.fontSize(10).font('Helvetica').fillColor('#9CA3AF').text('Pricing OS · Quotation', 50, 58);

  doc.fontSize(9).fillColor('#9CA3AF').text(quote.quote_number, 50, 80);
  doc.fontSize(10).fillColor('white').text(
    new Date(quote.sent_at || quote.created_at).toLocaleDateString('en-GB'),
    doc.page.width - 150, 80, { width: 100, align: 'right' }
  );

  // ── Client block
  doc.fillColor(INK).fontSize(14).font('Helvetica-Bold').text(quote.client_name, 50, 140);
  if (quote.campaign) doc.fontSize(10).font('Helvetica').fillColor(LABEL).text(`Campaign: ${quote.campaign}`, 50, 160);

  const headerInfo = [
    ['Currency', quote.currency],
    ['VAT', pct(quote.vat_rate)],
    ['Status', String(quote.status).replace(/_/g, ' ')],
  ];
  let infoY = 140;
  headerInfo.forEach(([k, v]) => {
    doc.fontSize(9).fillColor(LABEL).text(k, doc.page.width - 200, infoY);
    doc.fontSize(10).fillColor(INK).text(v, doc.page.width - 100, infoY);
    infoY += 16;
  });

  // ── Line items table
  let y = 210;
  doc.fontSize(11).font('Helvetica-Bold').fillColor(INK).text('Line items', 50, y);
  y += 18;

  // Header row
  doc.rect(50, y, doc.page.width - 100, 22).fill('#F8FAFC');
  doc.fontSize(8).fillColor(LABEL).font('Helvetica-Bold');
  doc.text('TALENT', 60, y + 7);
  doc.text('DELIVERABLE', 200, y + 7);
  doc.text('QTY', 360, y + 7, { width: 30, align: 'right' });
  doc.text('UNIT', 410, y + 7, { width: 60, align: 'right' });
  doc.text('TOTAL', 480, y + 7, { width: 70, align: 'right' });
  y += 22;

  doc.font('Helvetica').fontSize(10);
  for (const l of (lines || [])) {
    if (y > doc.page.height - 200) {
      doc.addPage();
      y = 50;
    }
    doc.fillColor(INK).text(l.talent_name, 60, y, { width: 130 });
    doc.fillColor(LABEL).fontSize(8).text(l.talent_type, 60, y + 13);
    doc.fontSize(10).fillColor(INK).text(l.platform, 200, y, { width: 150 });
    doc.text(String(l.qty), 360, y, { width: 30, align: 'right' });
    doc.text(fmt(l.final_unit, quote.currency), 410, y, { width: 60, align: 'right' });
    doc.font('Helvetica-Bold').text(fmt(l.final_amount, quote.currency), 480, y, { width: 70, align: 'right' });
    doc.font('Helvetica');
    y += 28;
    doc.strokeColor(LINE).lineWidth(0.5).moveTo(50, y - 4).lineTo(doc.page.width - 50, y - 4).stroke();
  }

  // ── Add-ons
  if (addons && addons.length > 0) {
    y += 12;
    doc.fontSize(10).font('Helvetica-Bold').fillColor(INK).text('Includes rights packages:', 50, y);
    y += 16;
    doc.font('Helvetica').fontSize(9).fillColor(LABEL);
    for (const a of addons as any[]) {
      doc.text(`• ${a.addons?.label || `Package #${a.addon_id}`}`, 60, y);
      doc.fillColor(GREEN).text(`+${pct(a.uplift_pct)}`, doc.page.width - 100, y, { width: 50, align: 'right' });
      doc.fillColor(LABEL);
      y += 14;
    }
  }

  // ── Totals block
  y += 24;
  if (y > doc.page.height - 180) { doc.addPage(); y = 50; }
  const boxX = doc.page.width - 250;
  doc.rect(boxX, y, 200, 110).fill('#F8FAFC');
  doc.fontSize(9).fillColor(LABEL).font('Helvetica-Bold').text('SUMMARY', boxX + 14, y + 12);

  const totalsRows = [
    ['Subtotal', fmt(quote.subtotal, quote.currency)],
    [`VAT (${pct(quote.vat_rate)})`, fmt(quote.vat_amount, quote.currency)],
  ];
  let ty = y + 32;
  for (const [k, v] of totalsRows) {
    doc.font('Helvetica').fontSize(10).fillColor(LABEL).text(k, boxX + 14, ty);
    doc.fillColor(INK).text(v, boxX + 100, ty, { width: 90, align: 'right' });
    ty += 16;
  }
  doc.strokeColor(LINE).moveTo(boxX + 14, ty + 2).lineTo(boxX + 186, ty + 2).stroke();
  ty += 8;
  doc.font('Helvetica-Bold').fontSize(12).fillColor(INK).text('TOTAL', boxX + 14, ty);
  doc.fillColor(GREEN).text(fmt(quote.total, quote.currency), boxX + 80, ty, { width: 110, align: 'right' });

  // ── Notes
  if (quote.notes) {
    y += 130;
    if (y > doc.page.height - 100) { doc.addPage(); y = 50; }
    doc.fontSize(10).font('Helvetica-Bold').fillColor(INK).text('Notes', 50, y);
    y += 14;
    doc.font('Helvetica').fontSize(9).fillColor(LABEL).text(quote.notes, 50, y, { width: doc.page.width - 100 });
  }

  // ── Footer
  const fy = doc.page.height - 40;
  doc.fontSize(8).fillColor(LABEL).font('Helvetica')
    .text('Team Falcons · Pricing OS · This quotation is valid for 14 days from issue date.',
          50, fy, { width: doc.page.width - 100, align: 'center' });

  doc.end();
  const pdfBuf = await done;

  return new NextResponse(pdfBuf as any, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${quote.quote_number}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
