import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/research-import
 *
 * Ingest a research CSV (Manus or any other research output) and update
 * follower / engagement / tournament data on the players table by nickname.
 *
 * Expected CSV columns (header row required, case-insensitive, all optional
 * except nickname):
 *   nickname, ig_followers, tiktok_followers, yt_followers, twitch_followers,
 *   x_followers, kick_followers, snap_followers, fb_followers,
 *   ig_er, tiktok_er, yt_er, twitch_er, x_er,
 *   peak_tournament_tier, last_major_placement, last_major_finish_date,
 *   prize_money_24mo_usd, liquipedia_url, agency_name, notes
 *
 * Body: { csv: string }
 * Response: { matched, unmatched, updated, errors }
 *
 * Reach multiplier auto-recomputes via downstream trigger when followers update.
 */

type Row = Record<string, string>;

function parseCsv(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const rows: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    // Naive CSV: commas inside quotes are NOT supported. Manus output is
    // expected to be quote-free per their typical research format.
    const cells = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    if (cells.every(c => c === '')) continue;
    const row: Row = {};
    headers.forEach((h, idx) => { row[h] = cells[idx] ?? ''; });
    rows.push(row);
  }
  return rows;
}

function num(v: string | undefined): number | null {
  if (!v) return null;
  const cleaned = v.replace(/[, ]/g, '').replace(/[kK]$/, '000').replace(/[mM]$/, '000000');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function pct(v: string | undefined): number | null {
  if (!v) return null;
  const cleaned = v.replace(/[, %]/g, '');
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  // Treat values > 1 as already-pct (5 = 5%), values <= 1 as already-fraction (0.05).
  return n > 1 ? n / 100 : n;
}

export async function POST(req: Request) {
  const { denied, profile, supabase } = await requireAdmin();
  if (denied) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const csv: string | undefined = body?.csv;
  if (!csv || csv.length < 10) {
    return NextResponse.json({ error: 'Missing csv body' }, { status: 400 });
  }

  const rows = parseCsv(csv);
  if (rows.length === 0) return NextResponse.json({ error: 'No data rows parsed' }, { status: 400 });

  // Pull active players for fuzzy matching by nickname (case-insensitive).
  const { data: players } = await supabase
    .from('players')
    .select('id, nickname, full_name')
    .eq('is_active', true);
  if (!players) return NextResponse.json({ error: 'Failed to load roster' }, { status: 500 });

  const byNick = new Map<string, { id: number; nickname: string }>();
  for (const p of players) {
    byNick.set(p.nickname.toLowerCase(), { id: p.id, nickname: p.nickname });
    if (p.full_name) byNick.set(p.full_name.toLowerCase(), { id: p.id, nickname: p.nickname });
  }

  const matched: Array<{ sheet_nick: string; db_nick: string; updates: number }> = [];
  const unmatched: string[] = [];
  const errors: Array<{ nick: string; error: string }> = [];

  for (const r of rows) {
    const sheetNick = (r.nickname || r.player || r.name || '').trim();
    if (!sheetNick) continue;

    const found = byNick.get(sheetNick.toLowerCase());
    if (!found) { unmatched.push(sheetNick); continue; }

    // Build patch from any provided columns
    const patch: Record<string, any> = {};
    const ig = num(r.ig_followers);   if (ig != null) patch.followers_ig = ig;
    const tt = num(r.tiktok_followers); if (tt != null) patch.followers_tiktok = tt;
    const yt = num(r.yt_followers || r.youtube_followers);
                                       if (yt != null) patch.followers_yt = yt;
    const tw = num(r.twitch_followers); if (tw != null) patch.followers_twitch = tw;
    const xf = num(r.x_followers || r.twitter_followers);
                                       if (xf != null) patch.followers_x = xf;
    const kf = num(r.kick_followers);   if (kf != null) patch.followers_kick = kf;
    const sf = num(r.snap_followers || r.snapchat_followers);
                                       if (sf != null) patch.followers_snap = sf;
    const ff = num(r.fb_followers || r.facebook_followers);
                                       if (ff != null) patch.followers_fb = ff;

    const erIg = pct(r.ig_er || r.ig_engagement_rate);   if (erIg != null) patch.er_ig = erIg;
    const erTt = pct(r.tiktok_er);                        if (erTt != null) patch.er_tiktok = erTt;
    const erYt = pct(r.yt_er || r.youtube_er);            if (erYt != null) patch.er_yt = erYt;
    const erTw = pct(r.twitch_er);                        if (erTw != null) patch.er_twitch = erTw;
    const erX  = pct(r.x_er || r.twitter_er);             if (erX  != null) patch.er_x = erX;

    if (r.peak_tournament_tier) patch.peak_tournament_tier = r.peak_tournament_tier.trim().toUpperCase().replace(/[^SABC]/g, '') || null;
    if (r.last_major_placement) patch.last_major_placement = r.last_major_placement.trim();
    if (r.last_major_finish_date) {
      const d = r.last_major_finish_date.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) patch.last_major_finish_date = d;
    }
    const prize = num(r.prize_money_24mo_usd); if (prize != null) patch.prize_money_24mo_usd = prize;

    if (r.liquipedia_url) patch.liquipedia_url = r.liquipedia_url.trim();
    if (r.agency_name && r.agency_name.trim()) {
      patch.agency_name = r.agency_name.trim();
      patch.agency_status = 'agency';
    }
    if (r.notes && r.notes.trim()) {
      const stamp = `[${new Date().toISOString().slice(0, 10)} research] ${r.notes.trim()}`;
      patch.notes = stamp; // Caller can re-run with cumulative notes if needed
    }

    // Recompute has_social_data + data_completeness flags from new follower data
    const fields = ['followers_ig','followers_tiktok','followers_yt','followers_twitch',
                    'followers_x','followers_fb','followers_snap','followers_kick'] as const;
    if (fields.some(k => k in patch)) {
      patch.has_social_data = true;
    }

    if (Object.keys(patch).length === 0) continue;

    const { error } = await supabase
      .from('players')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', found.id);

    if (error) {
      errors.push({ nick: sheetNick, error: error.message });
    } else {
      matched.push({ sheet_nick: sheetNick, db_nick: found.nickname, updates: Object.keys(patch).length });
    }
  }

  // Audit
  await supabase.from('audit_log').insert({
    actor_email: profile.email,
    actor_kind: 'user',
    action: 'research_import',
    entity_type: 'players',
    entity_id: 'bulk',
    diff: { matched_count: matched.length, unmatched_count: unmatched.length,
            error_count: errors.length, total_rows: rows.length },
  });

  return NextResponse.json({
    matched_count: matched.length,
    unmatched_count: unmatched.length,
    error_count: errors.length,
    total_rows: rows.length,
    matched,
    unmatched,
    errors,
  });
}
