import { NextResponse } from 'next/server';
import { requireStaff, requireSuperAdmin } from '@/lib/auth';

export const runtime = 'nodejs';

const ALLOWED = new Set([
  'source','source_handle','brand','agency','campaign','region',
  'talents','deliverables','budget_hint','body','type','status',
  'internal_notes','quote_id','owner_id',
]);

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { denied, profile, supabase } = await requireStaff();
  if (denied) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const patch: any = {};
  for (const k of Object.keys(body)) if (ALLOWED.has(k)) patch[k] = body[k];
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'No allowed fields' }, { status: 400 });

  const { data: prev } = await supabase.from('inquiries').select('*').eq('id', params.id).single();
  const { error } = await supabase.from('inquiries').update(patch).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_log').insert({
    actor_id: profile.id, actor_email: profile.email, actor_kind: 'human',
    action: 'inquiry.update', entity_type: 'inquiry', entity_id: params.id,
    diff: { before: prev, after: patch },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { denied, profile, supabase } = await requireSuperAdmin();
  if (denied) return NextResponse.json({ error: 'Super admin only' }, { status: 403 });

  const { data: prev } = await supabase.from('inquiries').select('*').eq('id', params.id).single();
  const { error } = await supabase.from('inquiries').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_log').insert({
    actor_id: profile.id, actor_email: profile.email, actor_kind: 'human',
    action: 'inquiry.delete', entity_type: 'inquiry', entity_id: params.id,
    diff: { deleted: prev },
  });

  return NextResponse.json({ ok: true });
}
