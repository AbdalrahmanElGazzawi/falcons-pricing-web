import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

// Allowlist of deliverable keys we accept on intake. Drop anything else.
const ALLOWED_KEYS = new Set([
  'ig_reel','ig_static','ig_story',
  'tiktok_video','tiktok_repost',
  'yt_short','yt_short_repost',
  'x_post','x_repost',
  'twitch_stream','twitch_integ',
  'irl',
]);

type AgencyPayload = { has_agency?: boolean; name?: string | null; fee_pct?: number | null };

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const supabase = createServiceClient();

  const body = await req.json().catch(() => null) as {
    min_rates?: Record<string, number>;
    notes?: string;
    agency?: AgencyPayload;
  } | null;
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  // Sanitise rates: only allowed keys, only positive finite integers ≤ 10M SAR
  const cleaned: Record<string, number> = {};
  for (const [k, v] of Object.entries(body.min_rates ?? {})) {
    if (!ALLOWED_KEYS.has(k)) continue;
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0 || n > 10_000_000) continue;
    cleaned[k] = Math.round(n);
  }

  const notes = typeof body.notes === 'string' ? body.notes.slice(0, 4000) : null;

  // Sanitise agency block
  let agency_status: 'agency' | 'direct' | null = null;
  let agency_name: string | null = null;
  let agency_fee_pct: number | null = null;
  if (body.agency && typeof body.agency === 'object') {
    if (body.agency.has_agency === true) {
      agency_status = 'agency';
      agency_name = (typeof body.agency.name === 'string' ? body.agency.name.trim() : '') || null;
      const f = Number(body.agency.fee_pct);
      if (Number.isFinite(f) && f >= 0 && f <= 50) {
        agency_fee_pct = Math.round(f * 100) / 100; // 2dp
      } else {
        return NextResponse.json({ error: 'Agency fee % must be between 0 and 50.' }, { status: 400 });
      }
      if (!agency_name) {
        return NextResponse.json({ error: 'Agency name is required when agency representation is selected.' }, { status: 400 });
      }
    } else if (body.agency.has_agency === false) {
      agency_status = 'direct';
      agency_name = null;
      agency_fee_pct = null;
    }
  }

  // Find player by token
  const { data: playerRow } = await supabase
    .from('players')
    .select('id, nickname, intake_status, min_rates, is_active, agency_status, agency_name, agency_fee_pct')
    .eq('intake_token', params.token)
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const player: any = playerRow;

  if (!player) return NextResponse.json({ error: 'Token not found' }, { status: 404 });
  if (player.is_active === false) {
    return NextResponse.json({ error: 'Link no longer active' }, { status: 410 });
  }

  const isRevision = player.intake_status === 'submitted'
    || player.intake_status === 'approved'
    || player.intake_status === 'revised';

  const update: Record<string, unknown> = {
    min_rates:           cleaned,
    min_rates_notes:     notes,
    intake_status:       isRevision ? 'revised' : 'submitted',
    intake_submitted_at: new Date().toISOString(),
  };
  if (agency_status !== null) update.agency_status  = agency_status;
  if (agency_status !== null) update.agency_name    = agency_name;
  if (agency_status !== null) update.agency_fee_pct = agency_fee_pct;

  const { error: updErr } = await supabase
    .from('players')
    .update(update)
    .eq('id', player.id);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  // Audit trail — show before/after for the diff so we can spot revisions
  void supabase.from('audit_log').insert({
    actor_email: 'talent@portal',
    actor_kind:  'human',
    action:      isRevision ? 'talent.intake_revised' : 'talent.intake_submitted',
    entity_type: 'player',
    entity_id:   String(player.id),
    diff: {
      nickname: player.nickname,
      before:   {
        min_rates:      player.min_rates ?? {},
        agency_status:  player.agency_status ?? null,
        agency_name:    player.agency_name ?? null,
        agency_fee_pct: player.agency_fee_pct ?? null,
      },
      after:   {
        min_rates:      cleaned,
        agency_status,
        agency_name,
        agency_fee_pct,
      },
      notes,
    },
  }).then(() => null);

  return NextResponse.json({ ok: true });
}
