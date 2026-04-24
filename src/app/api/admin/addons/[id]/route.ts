import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';

const ALLOWED = new Set(['label', 'uplift_pct', 'description', 'is_active', 'sort_order']);

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { denied, profile, supabase } = await requireAdmin();
  if (denied) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const patch: any = {};
  for (const k of Object.keys(body)) if (ALLOWED.has(k)) patch[k] = body[k];
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'No allowed fields' }, { status: 400 });

  const { error } = await supabase.from('addons').update(patch).eq('id', Number(params.id));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_log').insert({
    actor_id: profile.id, actor_email: profile.email,
    action: 'addon.update', entity_type: 'addon', entity_id: params.id, diff: patch,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { denied, profile, supabase } = await requireAdmin();
  if (denied) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  // Soft-delete by deactivating to preserve quote_addons history
  const { error } = await supabase.from('addons').update({ is_active: false }).eq('id', Number(params.id));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_log').insert({
    actor_id: profile.id, actor_email: profile.email,
    action: 'addon.deactivate', entity_type: 'addon', entity_id: params.id,
  });
  return NextResponse.json({ ok: true });
}
