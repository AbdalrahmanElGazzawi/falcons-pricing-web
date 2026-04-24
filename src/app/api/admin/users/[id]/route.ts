import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { denied, profile } = await requireAdmin();
  if (denied) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (params.id === profile.id) {
    return NextResponse.json({ error: 'You cannot edit your own role/status' }, { status: 400 });
  }

  const allowed: Record<string, true> = { role: true, is_active: true, full_name: true };
  const patch: any = {};
  for (const k of Object.keys(body)) if (allowed[k]) patch[k] = body[k];

  if (patch.role && !['admin', 'sales', 'finance', 'viewer'].includes(patch.role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No allowed fields' }, { status: 400 });
  }

  const sb = createServiceClient();
  const { error } = await sb.from('profiles').update(patch).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await sb.from('audit_log').insert({
    actor_id: profile.id,
    actor_email: profile.email,
    action: 'user.update',
    entity_type: 'profile',
    entity_id: params.id,
    diff: patch,
  });

  return NextResponse.json({ ok: true });
}
