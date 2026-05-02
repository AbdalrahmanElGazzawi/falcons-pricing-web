import { NextResponse } from 'next/server';
import { requireSuperAdmin, SUPER_ADMIN_EMAIL } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { denied, profile } = await requireSuperAdmin();
  if (denied) return NextResponse.json({ error: 'Super-admin only' }, { status: 403 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const allowed: Record<string, true> = { role: true, is_active: true, full_name: true, title: true };
  const patch: any = {};
  for (const k of Object.keys(body)) if (allowed[k]) patch[k] = body[k];

  // Self-edit: full_name is OK, but never let someone toggle their own role
  // or is_active (would let an admin lock themselves out / self-promote).
  if (params.id === profile.id) {
    if ('role' in patch || 'is_active' in patch) {
      return NextResponse.json({ error: 'You cannot edit your own role/status' }, { status: 400 });
    }
  }

  if (patch.role && !['admin', 'sales', 'finance', 'viewer'].includes(patch.role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No allowed fields' }, { status: 400 });
  }

  const sb = createServiceClient();

  // Safety rail: nobody — not even another super-admin if we ever add one — can
  // demote or deactivate the SUPER_ADMIN_EMAIL via this endpoint.
  const { data: target } = await sb
    .from('profiles')
    .select('email')
    .eq('id', params.id)
    .single();
  if (target?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
    if ('role' in patch || 'is_active' in patch) {
      return NextResponse.json({ error: 'Cannot modify super-admin role or status' }, { status: 403 });
    }
  }

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
  const { denied, profile } = await requireSuperAdmin();
  if (denied) return NextResponse.json({ error: 'Super-admin only' }, { status: 403 });

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

  // Safety rail: never let anyone delete the super-admin account.
  if (target.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
    return NextResponse.json({ error: 'Cannot delete super-admin' }, { status: 403 });
  }

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
