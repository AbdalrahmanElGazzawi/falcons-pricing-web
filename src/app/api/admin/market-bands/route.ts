import { NextResponse } from 'next/server';
import { requireAdmin, requireStaff } from '@/lib/auth';

export const runtime = 'nodejs';

const ALLOWED_SOURCES = new Set([
  'peer_rate_card',
  'methodology_v2_baseline',
  'closed_deal_history',
  'manual_override',
]);

const REQUIRED = ['tier_code', 'audience_market', 'platform', 'min_sar', 'median_sar', 'max_sar', 'source'];

// GET /api/admin/market-bands  — staff-readable for the F/A/S/C panel later
export async function GET(req: Request) {
  const { denied, supabase } = await requireStaff();
  if (denied) return NextResponse.json({ error: 'Auth required' }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get('activeOnly') !== 'false';
  let query = supabase.from('market_bands').select('*');
  if (activeOnly) query = query.is('effective_to', null);
  const tier   = searchParams.get('tier');     if (tier)   query = query.eq('tier_code', tier);
  const market = searchParams.get('market');   if (market) query = query.eq('audience_market', market);
  const platf  = searchParams.get('platform'); if (platf)  query = query.eq('platform', platf);
  const game   = searchParams.get('game');     if (game)   query = query.eq('game', game);
  const { data, error } = await query.order('tier_code').order('audience_market').order('platform').order('game', { nullsFirst: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bands: data ?? [] });
}

// POST /api/admin/market-bands — admin-only, creates new band (or shadows old via effective_to)
export async function POST(req: Request) {
  const { denied, profile, supabase } = await requireAdmin();
  if (denied) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  let body: any; try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  for (const k of REQUIRED) {
    if (body[k] === undefined || body[k] === null || body[k] === '') {
      return NextResponse.json({ error: `Missing required field: ${k}` }, { status: 400 });
    }
  }
  if (!ALLOWED_SOURCES.has(body.source)) return NextResponse.json({ error: `Invalid source` }, { status: 400 });
  const min_sar = Number(body.min_sar), median_sar = Number(body.median_sar), max_sar = Number(body.max_sar);
  if (!(min_sar <= median_sar && median_sar <= max_sar)) {
    return NextResponse.json({ error: 'Need min ≤ median ≤ max' }, { status: 400 });
  }
  // Retire any existing active band for the same cell first.
  const game = body.game || null;
  const today = new Date().toISOString().slice(0, 10);
  let retireQuery = supabase
    .from('market_bands')
    .update({ effective_to: today })
    .eq('tier_code', body.tier_code)
    .eq('audience_market', body.audience_market)
    .eq('platform', body.platform)
    .is('effective_to', null);
  // Postgres null != null, so we have to handle the game null case explicitly.
  retireQuery = game === null ? retireQuery.is('game', null) : retireQuery.eq('game', game);
  await retireQuery;

  const insert = {
    tier_code: body.tier_code,
    game,
    audience_market: body.audience_market,
    platform: body.platform,
    min_sar, median_sar, max_sar,
    source: body.source,
    source_url: body.source_url || null,
    source_notes: body.source_notes || null,
    notes: body.notes || null,
    created_by: profile.id,
  };
  const { data, error } = await supabase.from('market_bands').insert(insert).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from('audit_log').insert({
    actor_id: profile.id, actor_email: profile.email,
    action: 'market_band.create', entity_type: 'market_band', entity_id: data.id, diff: insert,
  });
  return NextResponse.json({ band: data });
}
