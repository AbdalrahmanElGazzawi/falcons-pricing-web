// Admin "approve as submitted" — promotes intake_status from 'submitted'
// or 'revised' to 'approved' WITHOUT touching the talent's submitted
// min_rates / agency block. The Override route covers the edit-then-approve
// path; this route covers the simpler one-click approve-as-is workflow
// where admin reviewed and the talent's submission is acceptable as-submitted.
//
// Requires admin or super-admin auth. Audit-logged.

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdminOrSuper } from '@/lib/auth';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminOrSuper();
  if (auth.denied) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: before } = await supabase
    .from('players')
    .select('id, nickname, intake_status, min_rates, agency_status, agency_fee_pct')
    .eq('id', id)
    .maybeSingle();
  if (!before) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

  // Only meaningful from submitted / revised. If already approved, no-op
  // (return success so UI can debounce).
  if (before.intake_status === 'approved') {
    return NextResponse.json({ ok: true, already: true });
  }
  if (!['submitted', 'revised'].includes(String(before.intake_status))) {
    return NextResponse.json({
      error: `Cannot approve from status '${before.intake_status}'. Talent must submit first.`,
    }, { status: 400 });
  }

  const { error } = await supabase
    .from('players')
    .update({
      intake_status: 'approved',
      intake_admin_override_at: new Date().toISOString(),
      intake_admin_override_by: auth.profile.email,
    })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void supabase.from('audit_log').insert({
    actor_email: auth.profile.email,
    actor_kind:  'human',
    action:      'admin.talent_intake_approve',
    entity_type: 'player',
    entity_id:   String(id),
    diff: {
      from: before.intake_status,
      to: 'approved',
      min_rates_unchanged: before.min_rates ?? {},
      agency_status: before.agency_status,
      agency_fee_pct: before.agency_fee_pct,
    },
  });

  return NextResponse.json({ ok: true });
}
