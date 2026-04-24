import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { denied, profile, supabase } = await requireAdmin();
  if (denied) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (!body.label) return NextResponse.json({ error: 'label required' }, { status: 400 });

  const insert = {
    label: body.label,
    uplift_pct: body.uplift_pct ?? 0,
    description: body.description ?? null,
    is_active: body.is_active ?? true,
    sort_order: body.sort_order ?? 999,
  };

  const { data, error } = await supabase.from('addons').insert(insert).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_log').insert({
    actor_id: profile.id, actor_email: profile.email,
    action: 'addon.create', entity_type: 'addon', entity_id: String(data.id), diff: insert,
  });
  return NextResponse.json({ ok: true, id: data.id });
}
