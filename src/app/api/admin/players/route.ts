import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';

const ALLOWED = new Set([
  'avatar_url', 'portrait_url', 'date_of_birth', 'ingame_role',
  'nickname', 'full_name', 'role', 'game', 'team', 'nationality', 'tier_code',
  'rate_ig_reel', 'rate_ig_post', 'rate_ig_story', 'rate_ig_repost', 'rate_ig_share',
  'rate_tiktok_video', 'rate_tiktok_repost', 'rate_tiktok_share',
  'rate_yt_short', 'rate_yt_short_repost',
  'rate_x_post', 'rate_x_repost', 'rate_x_share',
  'rate_fb_post', 'rate_twitch_stream', 'rate_twitch_integ', 'rate_irl',
  'commission', 'markup', 'floor_share', 'authority_factor',
  'default_seasonality', 'default_language', 'default_audience', 'default_engagement', 'measurement_confidence',
  'notes', 'x_handle', 'instagram', 'twitch', 'youtube', 'tiktok', 'kick',
  'facebook', 'snapchat', 'link_in_bio',
  'followers_ig', 'followers_twitch', 'followers_yt', 'followers_tiktok',
  'followers_x', 'followers_fb', 'followers_snap',
  'agency_status', 'agency_name', 'agency_contact',
  'rate_source', 'audience_market',
  'is_active',
  'has_social_data', 'has_tournament_data', 'has_audience_demo', 'data_completeness',
  'liquipedia_url', 'prize_money_24mo_usd', 'peak_tournament_tier', 'current_ranking',
  'last_major_finish_date', 'last_major_placement', 'achievement_decay_factor',
]);

export async function POST(req: Request) {
  const { denied, profile, supabase } = await requireAdmin();
  if (denied) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (!body.nickname) return NextResponse.json({ error: 'nickname required' }, { status: 400 });

  const insert: any = { is_active: true };
  for (const k of Object.keys(body)) if (ALLOWED.has(k)) insert[k] = body[k];

  const { data, error } = await supabase.from('players').insert(insert).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_log').insert({
    actor_id: profile.id, actor_email: profile.email,
    action: 'player.create', entity_type: 'player', entity_id: String(data.id),
    diff: { nickname: data.nickname, tier_code: data.tier_code },
  });
  return NextResponse.json({ ok: true, id: data.id });
}
