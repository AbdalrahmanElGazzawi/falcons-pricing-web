import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';

const ALLOWED = new Set([
  'nickname', 'full_name', 'nationality', 'tier_code', 'score',
  'avatar_url', 'link', 'notes', 'is_active',
  'handle_ig', 'handle_x', 'handle_yt', 'handle_tiktok', 'handle_twitch',
  'followers_ig', 'followers_x', 'followers_yt', 'followers_tiktok', 'followers_twitch',
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

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { denied, profile, supabase } = await requireAdmin();
  if (denied) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const patch: any = {};
  for (const k of Object.keys(body)) if (ALLOWED.has(k)) patch[k] = body[k];
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'No allowed fields' }, { status: 400 });

  const { error } = await supabase.from('creators').update(patch).eq('id', Number(params.id));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_log').insert({
    actor_id: profile.id, actor_email: profile.email,
    action: 'creator.update', entity_type: 'creator', entity_id: params.id, diff: patch,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { denied, profile, supabase } = await requireAdmin();
  if (denied) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { error } = await supabase.from('creators').update({ is_active: false }).eq('id', Number(params.id));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_log').insert({
    actor_id: profile.id, actor_email: profile.email,
    action: 'creator.deactivate', entity_type: 'creator', entity_id: params.id,
  });
  return NextResponse.json({ ok: true });
}
