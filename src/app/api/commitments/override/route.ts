import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * POST /api/commitments/override
 *
 * Logs an override event when a sales rep force-adds a ⛔ blocked line to a quote.
 *
 * Body:
 *   { talent_id: number, commitment_id?: number|null,
 *     quote_id?: number|null, reason: string (min 20 chars), brand?: string,
 *     category_code?: string }
 *
 * Auth: admin only (Koge / Jordan / legal). Reps see the ⛔ badge but cannot
 * override on their own — they have to escalate. This matches the user's
 * "edit=admin, view=commercial" decision.
 */
export async function POST(req: Request) {
  const { denied, profile, supabase } = await requireAdmin();
  if (denied) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const talent_id = Number(body?.talent_id);
  const commitment_id =
    body?.commitment_id == null ? null : Number(body.commitment_id);
  const quote_id = body?.quote_id == null ? null : Number(body.quote_id);
  const reason = String(body?.reason ?? '').trim();

  if (!Number.isFinite(talent_id) || talent_id <= 0) {
    return NextResponse.json({ error: 'talent_id required' }, { status: 400 });
  }
  if (reason.length < 20) {
    return NextResponse.json(
      { error: 'reason must be at least 20 characters' },
      { status: 400 },
    );
  }

  const repId = profile?.id ?? profile?.user_id ?? 'unknown';
  const repEmail = profile?.email ?? null;

  const { data, error } = await supabase
    .from('commitment_override_log')
    .insert({
      rep_id: repId,
      rep_email: repEmail,
      talent_id,
      commitment_id,
      quote_id,
      reason,
    })
    .select('id, created_at')
    .single();

  if (error) {
    return NextResponse.json(
      { error: 'Failed to log override', detail: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, override: data });
}
