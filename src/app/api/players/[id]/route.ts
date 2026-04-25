import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { denied, supabase } = await requireStaff();
  if (denied) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(data);
}
