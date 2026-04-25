import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';

export const runtime = 'nodejs';

const ALLOWED = new Set([
  'source','source_handle','brand','agency','campaign','region',
  'talents','deliverables','budget_hint','body','type','status','internal_notes',
]);

export async function POST(req: Request) {
  const { denied, profile, supabase } = await requireStaff();
  if (denied) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const insert: any = { owner_id: profile.id };
  for (const k of Object.keys(body)) if (ALLOWED.has(k)) insert[k] = body[k];
  if (!insert.brand) return NextResponse.json({ error: 'brand required' }, { status: 400 });

  const { data, error } = await supabase
    .from('inquiries').insert(insert)
    .select('id, inquiry_number')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_log').insert({
    actor_id: profile.id, actor_email: profile.email, actor_kind: 'human',
    action: 'inquiry.create', entity_type: 'inquiry', entity_id: data.id,
    diff: insert,
  });

  return NextResponse.json({ ok: true, id: data.id, inquiry_number: data.inquiry_number });
}
