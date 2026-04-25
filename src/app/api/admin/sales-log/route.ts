import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { denied, supabase } = await requireStaff();
  if (denied) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { data, error } = await supabase
    .from('sales_log')
    .select('*')
    .order('deal_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: Request) {
  const { denied, supabase, profile } = await requireStaff();
  if (denied) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }); }

  const row = {
    deal_date: body.deal_date,
    talent_name: body.talent_name,
    brand_name: body.brand_name ?? null,
    description: body.description ?? null,
    platform: body.platform ?? null,
    amount_usd: Number(body.amount_usd) || 0,
    amount_sar: Number(body.amount_sar) || 0,
    total_with_vat_sar: Number(body.total_with_vat_sar) || 0,
    vat_rate: Number(body.vat_rate ?? 0.15),
    status: body.status ?? 'in_progress',
    invoice_issued: !!body.invoice_issued,
    payment_collected: !!body.payment_collected,
    claim_filed: !!body.claim_filed,
    cc_pay: !!body.cc_pay,
    notes: body.notes ?? null,
    created_by: profile.id,
  };

  if (!row.deal_date || !row.talent_name) {
    return NextResponse.json({ error: 'deal_date and talent_name required' }, { status: 400 });
  }

  const { data, error } = await supabase.from('sales_log').insert(row).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_log').insert({
    actor_id: profile.id, actor_email: profile.email,
    action: 'sales_log.create', entity_type: 'sales_log', entity_id: data.id,
    diff: { brand: row.brand_name, total: row.total_with_vat_sar },
  });

  return NextResponse.json(data);
}
