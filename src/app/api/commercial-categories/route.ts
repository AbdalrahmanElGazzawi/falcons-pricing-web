import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * GET /api/commercial-categories
 *
 * Returns the controlled vocabulary used by:
 *  - QuoteBuilder Campaign step (brand pitch category dropdown)
 *  - Team Commercial Intake form (per-commitment category select)
 *
 * Auth: any authenticated user.
 */
export async function GET() {
  const { denied, supabase } = await requireAuth();
  if (denied) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('commercial_categories')
    .select('id, code, name, parent_code, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ categories: data ?? [] });
}
