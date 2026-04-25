/**
 * Roster importer — read a JSON fixture and upsert into public.players.
 *
 * Usage:
 *   npm run import-roster -- supabase/fixtures/roster_2026-04.json
 *
 * Behaviour
 *   - Match key:   case-insensitive (game, team, nickname)
 *   - On match:    UPDATE only fields the fixture provides (null/empty leaves
 *                  the existing value alone — won't clobber rate columns)
 *   - On miss:     INSERT a new row (rates default to 0; you can edit them
 *                  in /admin/players afterwards)
 *   - Audit log:   writes one summary row with action='roster.import',
 *                  actor_kind='system', diff = { updated: [...], inserted: [...] }
 *
 * Required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

type RosterRow = {
  game: string;
  team: string;
  nickname: string;
  role?: string | null;
  ingame_role?: string | null;
  full_name?: string | null;
  date_of_birth?: string | null;
  nationality?: string | null;
  avatar_url?: string | null;
  x_handle?: string | null;
  instagram?: string | null;
  twitch?: string | null;
  kick?: string | null;
  youtube?: string | null;
  tiktok?: string | null;
  facebook?: string | null;
};

const FIELDS: (keyof RosterRow)[] = [
  'role','ingame_role','full_name','date_of_birth','nationality','avatar_url',
  'x_handle','instagram','twitch','kick','youtube','tiktok','facebook',
];

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error('Usage: import-roster <path-to-fixture.json>');
    process.exit(1);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.');
    process.exit(1);
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const rows = JSON.parse(readFileSync(path, 'utf-8')) as RosterRow[];
  if (!Array.isArray(rows)) throw new Error('Fixture must be a JSON array.');

  console.log(`📂 ${rows.length} rows from ${path}`);

  const { data: existing, error: exErr } = await sb
    .from('players')
    .select('id, game, team, nickname');
  if (exErr) throw exErr;

  const norm = (s: string) => s.trim().toLowerCase();
  const lookup = new Map<string, number>();
  (existing ?? []).forEach((p: any) => {
    lookup.set(`${norm(p.game ?? '')}|${norm(p.team ?? '')}|${norm(p.nickname)}`, p.id);
  });

  const updates: Array<{ id: number; nickname: string; patch: Record<string, any> }> = [];
  const inserts: RosterRow[] = [];

  for (const r of rows) {
    const k = `${norm(r.game)}|${norm(r.team)}|${norm(r.nickname)}`;
    const id = lookup.get(k);
    if (id) {
      const patch: Record<string, any> = {};
      for (const f of FIELDS) {
        const v = (r as any)[f];
        if (v !== null && v !== undefined && v !== '') patch[f] = v;
      }
      if (Object.keys(patch).length > 0) updates.push({ id, nickname: r.nickname, patch });
    } else {
      inserts.push(r);
    }
  }

  console.log(`🔁 ${updates.length} to update · ➕ ${inserts.length} to insert`);

  // Apply updates
  for (const u of updates) {
    const { error } = await sb.from('players').update(u.patch).eq('id', u.id);
    if (error) {
      console.error(`✖ update failed for ${u.nickname} (id ${u.id}):`, error.message);
    }
  }

  // Apply inserts (in chunks of 50 to keep payload small)
  for (let i = 0; i < inserts.length; i += 50) {
    const chunk = inserts.slice(i, i + 50).map(r => ({
      game: r.game, team: r.team, nickname: r.nickname,
      role: r.role || 'Player', ingame_role: r.ingame_role,
      full_name: r.full_name, date_of_birth: r.date_of_birth,
      nationality: r.nationality, avatar_url: r.avatar_url,
      x_handle: r.x_handle, instagram: r.instagram, twitch: r.twitch,
      kick: r.kick, youtube: r.youtube, tiktok: r.tiktok, facebook: r.facebook,
    }));
    const { error } = await sb.from('players').insert(chunk);
    if (error) {
      console.error(`✖ insert chunk ${i / 50 + 1} failed:`, error.message);
    }
  }

  // Audit log — one summary row, tagged actor_kind='system'
  await sb.from('audit_log').insert({
    actor_email: 'roster-import-script',
    actor_kind: 'system',
    action: 'roster.import',
    entity_type: 'players',
    entity_id: path.split('/').pop() ?? path,
    diff: {
      source: path,
      total_rows: rows.length,
      updated_count: updates.length,
      inserted_count: inserts.length,
      updated: updates.map(u => ({ id: u.id, nickname: u.nickname, fields: Object.keys(u.patch) })).slice(0, 200),
      inserted: inserts.map(r => ({ nickname: r.nickname, game: r.game, team: r.team })).slice(0, 200),
    },
  });

  console.log(`✅ Done. ${updates.length} updated, ${inserts.length} inserted, audit_log row written.`);
}

main().catch(e => { console.error(e); process.exit(1); });
