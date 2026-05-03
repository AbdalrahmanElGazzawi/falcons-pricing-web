import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';

const VALID_BANDS = new Set(['floor', 'anchor', 'stretch', 'ceiling']);
const VALID_KINDS = new Set(['player', 'creator']);

/**
 * POST /api/admin/pricing-overrides
 *
 * Create or replace a Floor/Anchor/Stretch/Ceiling override for one
 * (talent, platform, band) cell. Soft-supersedes any prior active override
 * on the same cell.
 *
 * Body: { talent_kind, talent_id, platform, band, override_value_sar, reason }
 */
export async function POST(req: Request) {
  const { denied, profile, supabase } = await requireAdmin();
  if (denied) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { talent_kind, talent_id, platform, band, override_value_sar, reason } = body ?? {};
  if (!VALID_KINDS.has(talent_kind))                  return NextResponse.json({ error: 'talent_kind must be player|creator' }, { status: 400 });
  if (!Number.isFinite(Number(talent_id)))            return NextResponse.json({ error: 'talent_id must be a number' }, { status: 400 });
  if (typeof platform !== 'string' || !platform)      return NextResponse.json({ error: 'platform required' }, { status: 400 });
  if (!VALID_BANDS.has(band))                         return NextResponse.json({ error: 'band must be floor|anchor|stretch|ceiling' }, { status: 400 });
  const value = Number(override_value_sar);
  if (!Number.isFinite(value) || value < 0)           return NextResponse.json({ error: 'override_value_sar must be a non-negative number' }, { status: 400 });
  if (typeof reason !== 'string' || !reason.trim())   return NextResponse.json({ error: 'reason required' }, { status: 400 });

  // Supersede any active override on the same cell
  const { data: priors } = await supabase
    .from('pricing_band_overrides')
    .select('id')
    .eq('talent_kind', talent_kind)
    .eq('talent_id', Number(talent_id))
    .eq('platform', platform)
    .eq('band', band)
    .is('superseded_at', null);

  // Insert the new override row first so we can FK the supersession
  const { data: inserted, error: insertErr } = await supabase
    .from('pricing_band_overrides')
    .insert({
      talent_kind, talent_id: Number(talent_id), platform, band,
      override_value_sar: value, reason: reason.trim(),
      created_by: profile.id,
      created_by_email: profile.email,
    })
    .select('band, platform, override_value_sar, reason, effective_from, created_by_email, created_at, id')
    .single();
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  // Mark old ones superseded
  if (priors && priors.length > 0) {
    const ids = priors.map(p => p.id);
    await supabase
      .from('pricing_band_overrides')
      .update({ superseded_at: new Date().toISOString(), superseded_by: inserted.id })
      .in('id', ids);
  }

  await supabase.from('audit_log').insert({
    actor_id: profile.id, actor_email: profile.email,
    action: 'pricing_override.create',
    entity_type: 'pricing_override',
    entity_id: String(inserted.id),
    diff: { talent_kind, talent_id, platform, band, override_value_sar: value, reason },
  });

  return NextResponse.json({ ok: true, override: inserted });
}

/**
 * DELETE /api/admin/pricing-overrides
 *
 * Body: { talent_kind, talent_id, platform, band }
 *
 * Marks the active override for that cell as superseded (no FK target —
 * just soft-deletes). The historical row stays for audit.
 */
export async function DELETE(req: Request) {
  const { denied, profile, supabase } = await requireAdmin();
  if (denied) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { talent_kind, talent_id, platform, band } = body ?? {};
  if (!VALID_KINDS.has(talent_kind))                return NextResponse.json({ error: 'talent_kind must be player|creator' }, { status: 400 });
  if (!Number.isFinite(Number(talent_id)))          return NextResponse.json({ error: 'talent_id must be a number' }, { status: 400 });
  if (typeof platform !== 'string' || !platform)    return NextResponse.json({ error: 'platform required' }, { status: 400 });
  if (!VALID_BANDS.has(band))                       return NextResponse.json({ error: 'band must be floor|anchor|stretch|ceiling' }, { status: 400 });

  const { data: active, error: selErr } = await supabase
    .from('pricing_band_overrides')
    .select('id')
    .eq('talent_kind', talent_kind)
    .eq('talent_id', Number(talent_id))
    .eq('platform', platform)
    .eq('band', band)
    .is('superseded_at', null);
  if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });
  if (!active || active.length === 0) return NextResponse.json({ ok: true, removed: 0 });

  const ids = active.map(a => a.id);
  const { error: updErr } = await supabase
    .from('pricing_band_overrides')
    .update({ superseded_at: new Date().toISOString() })
    .in('id', ids);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  await supabase.from('audit_log').insert({
    actor_id: profile.id, actor_email: profile.email,
    action: 'pricing_override.remove',
    entity_type: 'pricing_override',
    entity_id: ids.join(','),
    diff: { talent_kind, talent_id, platform, band },
  });
  return NextResponse.json({ ok: true, removed: ids.length });
}
