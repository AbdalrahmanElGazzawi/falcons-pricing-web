// Admin unlock — clear lockout so the talent can revise once more without
// resetting their submission.

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
    .select('id, nickname, intake_locked_until, intake_revision_count')
    .eq('id', id)
    .maybeSingle();
  if (!before) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

  const { error } = await supabase
    .from('players')
    .update({
      intake_locked_until: null,
      intake_revision_count: 0,
    })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void supabase.from('audit_log').insert({
    actor_email: auth.profile.email,
    actor_kind:  'human',
    action:      'admin.talent_intake_unlocked',
    entity_type: 'player',
    entity_id:   String(id),
    diff: { nickname: before.nickname, before: {
      intake_locked_until: before.intake_locked_until,
      intake_revision_count: before.intake_revision_count,
    } },
  }).then(() => null);

  return NextResponse.json({ ok: true });
}
