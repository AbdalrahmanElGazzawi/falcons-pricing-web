import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * DELETE /api/quote/[id] — super-admin only.
 * Drops the quote row (cascades to quote_lines + quote_addons via FK).
 * Audit-logged.
 */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { denied, profile, supabase } = await requireSuperAdmin();
  if (denied) return NextResponse.json({ error: 'Super admin only' }, { status: 403 });

  // Snapshot the row first so audit_log keeps a copy
  const { data: prev } = await supabase
    .from('quotes')
    .select('id, quote_number, client_name, campaign, status, total, currency, owner_email')
    .eq('id', params.id)
    .single();

  const { error } = await supabase.from('quotes').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_log').insert({
    actor_id: profile.id,
    actor_email: profile.email,
    actor_kind: 'human',
    action: 'quote.delete',
    entity_type: 'quote',
    entity_id: params.id,
    diff: { deleted: prev },
  });

  return NextResponse.json({ ok: true });
}
