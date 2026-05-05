// Admin override of a talent's intake (Migration 058).
// Replaces players.min_rates + agency block. No lockout impact.
// Requires super-admin auth. Audit-logged with before/after.

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdminOrSuper } from '@/lib/auth';

const ALLOWED_KEYS = new Set([
  'ig_reel','ig_static','ig_story',
  'tiktok_video','tiktok_repost',
  'yt_short','yt_short_repost',
  'x_post','x_repost',
  'twitch_stream','twitch_integ',
  'irl',
]);

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminOrSuper();
  if (auth.denied) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const body = await req.json().catch(() => null) as {
    min_rates?: Record<string, number>;
    notes?: string;
    agency?: { has_agency?: boolean; name?: string | null; fee_pct?: number | null };
  } | null;
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  // Sanitise rates
  const cleaned: Record<string, number> = {};
  for (const [k, v] of Object.entries(body.min_rates ?? {})) {
    if (!ALLOWED_KEYS.has(k)) continue;
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0 || n > 10_000_000) continue;
    cleaned[k] = Math.round(n);
  }

  let agency_status: 'agency' | 'direct' | null = null;
  let agency_name: string | null = null;
  let agency_fee_pct: number | null = null;
  if (body.agency && typeof body.agency === 'object') {
    if (body.agency.has_agency === true) {
      agency_status = 'agency';
      agency_name = (typeof body.agency.name === 'string' ? body.agency.name.trim() : '') || null;
      const f = Number(body.agency.fee_pct);
      if (Number.isFinite(f) && f >= 0 && f <= 50) {
        agency_fee_pct = Math.round(f * 100) / 100;
      }
    } else if (body.agency.has_agency === false) {
      agency_status = 'direct';
    }
  }

  const supabase = createServiceClient();
  const { data: before } = await supabase
    .from('players')
    .select('id, nickname, min_rates, min_rates_notes, agency_status, agency_name, agency_fee_pct, intake_status')
    .eq('id', id)
    .maybeSingle();
  if (!before) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

  const update: Record<string, unknown> = {
    min_rates: cleaned,
    min_rates_notes: typeof body.notes === 'string' ? body.notes.slice(0, 4000) : null,
    intake_status: 'approved',
    intake_admin_override_at: new Date().toISOString(),
    intake_admin_override_by: auth.profile.email,
  };
  if (agency_status !== null) {
    update.agency_status = agency_status;
    update.agency_name = agency_name;
    update.agency_fee_pct = agency_fee_pct;
  }

  const { error } = await supabase.from('players').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void supabase.from('audit_log').insert({
    actor_email: auth.profile.email,
    actor_kind:  'human',
    action:      'admin.talent_intake_override',
    entity_type: 'player',
    entity_id:   String(id),
    diff: {
      nickname: before.nickname,
      before:   {
        min_rates:      before.min_rates ?? {},
        agency_status:  before.agency_status ?? null,
        agency_name:    before.agency_name ?? null,
        agency_fee_pct: before.agency_fee_pct ?? null,
      },
      after:   {
        min_rates: cleaned,
        agency_status, agency_name, agency_fee_pct,
      },
    },
  }).then(() => null);

  return NextResponse.json({ ok: true });
}
