// Bulk Liquipedia sync — iterates every active player with a liquipedia_url
// set, runs the scraper per-player at the ToS-compliant rate, writes back
// results, and updates data_completeness inline. Admin-only.
//
// Throughput: ~2.2s per player + parse → ~5 min for ~130 players (just under
// Vercel's 5-min max). Returns per-player summary.

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { syncFromLiquipedia } from '@/lib/liquipedia';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST() {
  const { denied, profile, supabase } = await requireAdmin();
  if (denied) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { data: players, error } = await supabase
    .from('players')
    .select('id, nickname, liquipedia_url, has_social_data')
    .eq('is_active', true)
    .not('liquipedia_url', 'is', null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ran_at = new Date().toISOString();
  const summary: Array<{
    id: number; nickname: string; ok: boolean; reason?: string;
    prize_money_24mo_usd?: number; peak_tournament_tier?: string;
  }> = [];

  for (const p of players ?? []) {
    try {
      const result = await syncFromLiquipedia(p.liquipedia_url!);
      const has_tournament_data =
        result.prize_money_24mo_usd > 0 || !!result.last_major_finish_date;
      const data_completeness =
        p.has_social_data && has_tournament_data ? 'full' :
        p.has_social_data && !has_tournament_data ? 'socials_only' :
        !p.has_social_data && has_tournament_data ? 'tournament_only' :
        'minimal';

      const { error: updateErr } = await supabase
        .from('players')
        .update({
          prize_money_24mo_usd:     result.prize_money_24mo_usd,
          peak_tournament_tier:     result.peak_tournament_tier,
          last_major_finish_date:   result.last_major_finish_date,
          last_major_placement:     result.last_major_placement,
          achievement_decay_factor: result.achievement_decay_factor,
          liquipedia_synced_at:     result.liquipedia_synced_at,
          has_tournament_data,
          data_completeness,
        })
        .eq('id', p.id);

      summary.push({
        id: p.id, nickname: p.nickname,
        ok: !updateErr, reason: updateErr?.message,
        prize_money_24mo_usd: result.prize_money_24mo_usd,
        peak_tournament_tier: result.peak_tournament_tier,
      });
    } catch (e: any) {
      summary.push({ id: p.id, nickname: p.nickname, ok: false, reason: e?.message ?? String(e) });
    }
  }

  await supabase.from('audit_log').insert({
    actor_id: profile.id, actor_email: profile.email,
    action: 'players.bulk_liquipedia_sync',
    entity_type: 'player', entity_id: 'bulk',
    diff: {
      ran_at,
      total: summary.length,
      ok: summary.filter(s => s.ok).length,
      failed: summary.filter(s => !s.ok).length,
      data_hits: summary.filter(s => (s.prize_money_24mo_usd ?? 0) > 0).length,
    },
  });

  const okCount = summary.filter(s => s.ok).length;
  return NextResponse.json({
    ran_at,
    total: summary.length,
    ok: okCount,
    failed: summary.length - okCount,
    details: summary,
  });
}
