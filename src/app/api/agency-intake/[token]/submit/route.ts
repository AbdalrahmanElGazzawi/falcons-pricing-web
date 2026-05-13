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

  const incoming      = Array.isArray(body?.commitments)     ? body.commitments     : [];
  const incomingTerms = Array.isArray(body?.contract_terms)  ? body.contract_terms  : [];
  if (incoming.length === 0 && incomingTerms.length === 0) {
    return NextResponse.json({ error: 'No commitments or contract terms to insert' }, { status: 400 });
  }

  const scope = new Set<number>(tok.scope_talent_ids ?? []);

  // -- Commitments insert (talent_brand_commitments)
  const rows = incoming
    .filter((c: any) => Number.isFinite(c?.talent_id) && scope.has(Number(c.talent_id)))
    .map((c: any) => ({
      ...c,
      created_by: `agency:${tok.agency_name}`,
      last_verified_by: `agency:${tok.agency_name}`,
      last_verified_at: new Date().toISOString(),
    }));

  let insertedCount = 0;
  let insertedRows: any[] = [];
  if (rows.length > 0) {
    const { data: inserted, error } = await supabase
      .from('talent_brand_commitments')
      .insert(rows)
      .select('id, talent_id, brand');
    if (error) {
      return NextResponse.json({ error: 'Commitment insert failed: ' + error.message }, { status: 500 });
    }
    insertedCount = (inserted ?? []).length;
    insertedRows = inserted ?? [];
  }

  // -- Contract terms update (players.independent_sponsorship_*) — Mig 088
  const VALID_CLAUSE_TYPES = new Set(['open_with_consent','open_with_notice','pre_approved_categories','schedule_1_carveouts','none']);
  let termsUpdated = 0;
  for (const t of incomingTerms) {
    const tid = Number(t?.talent_id);
    if (!Number.isFinite(tid) || !scope.has(tid)) continue;
    const upd: Record<string, unknown> = {};
    if (t.clause_type && VALID_CLAUSE_TYPES.has(t.clause_type)) upd.independent_sponsorship_clause_type = t.clause_type;
    if (t.notice_days != null) {
      const n = Number(t.notice_days);
      if (Number.isFinite(n) && n >= 0 && n <= 365) upd.independent_sponsorship_notice_days = Math.round(n);
    }
    if (typeof t.clause_text === 'string' && t.clause_text.trim().length > 0) {
      upd.independent_sponsorship_clause_text = t.clause_text.slice(0, 8000);
    }
    if (typeof t.source_doc_link === 'string' && t.source_doc_link.trim().length > 0) {
      upd.contract_source_doc_link = t.source_doc_link.slice(0, 500);
    }
    if (Object.keys(upd).length === 0) continue;
    upd.updated_at = new Date().toISOString();
    const { error: terr } = await supabase.from('players').update(upd).eq('id', tid);
    if (!terr) termsUpdated++;
  }

  // Mark token used (but don't expire — agency may submit multiple times)
  await supabase
    .from('agency_intake_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('token', params.token);

  return NextResponse.json({
    ok: true,
    inserted_commitments: insertedCount,
    updated_contract_terms: termsUpdated,
    rows: insertedRows,
  });
}
