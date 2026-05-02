import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase-server';
import { randomBytes } from 'node:crypto';

export const runtime = 'nodejs';

// Generate a human-readable temporary password: 3 letters + 4 digits + 1 symbol + 3 letters
function generateTempPassword(): string {
  const letters = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz'; // no O/0/I/l confusion
  const digits = '23456789';
  const symbols = '!@#$%&';
  const pick = (chars: string, n: number, buf: Buffer) =>
    Array.from({ length: n }, (_, i) => chars[buf[i] % chars.length]).join('');
  const buf = randomBytes(11);
  return pick(letters, 3, buf.subarray(0, 3)) + pick(digits, 4, buf.subarray(3, 7)) + pick(symbols, 1, buf.subarray(7, 8)) + pick(letters, 3, buf.subarray(8, 11));
}

export async function POST(req: Request) {
  const { denied, profile } = await requireSuperAdmin();
  if (denied) return NextResponse.json({ error: 'Super-admin only' }, { status: 403 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { email, full_name, role } = body || {};
  if (!email || !role) return NextResponse.json({ error: 'email + role required' }, { status: 400 });
  if (!['admin', 'sales', 'finance', 'viewer'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const sb = createServiceClient();

  // 1. Add to invite allowlist FIRST. Trigger rejects anyone not in here,
  //    so the order matters: allowlist → create user → profile upsert.
  const { error: allowErr } = await sb.from('invited_emails').upsert({
    email: email.toLowerCase(),
    invited_role: role,
    invited_by: profile.id,
  }, { onConflict: 'email' });
  if (allowErr) return NextResponse.json({ error: 'Allowlist write failed: ' + allowErr.message }, { status: 500 });

  // 2. Create the user with a random temporary password so they can sign in
  //    immediately with email+password (no magic-link email to be eaten by Gmail
  //    scanners). Admin shares the password with the invitee out-of-band.
  const tempPassword = generateTempPassword();
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name, role },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Pre-create the profile row with the assigned role so handle_new_user
  // doesn't override it. Insert if not exists, otherwise patch.
  if (data?.user?.id) {
    await sb.from('profiles').upsert({
      id: data.user.id,
      email,
      full_name: full_name ?? null,
      role,
      is_active: true,
    }, { onConflict: 'id' });
  }

  await sb.from('audit_log').insert({
    actor_id: profile.id,
    actor_email: profile.email,
    action: 'user.invite',
    entity_type: 'profile',
    entity_id: data?.user?.id ?? null,
    diff: { email, role, full_name },
  });

  return NextResponse.json({
    ok: true,
    user_id: data?.user?.id,
    temp_password: tempPassword,
    email,
  });
}
