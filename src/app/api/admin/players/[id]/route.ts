import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';

const ALLOWED = new Set([
  'nickname', 'full_name', 'role', 'game', 'team', 'nationality', 'tier_code',
  'rate_ig_reel', 'rate_ig_static', 'rate_ig_story', 'rate_tiktok_video',
  'rate_yt_short', 'rate_x_post', 'rate_fb_post', 'rate_twitch_stream',
  'rate_twitch_integ', 'rate_irl',
  'commission', 'markup', 'floor_share', 'authority_factor',
  'default_seasonality', 'default_language', 'measurement_confidence',
  'notes', 'x_handle', 'instagram', 'twitch', 'youtube', 'tiktok', 'kick',
  'facebook', 'snapchat', 'link_in_bio',
  'followers_ig', 'followers_twitch', 'followers_yt', 'followers_tiktok',
  'followers_x', 'followers_fb', 'followers_snap',
  'is_active',
]);

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { denied, profile, supabase } = await requireAdmin();
  if (denied) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const patch: any = {};
  for (const k of Object.keys(body)) if (ALLOWED.has(k)) patch[k] = body[k];
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'No allowed fields' }, { status: 400 });

  const { error } = await supabase.from('players').update(patch).eq('id', Number(params.id));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_log').insert({
    actor_id: profile.id, actor_email: profile.email,
    action: 'player.update', entity_type: 'player', entity_id: params.id, diff: patch,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { denied, profile, supabase } = await requireAdmin();
  if (denied) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  // Soft-delete: set is_active=false to preserve historic quote_lines references
  const { error } = await supabase.from('players').update({ is_active: false }).eq('id', Number(params.id));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_log').insert({
    actor_id: profile.id, actor_email: profile.email,
    action: 'player.deactivate', entity_type: 'player', entity_id: params.id,
  });
  return NextResponse.json({ ok: true });
}
