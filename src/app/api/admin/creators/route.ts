import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';

const ALLOWED = new Set([
  'nickname', 'full_name', 'nationality', 'tier_code', 'score',
  // Identity / handles
  'avatar_url', 'link', 'notes', 'is_active',
  'handle_ig', 'handle_x', 'handle_yt', 'handle_tiktok', 'handle_twitch',
  'followers_ig', 'followers_x', 'followers_yt', 'followers_tiktok', 'followers_twitch',
  // Rates
  'rate_x_post_quote', 'rate_x_repost',
  'rate_ig_post', 'rate_ig_story', 'rate_ig_reels',
  'rate_yt_full', 'rate_yt_preroll', 'rate_yt_shorts', 'rate_yt_shorts_repost',
  'rate_snapchat',
  'rate_tiktok_ours', 'rate_tiktok_client',
  'rate_event_snap',
  'rate_twitch_kick_live', 'rate_kick_irl',
  'rate_telegram',
  'rate_usage_monthly', 'rate_promo_monthly',
]);

export async function POST(req: Request) {
  const { denied, profile, supabase } = await requireAdmin();
  if (denied) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body.nickname) return NextResponse.json({ error: 'nickname required' }, { status: 400 });

  const insert: any = { is_active: true };
  for (const k of Object.keys(body)) if (ALLOWED.has(k)) insert[k] = body[k];

  const { data, error } = await supabase.from('creators').insert(insert).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_log').insert({
    actor_id: profile.id, actor_email: profile.email,
    action: 'creator.create', entity_type: 'creator', entity_id: String(data.id),
    diff: { nickname: data.nickname, tier_code: data.tier_code },
  });
  return NextResponse.json({ ok: true, id: data.id });
}
