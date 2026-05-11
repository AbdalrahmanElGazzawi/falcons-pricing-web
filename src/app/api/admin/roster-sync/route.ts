import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/roster-sync
 *
 * Process fix for the "Uploaded to website = FALSE" gap.
 * Diff a pasted "Data Entry" CSV (export of the Website Esport Data Entry
 * sheet) against players + creators. Two-phase:
 *
 *   action = 'preview'  → returns { missing, orphans, matched }
 *   action = 'commit'   → inserts the provided `rows` into players
 *
 * Body:
 *   { action: 'preview', csv: string }
 *   { action: 'commit',  rows: Array<MissingRow> }
 *
 * Auth: admin only.
 */

type CsvRow = Record<string, string>;

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];
  // Naive CSV: handles quoted fields with embedded commas via simple state machine.
  const splitLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; continue; }
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === ',' && !inQuote) { out.push(cur); cur = ''; continue; }
      cur += ch;
    }
    out.push(cur);
    return out;
  };
  const norm = (h: string) => h.trim().toLowerCase().replace(/\s+/g, ' ').replace(/\n/g, ' ');
  const headers = splitLine(lines[0]).map(norm);
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i]).map(c => c.trim());
    if (cells.every(c => c === '')) continue;
    const row: CsvRow = {};
    headers.forEach((h, idx) => { row[h] = cells[idx] ?? ''; });
    rows.push(row);
  }
  return rows;
}

