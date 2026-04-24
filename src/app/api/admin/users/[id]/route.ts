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

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { denied, profile } = await requireAdmin();
  if (denied) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  if (params.id === profile.id) {
    return NextResponse.json({ error: 'You cannot remove yourself' }, { status: 400 });
  }

  const sb = createServiceClient();

  // Look up the target's email so we can also clean the invite allowlist
  const { data: target } = await sb
    .from('profiles')
    .select('id, email')
    .eq('id', params.id)
    .single();

  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // 1. Pull email off the invited_emails allowlist so they can't be re-authed
  //    without a fresh admin invite
  await sb.from('invited_emails').delete().eq('email', target.email.toLowerCase());

  // 2. Hard-delete the auth.users row via Supabase admin API.
  //    This cascades to public.profiles (onDelete: cascade on profiles.id FK)
  //    and removes all their sessions.
  const { error: authErr } = await sb.auth.admin.deleteUser(params.id);
  if (authErr) {
    // If auth delete fails (user maybe already gone from auth.users), at least
    // mark their profile inactive as a fallback so RLS blocks everything.
    await sb.from('profiles').update({ is_active: false }).eq('id', params.id);
  }

  await sb.from('audit_log').insert({
    actor_id: profile.id,
    actor_email: profile.email,
    action: 'user.delete',
    entity_type: 'profile',
    entity_id: params.id,
    diff: { email: target.email },
  });

  return NextResponse.json({ ok: true });
}
