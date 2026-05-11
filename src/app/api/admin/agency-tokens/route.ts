import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { randomBytes } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET  /api/admin/agency-tokens         — list tokens
 * POST /api/admin/agency-tokens         — mint new token { agency_name, agency_email?, scope_talent_ids: number[], expires_days?: number, notes?: string }
 * DELETE /api/admin/agency-tokens?token=…  — revoke a token
 */
export async function GET() {
  const { denied, supabase } = await requireAdmin();
  if (denied) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  const { data, error } = await supabase
    .from('agency_intake_tokens')
    .select('token, agency_name, agency_email, scope_talent_ids, expires_at, used_at, created_by, created_at, notes')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tokens: data ?? [] });
}

export async function POST(req: Request) {
  const { denied, profile, supabase } = await requireAdmin();
  if (denied) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const agency_name = String(body?.agency_name || '').trim();
  if (!agency_name) return NextResponse.json({ error: 'agency_name required' }, { status: 400 });
  const agency_email = body?.agency_email ? String(body.agency_email).trim() : null;
  const scope_talent_ids = Array.isArray(body?.scope_talent_ids) ? body.scope_talent_ids.map(Number).filter((n: number) => Number.isFinite(n) && n > 0) : [];
  if (scope_talent_ids.length === 0) return NextResponse.json({ error: 'scope_talent_ids required (≥1 player)' }, { status: 400 });
  const expires_days = Number.isFinite(Number(body?.expires_days)) ? Number(body.expires_days) : 21;
  const notes = body?.notes ? String(body.notes).trim() : null;

  const token = randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + expires_days * 86400_000).toISOString();

  const { data, error } = await supabase
    .from('agency_intake_tokens')
    .insert({
      token,
      agency_name,
      agency_email,
      scope_talent_ids,
      expires_at: expiresAt,
      created_by: profile?.id ?? 'unknown',
      notes,
    })
    .select('token, agency_name, expires_at, scope_talent_ids')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, token: data });
}

export async function DELETE(req: Request) {
  const { denied, supabase } = await requireAdmin();
  if (denied) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'token query required' }, { status: 400 });
  const { error } = await supabase.from('agency_intake_tokens').delete().eq('token', token);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
