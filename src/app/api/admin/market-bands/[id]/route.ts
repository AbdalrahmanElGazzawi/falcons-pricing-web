import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';

const ALLOWED = new Set([
  'min_sar', 'median_sar', 'max_sar',
  'source', 'source_url', 'source_notes', 'notes',
  'effective_to',
]);
const NUMERIC = new Set(['min_sar', 'median_sar', 'max_sar']);

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { denied, profile, supabase } = await requireAdmin();
  if (denied) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  let body: any; try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const patch: any = {};
  for (const k of Object.keys(body)) {
    if (!ALLOWED.has(k)) continue;
    let v = body[k];
    if (NUMERIC.has(k)) {
      if (v === '' || v === null || v === undefined) v = null;
      else { const n = Number(v); if (Number.isNaN(n)) return NextResponse.json({ error: `Invalid number for ${k}` }, { status: 400 }); v = n; }
    } else if (typeof v === 'string') {
      v = v.trim();
      if (v === '' && k !== 'source') v = null;
    }
    patch[k] = v;
  }
  if (patch.min_sar != null && patch.median_sar != null && patch.max_sar != null) {
    if (!(patch.min_sar <= patch.median_sar && patch.median_sar <= patch.max_sar)) {
      return NextResponse.json({ error: 'Need min ≤ median ≤ max' }, { status: 400 });
    }
  }
  const { data, error } = await supabase.from('market_bands').update(patch).eq('id', params.id).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from('audit_log').insert({
    actor_id: profile.id, actor_email: profile.email,
    action: 'market_band.update', entity_type: 'market_band', entity_id: params.id, diff: patch,
  });
  return NextResponse.json({ band: data });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { denied, profile, supabase } = await requireAdmin();
  if (denied) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  // Soft retire by setting effective_to=today
  const { error } = await supabase.from('market_bands').update({ effective_to: new Date().toISOString().slice(0,10) }).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from('audit_log').insert({
    actor_id: profile.id, actor_email: profile.email,
    action: 'market_band.retire', entity_type: 'market_band', entity_id: params.id,
  });
  return NextResponse.json({ ok: true });
}
