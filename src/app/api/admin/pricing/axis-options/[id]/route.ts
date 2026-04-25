import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
const ALLOWED = new Set(['label','factor','rationale','sort_order','is_active']);

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { denied, profile, supabase } = await requireSuperAdmin();
  if (denied) return NextResponse.json({ error: 'Super admin only' }, { status: 403 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const patch: any = { updated_by: profile.id, updated_at: new Date().toISOString() };
  for (const k of Object.keys(body)) if (ALLOWED.has(k)) patch[k] = body[k];
  if (Object.keys(patch).length <= 2) return NextResponse.json({ error: 'No allowed fields' }, { status: 400 });

  const { data: prev } = await supabase.from('pricing_axis_options').select('*').eq('id', params.id).single();
  const { error } = await supabase.from('pricing_axis_options').update(patch).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from('audit_log').insert({
    actor_id: profile.id, actor_email: profile.email, actor_kind: 'human',
    action: 'pricing.axis_option.update', entity_type: 'pricing_axis_option',
    entity_id: params.id, diff: { before: prev, after: patch },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { denied, profile, supabase } = await requireSuperAdmin();
  if (denied) return NextResponse.json({ error: 'Super admin only' }, { status: 403 });
  const { data: prev } = await supabase.from('pricing_axis_options').select('*').eq('id', params.id).single();
  const { error } = await supabase.from('pricing_axis_options').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from('audit_log').insert({
    actor_id: profile.id, actor_email: profile.email, actor_kind: 'human',
    action: 'pricing.axis_option.delete', entity_type: 'pricing_axis_option',
    entity_id: params.id, diff: { deleted: prev },
  });
  return NextResponse.json({ ok: true });
}
