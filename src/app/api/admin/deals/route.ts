import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { denied, profile } = await requireAuth();
  if (denied) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json();
  const sb = createServiceClient();
  const insert = {
    brand_name: String(body.brand_name || '').slice(0, 200),
    brand_category: body.brand_category || null,
    quoted_price_sar: Number(body.quoted_price_sar) || 0,
    final_price_sar: body.final_price_sar ? Number(body.final_price_sar) : null,
    status: body.status || 'pending',
    reason_lost: body.reason_lost || null,
    discount_percent: body.quoted_price_sar > 0 && body.final_price_sar
      ? Math.round((1 - Number(body.final_price_sar) / Number(body.quoted_price_sar)) * 10000) / 100
      : null,
    sales_owner_email: body.sales_owner_email || profile.email,
    notes: body.notes || null,
    closed_at: body.status && body.status !== 'pending' ? new Date().toISOString() : null,
  };
  const { data, error } = await sb.from('deals').insert(insert).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, id: data.id });
}
