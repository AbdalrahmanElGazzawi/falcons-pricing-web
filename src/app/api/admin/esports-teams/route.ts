import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { denied, supabase } = await requireStaff();
  if (denied) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { data } = await supabase.from('esports_teams').select('*').order('sort_order').order('game');
  return NextResponse.json({ items: data ?? [] });
}
