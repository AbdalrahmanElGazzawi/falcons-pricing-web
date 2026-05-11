import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAvailability, type AvailabilityRequest } from '@/lib/availability';

export const runtime = 'nodejs';

/**
 * POST /api/availability/check
 *
 * Body: AvailabilityRequest
 *   { talent_ids: number[], brand: string, brand_parent?: string|null,
 *     category_code: string, delivery_date?: string, territory?: string|null }
 *
 * Returns: { results: Record<talent_id, AvailabilityResult> }
 *
 * Auth: any authenticated user (commercial reps need this during quote building).
 */
export async function POST(req: Request) {
  const { denied, supabase } = await requireAuth();
  if (denied) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  let body: AvailabilityRequest;
  try {
    body = (await req.json()) as AvailabilityRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || !Array.isArray(body.talent_ids) || body.talent_ids.length === 0) {
    return NextResponse.json({ error: 'talent_ids[] required' }, { status: 400 });
  }
  if (!body.brand || typeof body.brand !== 'string') {
    return NextResponse.json({ error: 'brand (string) required' }, { status: 400 });
  }
  if (!body.category_code || typeof body.category_code !== 'string') {
    return NextResponse.json({ error: 'category_code (string) required' }, { status: 400 });
  }

  const results = await getAvailability(supabase, body);
  return NextResponse.json({ results });
}
