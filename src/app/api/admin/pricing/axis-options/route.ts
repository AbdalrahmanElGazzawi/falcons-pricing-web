import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';

export const runtime = 'nodejs';

const ALLOWED = new Set(['axis_key','label','factor','rationale','sort_order','is_active']);
const VALID_AXES = new Set(['engagement','audience','seasonality','content','language','authority']);

export async function POST(req: Request) {
  const { denied, profile, supabase } = await requireSuperAdmin();
  if (denied) return NextResponse.json({ error: 'Super admin only' }, { status: 403 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const insert: any = {};
  for (const k of Object.keys(body)) if (ALLOWED.has(k)) insert[k] = body[k];
  if (!insert.axis_key || !VALID_AXES.has(insert.axis_key)) return NextResponse.json({ error: 'axis_key required' }, { status: 400 });
  if (!insert.label) return NextResponse.json({ error: 'label required' }, { status: 400 });
  if (typeof insert.factor !== 'number') return NextResponse.json({ error: 'factor must be a number' }, { status: 400 });
  insert.updated_by = profile.id;

  const { data, error } = await supabase.from('pricing_axis_options').insert(insert).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_log').insert({
    actor_id: profile.id, actor_email: profile.email, actor_kind: 'human',
    action: 'pricing.axis_option.create', entity_type: 'pricing_axis_option',
    entity_id: String(data.id), diff: insert,
  });
  return NextResponse.json({ ok: true, id: data.id });
}
