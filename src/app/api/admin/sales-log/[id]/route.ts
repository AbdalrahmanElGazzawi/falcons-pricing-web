import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';

export const runtime = 'nodejs';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { denied, supabase, profile } = await requireStaff();
  if (denied) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }); }

  const allowed = [
    'deal_date','talent_name','brand_name','description','platform',
    'amount_usd','amount_sar','total_with_vat_sar','vat_rate',
    'status','invoice_issued','payment_collected','claim_filed','cc_pay','notes'
  ];
  const update: Record<string, any> = {};
  for (const k of allowed) if (k in body) update[k] = body[k];

  const { data, error } = await supabase
    .from('sales_log').update(update).eq('id', params.id).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_log').insert({
    actor_id: profile.id, actor_email: profile.email,
    action: 'sales_log.update', entity_type: 'sales_log', entity_id: params.id,
    diff: update,
  });

  return NextResponse.json(data);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { denied, supabase, profile } = await requireStaff();
  if (denied) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { error } = await supabase.from('sales_log').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_log').insert({
    actor_id: profile.id, actor_email: profile.email,
    action: 'sales_log.delete', entity_type: 'sales_log', entity_id: params.id, diff: null,
  });
  return NextResponse.json({ ok: true });
}
