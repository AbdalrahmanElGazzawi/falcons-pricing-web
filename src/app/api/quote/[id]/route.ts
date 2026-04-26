import { NextResponse } from 'next/server';
import { requireStaff, requireSuperAdmin } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * GET /api/quote/[id] — staff only.
 * Returns a full quote (header + lines + add-ons) so the New Quote page
 * can rehydrate a saved draft into the builder. Restricted to status='draft'
 * and (the user's own quotes OR super admin) to keep things simple.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { denied, profile, supabase } = await requireStaff();
  if (denied) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const { data: header, error: hErr } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();
  if (hErr) return NextResponse.json({ error: hErr.message }, { status: 500 });
  if (!header) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Only allow loading the user's own drafts (admins can load any draft).
  const isOwner = header.owner_id === profile.id || header.owner_email === profile.email;
  const isAdmin = profile.role === 'admin';
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }
  if (header.status !== 'draft') {
    return NextResponse.json({ error: 'Only drafts can be loaded into the builder' }, { status: 400 });
  }

  const [{ data: lines }, { data: addonRows }] = await Promise.all([
    supabase.from('quote_lines').select('*').eq('quote_id', params.id).order('sort_order'),
    supabase.from('quote_addons').select('addon_id, months').eq('quote_id', params.id),
  ]);

  return NextResponse.json({
    header,
    lines: lines ?? [],
    addons: addonRows ?? [],
  });
}

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