function normKey(s: string | null | undefined): string {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

interface SheetTalent {
  game: string;
  team: string;
  nickname: string;
  full_name: string;
  role: string;
  nationality: string;
  date_of_birth: string | null;
  x_handle: string | null;
  instagram: string | null;
  twitch: string | null;
  kick: string | null;
  youtube: string | null;
  tiktok: string | null;
  facebook: string | null;
  uploaded: boolean;
}

function pickHeader(row: CsvRow, ...candidates: string[]): string {
  for (const c of candidates) {
    const v = row[c];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function rowToSheetTalent(row: CsvRow): SheetTalent | null {
  const nickname = pickHeader(row, 'nickname');
  if (!nickname) return null;
  const game = pickHeader(row, 'game');
  if (!game) return null;
  return {
    game,
    team:          pickHeader(row, 'team'),
    nickname,
    full_name:     pickHeader(row, 'name (first & last name)', 'name', 'full name'),
    role:          pickHeader(row, 'role') || 'Player',
    nationality:   pickHeader(row, 'nationality'),
    date_of_birth: pickHeader(row, 'date of birth (dd/mm/yyyy)', 'date of birth', 'dob') || null,
    x_handle:      pickHeader(row, 'x (twitter)', 'x', 'twitter') || null,
    instagram:     pickHeader(row, 'instagram') || null,
    twitch:        pickHeader(row, 'twitch') || null,
    kick:          pickHeader(row, 'kick') || null,
    youtube:       pickHeader(row, 'youtube') || null,
    tiktok:        pickHeader(row, 'tiktok') || null,
    facebook:      pickHeader(row, 'fb', 'facebook') || null,
    uploaded:      ['true','1','yes','y'].includes(pickHeader(row, 'uploaded to website', 'uploaded').toLowerCase()),
  };
}

// Map "Player"/"Coach"/"Manager"/"Assistant Coach"/"Head Coach"/"Analyst"
// into archetype + authority_tier defaults that match the existing roster pattern.
function classifyForInsert(role: string): { archetype: string; authority_tier: string } {
  const r = role.toLowerCase().trim();
  if (r === 'player') return { archetype: 'tournament_athlete', authority_tier: 'AT-5' };
  // staff (coach / manager / analyst / etc.)
  return { archetype: 'grassroots_competitor', authority_tier: 'AT-0' };
}

// Parse DD/MM/YYYY or YYYY-MM-DD or excel-style date string → ISO date or null.
function parseDob(s: string | null): string | null {
  if (!s) return null;
  const trimmed = s.trim();
  if (!trimmed) return null;
  // Try ISO first
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(trimmed);
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2,'0')}-${iso[3].padStart(2,'0')}`;
  }
  // Try DD/MM/YYYY
  const eu = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(trimmed);
  if (eu) {
    return `${eu[3]}-${eu[2].padStart(2,'0')}-${eu[1].padStart(2,'0')}`;
  }
  return null;
}

export async function POST(req: Request) {
  const { denied, profile, supabase } = await requireAdmin();
  if (denied) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const action: string = String(body?.action || 'preview');

  if (action === 'preview') {
    const csv: string = String(body?.csv || '');
    if (csv.length < 50) {
      return NextResponse.json({ error: 'CSV too short or empty' }, { status: 400 });
    }
    const rows = parseCsv(csv);
    const sheetTalents = rows.map(rowToSheetTalent).filter((t): t is SheetTalent => t != null);

    const { data: players } = await supabase
      .from('players')
      .select('id, nickname, game, team, is_active');
    const { data: creators } = await supabase
      .from('creators')
      .select('id, nickname');

    const dbKeys = new Set<string>();
    for (const p of players ?? []) dbKeys.add(normKey(p.nickname));
    for (const c of creators ?? []) dbKeys.add(normKey(c.nickname));

    const sheetKeys = new Set<string>();
    for (const t of sheetTalents) sheetKeys.add(normKey(t.nickname));

    const missing = sheetTalents.filter(t => !dbKeys.has(normKey(t.nickname)));
    const orphans = (players ?? [])
      .filter(p => p.is_active && !sheetKeys.has(normKey(p.nickname)))
      .map(p => ({ id: p.id, nickname: p.nickname, game: p.game, team: p.team }));
    const matched = sheetTalents.length - missing.length;

    return NextResponse.json({
      ok: true,
      total_in_sheet: sheetTalents.length,
      total_in_db_active_players: (players ?? []).filter(p => p.is_active).length,
      total_in_db_creators: (creators ?? []).length,
      matched,
      missing,
      orphans,
    });
  }

  if (action === 'commit') {
    const rows = Array.isArray(body?.rows) ? (body.rows as SheetTalent[]) : [];
    if (rows.length === 0) {
      return NextResponse.json({ error: 'No rows to insert' }, { status: 400 });
    }

    // Re-check each row isn't already in the DB (race-safety in case admin
    // previewed twice and committed stale data).
    const { data: existing } = await supabase
      .from('players')
      .select('nickname')
      .in('nickname', rows.map(r => r.nickname));
    const existingSet = new Set((existing ?? []).map(e => normKey(e.nickname)));

    const newRows = rows
      .filter(r => !existingSet.has(normKey(r.nickname)))
      .map(r => {
        const cls = classifyForInsert(r.role || 'Player');
        return {
          nickname:       r.nickname,
          full_name:      r.full_name || null,
          role:           r.role || 'Player',
          game:           r.game || null,
          team:           r.team || null,
          nationality:    r.nationality || null,
          date_of_birth:  parseDob(r.date_of_birth),
          tier_code:      'Tier 3',
          archetype:      cls.archetype,
          authority_tier: cls.authority_tier,
          is_active:      true,
          x_handle:       r.x_handle || null,
          instagram:      r.instagram || null,
          twitch:         r.twitch || null,
          kick:           r.kick || null,
          youtube:        r.youtube || null,
          tiktok:         r.tiktok || null,
          facebook:       r.facebook || null,
          rate_source:    'tier_baseline',
          notes:          `Ingested via /admin/roster-sync on ${new Date().toISOString().slice(0,10)}. Source: Website Esport Data Entry CSV.`,
        };
      });

    if (newRows.length === 0) {
      return NextResponse.json({ ok: true, inserted: 0, message: 'Nothing to insert — all rows already in DB.' });
    }

    const { data: inserted, error } = await supabase
      .from('players')
      .insert(newRows)
      .select('id, nickname, game, team');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      inserted: (inserted ?? []).length,
      rows: inserted,
      skipped: rows.length - newRows.length,
    });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
