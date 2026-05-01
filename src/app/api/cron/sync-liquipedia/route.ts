// Weekly cron — re-sync every active player with a liquipedia_url.
// Wired up in vercel.json. Bearer-token protected via CRON_SECRET env.

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { syncFromLiquipedia } from '@/lib/liquipedia';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes — well under Vercel's cron limit

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (process.env.CRON_SECRET) {
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Service-role client — bypasses RLS for the batch job.
  const supabase = createServiceClient();
  const { data: players, error } = await supabase
    .from('players')
    .select('id, nickname, liquipedia_url')
    .eq('is_active', true)
    .not('liquipedia_url', 'is', null);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const summary: Array<{ id: number; nickname: string; ok: boolean; reason?: string }> = [];
  for (const p of players ?? []) {
    try {
      const result = await syncFromLiquipedia(p.liquipedia_url!);
      const { error: updateErr } = await supabase
        .from('players')
        .update({
          prize_money_24mo_usd:     result.prize_money_24mo_usd,
          peak_tournament_tier:     result.peak_tournament_tier,
          last_major_finish_date:   result.last_major_finish_date,
          last_major_placement:     result.last_major_placement,
          achievement_decay_factor: result.achievement_decay_factor,
          liquipedia_synced_at:     result.liquipedia_synced_at,
          has_tournament_data:      result.prize_money_24mo_usd > 0
                                 || !!result.last_major_finish_date,
        })
        .eq('id', p.id);
      summary.push({ id: p.id, nickname: p.nickname, ok: !updateErr, reason: updateErr?.message });
    } catch (e: any) {
      summary.push({ id: p.id, nickname: p.nickname, ok: false, reason: e?.message ?? String(e) });
    }
  }

  const okCount = summary.filter(s => s.ok).length;
  return NextResponse.json({
    ran_at: new Date().toISOString(),
    total: summary.length,
    ok: okCount,
    failed: summary.length - okCount,
    details: summary,
  });
}
