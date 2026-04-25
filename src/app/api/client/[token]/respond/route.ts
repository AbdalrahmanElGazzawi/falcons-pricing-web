import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: { token: string } }) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const decision = body?.decision;
  if (decision !== 'approved' && decision !== 'rejected') {
    return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
  }
  const respondentName = (body?.name ?? '').toString().trim().slice(0, 200);
  const respondentEmail = (body?.email ?? '').toString().trim().slice(0, 200);
  if (decision === 'approved' && !respondentName) {
    return NextResponse.json({ error: 'Name is required to accept' }, { status: 400 });
  }
  if (decision === 'rejected' && !respondentName) {
    return NextResponse.json({ error: 'Name is required to decline' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: quote } = await supabase
    .from('quotes')
    .select('id, status, client_responded_at')
    .eq('client_token', params.token)
    .single();

  if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (quote.status !== 'sent_to_client') {
    return NextResponse.json({ error: 'Quote is not awaiting a response' }, { status: 400 });
  }
  if (quote.client_responded_at) {
    return NextResponse.json({ error: 'Already responded' }, { status: 400 });
  }

  const nextStatus = decision === 'approved' ? 'client_approved' : 'client_rejected';
  const now = new Date().toISOString();
  const update: Record<string, any> = {
    status: nextStatus,
    client_responded_at: now,
    client_response: decision,
    accepted_by_name: respondentName,
    accepted_by_email: respondentEmail || null,
  };
  if (decision === 'approved') update.accepted_at = now;
  if (decision === 'rejected') {
    update.declined_at = now;
    if (body.comment) update.decline_reason = String(body.comment).slice(0, 1000);
  }
  if (body.comment) {
    update.internal_notes = `[Client ${decision} ${now} — ${respondentName}]\n${body.comment}`;
  }
  const { error } = await supabase
    .from('quotes')
    .update(update)
    .eq('id', quote.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_log').insert({
    actor_email: respondentEmail || 'client@portal',
    actor_kind: 'system',
    action: `quote.client.${decision}`,
    entity_type: 'quote',
    entity_id: quote.id,
    diff: { decision, name: respondentName, email: respondentEmail || null, comment: body.comment ?? null },
  });

  return NextResponse.json({ ok: true });
}
