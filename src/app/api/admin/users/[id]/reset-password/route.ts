import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase-server';
import { randomBytes } from 'node:crypto';

export const runtime = 'nodejs';

function generateTempPassword(): string {
  const letters = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&';
  const pick = (chars: string, n: number, buf: Buffer) =>
    Array.from({ length: n }, (_, i) => chars[buf[i] % chars.length]).join('');
  const buf = randomBytes(11);
  return pick(letters, 3, buf.subarray(0, 3)) + pick(digits, 4, buf.subarray(3, 7)) + pick(symbols, 1, buf.subarray(7, 8)) + pick(letters, 3, buf.subarray(8, 11));
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const { denied, profile } = await requireAdmin();
  if (denied) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  if (params.id === profile.id) {
    return NextResponse.json({
      error: "Reset your own password via the 'Change password' page in the sidebar.",
    }, { status: 400 });
  }

  const sb = createServiceClient();
  const { data: target } = await sb
    .from('profiles')
    .select('id, email')
    .eq('id', params.id)
    .single();
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const tempPassword = generateTempPassword();
  const { error } = await sb.auth.admin.updateUserById(params.id, { password: tempPassword });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await sb.from('audit_log').insert({
    actor_id: profile.id,
    actor_email: profile.email,
    action: 'user.reset_password',
    entity_type: 'profile',
    entity_id: params.id,
    diff: { email: target.email },
  });

  return NextResponse.json({ ok: true, email: target.email, temp_password: tempPassword });
}
