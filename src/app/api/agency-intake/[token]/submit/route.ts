import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/agency-intake/[token]/submit
 * Body: { commitments: Array<commitmentRow> }
 *
 * Token-gated. No auth header required — the token in the URL IS the auth.
 * Validates: token exists, not expired. Inserts commitments restricted to
 * the talent_ids on the token's scope. Marks token used_at = now() on success.
 */
export async function POST(req: Request, { params }: { params: { token: string } }) {
  const supabase = createServiceClient();

  const { data: tok } = await supabase
    .from('agency_intake_tokens')
    .select('token, agency_name, scope_talent_ids, expires_at, used_at')
    .eq('token', params.token)
    .maybeSingle();
  if (!tok) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });

  if (tok.expires_at && new Date(tok.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Token expired' }, { status: 410 });
  }

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const incoming = Array.isArray(body?.commitments) ? body.commitments : [];
  if (incoming.length === 0) return NextResponse.json({ error: 'No commitments to insert' }, { status: 400 });

  // Filter by scope_talent_ids
  const scope = new Set<number>(tok.scope_talent_ids ?? []);
  const rows = incoming
    .filter((c: any) => Number.isFinite(c?.talent_id) && scope.has(Number(c.talent_id)))
    .map((c: any) => ({
      ...c,
      created_by: `agency:${tok.agency_name}`,
      last_verified_by: `agency:${tok.agency_name}`,
      last_verified_at: new Date().toISOString(),
    }));

  if (rows.length === 0) {
    return NextResponse.json({ error: 'None of the submitted commitments target a player in your scope' }, { status: 400 });
  }

  const { data: inserted, error } = await supabase
    .from('talent_brand_commitments')
    .insert(rows)
    .select('id, talent_id, brand');
  if (error) {
    return NextResponse.json({ error: 'Insert failed: ' + error.message }, { status: 500 });
  }

  // Mark token used (but don't expire — agency may submit multiple times if needed)
  await supabase
    .from('agency_intake_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('token', params.token);

  return NextResponse.json({ ok: true, inserted: (inserted ?? []).length, rows: inserted });
}
