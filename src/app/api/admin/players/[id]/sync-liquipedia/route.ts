// One-off Liquipedia sync triggered from PlayerForm "Pull from Liquipedia"
// button. Returns the scraper result + persists it.

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { syncFromLiquipedia } from '@/lib/liquipedia';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const { denied, profile, supabase } = await requireAdmin();
  if (denied) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid player id' }, { status: 400 });
  }

  const { data: player, error: fetchErr } = await supabase
    .from('players')
    .select('id, nickname, liquipedia_url')
    .eq('id', id)
    .single();
  if (fetchErr || !player) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  }
  if (!player.liquipedia_url) {
    return NextResponse.json({ error: 'No liquipedia_url set on this player' }, { status: 400 });
  }

  try {
    const result = await syncFromLiquipedia(player.liquipedia_url);
    const update: any = {
      prize_money_24mo_usd:     result.prize_money_24mo_usd,
      peak_tournament_tier:     result.peak_tournament_tier,
      last_major_finish_date:   result.last_major_finish_date,
      last_major_placement:     result.last_major_placement,
      achievement_decay_factor: result.achievement_decay_factor,
      liquipedia_synced_at:     result.liquipedia_synced_at,
      has_tournament_data:      result.prize_money_24mo_usd > 0
                             || !!result.last_major_finish_date,
    };
    const { error: updateErr } = await supabase
      .from('players')
      .update(update)
      .eq('id', id);
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }
    await supabase.from('audit_log').insert({
      actor_id: profile.id, actor_email: profile.email,
      action: 'player.liquipedia_sync', entity_type: 'player', entity_id: String(id),
      diff: { liquipedia_url: player.liquipedia_url, ...update },
    });
    // Strip the raw_html_preview before returning to client
    const { raw_html_preview, ...response } = result;
    return NextResponse.json(response);
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || 'Liquipedia sync failed' },
      { status: 500 },
    );
  }
}
