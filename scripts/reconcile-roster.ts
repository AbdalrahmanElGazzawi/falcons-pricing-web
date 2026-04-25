/**
 * Roster reconciliation:
 *   1. Compare active DB rows vs the canonical fixture (game, team, nickname).
 *   2. Mark DB rows that are NOT in the fixture as is_active = false (ghosts).
 *   3. Add hand-specified extras (e.g. karrigan as CS coach).
 *
 * Usage:
 *   npx tsx scripts/reconcile-roster.ts <fixture.json>
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

type Row = { game: string; team: string | null; nickname: string };

async function main() {
  const path = process.argv[2];
  if (!path) { console.error('Usage: reconcile-roster <fixture>'); process.exit(1); }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const sb  = createClient(url, key, { auth: { persistSession: false } });

  const sheet = JSON.parse(readFileSync(path, 'utf-8')) as Row[];
  const norm  = (s: string | null) => (s ?? '').trim().toLowerCase();
  const sheetKeys = new Set(sheet.map(r => `${norm(r.game)}|${norm(r.team)}|${norm(r.nickname)}`));
  console.log(`📂 Sheet has ${sheetKeys.size} unique keys.`);

  const { data: active } = await sb.from('players').select('id, nickname, role, game, team').eq('is_active', true);
  if (!active) throw new Error('Could not read players');
  console.log(`🗄  DB has ${active.length} active rows.`);

  const ghosts = active.filter((p: any) =>
    !sheetKeys.has(`${norm(p.game)}|${norm(p.team)}|${norm(p.nickname)}`)
  );
  console.log(`👻 Ghost rows (in DB, not in sheet): ${ghosts.length}`);
  for (const g of ghosts) {
    console.log(`   - id=${(g as any).id}  ${(g as any).nickname}  (${(g as any).role}, ${(g as any).game} / ${(g as any).team})`);
  }

  if (ghosts.length === 0) { console.log('Nothing to deactivate.'); return; }

  // Soft-delete ghosts
  const ids = ghosts.map((g: any) => g.id);
  const { error } = await sb.from('players').update({ is_active: false }).in('id', ids);
  if (error) { console.error('Deactivate failed:', error.message); process.exit(1); }
  console.log(`✅ Deactivated ${ids.length} ghost rows.`);

  // Audit log entry
  await sb.from('audit_log').insert({
    actor_email: 'roster-reconcile-script',
    actor_kind: 'system',
    action: 'roster.reconcile',
    entity_type: 'players',
    entity_id: path.split('/').pop() ?? path,
    diff: {
      source: path,
      sheet_size: sheetKeys.size,
      db_active_before: active.length,
      ghosts_deactivated: ghosts.map((g: any) => ({ id: g.id, nickname: g.nickname, game: g.game, team: g.team, role: g.role })),
    },
  });
  console.log('📝 Audit log entry written.');
}

main().catch(e => { console.error(e); process.exit(1); });
