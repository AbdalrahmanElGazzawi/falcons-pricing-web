import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
const ALLOWED = new Set(['section','title','body','icon','tone','sort_order','is_active']);
const VALID_SECTIONS = new Set(['best_practice','guardrail','methodology','roadmap','platform_logic']);

export async function POST(req: Request) {
  const { denied, profile, supabase } = await requireSuperAdmin();
  if (denied) return NextResponse.json({ error: 'Super admin only' }, { status: 403 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const insert: any = { updated_by: profile.id };
  for (const k of Object.keys(body)) if (ALLOWED.has(k)) insert[k] = body[k];
  if (!insert.section || !VALID_SECTIONS.has(insert.section)) return NextResponse.json({ error: 'section required' }, { status: 400 });
  if (!insert.title || !insert.body) return NextResponse.json({ error: 'title and body required' }, { status: 400 });

  const { data, error } = await supabase.from('pricing_kb').insert(insert).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from('audit_log').insert({
    actor_id: profile.id, actor_email: profile.email, actor_kind: 'human',
    action: 'pricing.kb.create', entity_type: 'pricing_kb', entity_id: String(data.id), diff: insert,
  });
  return NextResponse.json({ ok: true, id: data.id });
}
