import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';

const ALLOWED = new Set([
  'label', 'follower_threshold', 'engagement_range', 'audience_quality',
  'authority_signal', 'base_fee_min', 'base_fee_max', 'floor_share',
  'promotion_trigger', 'demotion_trigger',
]);

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { denied, profile, supabase } = await requireAdmin();
  if (denied) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const patch: any = {};
  for (const k of Object.keys(body)) if (ALLOWED.has(k)) patch[k] = body[k];
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No allowed fields' }, { status: 400 });
  }

  const { error } = await supabase.from('tiers').update(patch).eq('id', Number(params.id));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_log').insert({
    actor_id: profile.id,
    actor_email: profile.email,
    action: 'tier.update',
    entity_type: 'tier',
    entity_id: params.id,
    diff: patch,
  });

  return NextResponse.json({ ok: true });
}
