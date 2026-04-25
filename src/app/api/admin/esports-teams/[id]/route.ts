import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
export const runtime = 'nodejs';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { denied, supabase, profile } = await requireAdmin();
  if (denied) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }); }

  const allowed = [
    'team_name','logo_url','brand_color',
    'handle_ig','handle_x','handle_tiktok','handle_yt','handle_twitch','handle_kick','discord_url',
    'followers_ig','followers_x','followers_tiktok','subscribers_yt','followers_twitch',
    'is_active','sort_order','notes',
  ];
  const upd: Record<string, any> = {};
  for (const k of allowed) if (k in body) upd[k] = body[k];

  const { data, error } = await supabase.from('esports_teams').update(upd).eq('id', params.id).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_log').insert({
    actor_id: profile.id, actor_email: profile.email,
    action: 'esports_team.update', entity_type: 'esports_team', entity_id: String(data.id), diff: upd,
  });
  return NextResponse.json(data);
}
