import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';
import type { QuoteStatus } from '@/lib/types';

const STAFF_ALLOWED: QuoteStatus[] = ['draft', 'pending_approval', 'sent_to_client', 'closed_won', 'closed_lost'];
const ADMIN_ONLY: QuoteStatus[] = ['approved', 'client_approved', 'client_rejected'];

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { denied, profile, supabase } = await requireStaff();
  if (denied) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const next: QuoteStatus = body?.status;
  if (!next) return NextResponse.json({ error: 'Missing status' }, { status: 400 });
  if (ADMIN_ONLY.includes(next) && profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only transition' }, { status: 403 });
  }
  if (!STAFF_ALLOWED.includes(next) && !ADMIN_ONLY.includes(next)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const patch: any = { status: next };
  if (next === 'sent_to_client') patch.sent_at = new Date().toISOString();

  const { error } = await supabase
    .from('quotes')
    .update(patch)
    .eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_log').insert({
    actor_id: profile.id,
    actor_email: profile.email,
    action: 'quote.status',
    entity_type: 'quote',
    entity_id: params.id,
    diff: { status: next },
  });

  return NextResponse.json({ ok: true });
}
