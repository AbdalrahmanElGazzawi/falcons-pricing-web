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
  const { error } = await supabase
    .from('quotes')
    .update({
      status: nextStatus,
      client_responded_at: new Date().toISOString(),
      client_response: decision,
      internal_notes: body.comment
        ? `[Client response ${new Date().toISOString()}]\n${body.comment}`
        : undefined,
    })
    .eq('id', quote.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_log').insert({
    actor_email: 'client@portal',
    action: `quote.client.${decision}`,
    entity_type: 'quote',
    entity_id: quote.id,
    diff: { decision, comment: body.comment ?? null },
  });

  return NextResponse.json({ ok: true });
}
