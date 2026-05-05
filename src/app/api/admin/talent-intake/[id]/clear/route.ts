// Admin clear of a talent's submission (Migration 058).
// Wipes min_rates, resets intake_status to 'not_started', clears lockout
// + revision_count. Talent can resubmit fresh.

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/auth';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSuperAdmin();
  if (auth.denied) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: before } = await supabase
    .from('players')
    .select('id, nickname, min_rates, min_rates_notes, intake_status, intake_revision_count, intake_locked_until')
    .eq('id', id)
    .maybeSingle();
  if (!before) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

  const { error } = await supabase
    .from('players')
    .update({
      min_rates: {},
      min_rates_notes: null,
      intake_status: 'not_started',
      intake_submitted_at: null,
      intake_revision_count: 0,
      intake_locked_until: null,
    })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void supabase.from('audit_log').insert({
    actor_email: auth.profile.email,
    actor_kind:  'human',
    action:      'admin.talent_intake_cleared',
    entity_type: 'player',
    entity_id:   String(id),
    diff: { nickname: before.nickname, before: {
      min_rates: before.min_rates ?? {},
      intake_status: before.intake_status,
      intake_revision_count: before.intake_revision_count,
      intake_locked_until: before.intake_locked_until,
    } },
  }).then(() => null);

  return NextResponse.json({ ok: true });
}
