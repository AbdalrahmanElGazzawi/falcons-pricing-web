import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { denied, supabase } = await requireStaff();
  if (denied) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  // Pull a flat catalog. Capped at sensible sizes — fuzzy filter is client-side.
  const [quotesRes, playersRes, creatorsRes, inquiriesRes] = await Promise.all([
    supabase.from('quotes')
      .select('id, quote_number, client_name, campaign, status, total, currency, updated_at')
      .order('updated_at', { ascending: false })
      .limit(200),
    supabase.from('players')
      .select('id, name, ign, game, tier, ingame_role, active')
      .eq('active', true)
      .limit(500),
    supabase.from('creators')
      .select('id, name, handle, content_type, tier, active')
      .eq('active', true)
      .limit(500),
    supabase.from('inquiries')
      .select('id, brand_name, contact_name, status, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  const items: Array<{
    kind: 'quote' | 'player' | 'creator' | 'inquiry';
    title: string;
    subtitle: string;
    href: string;
    keywords: string;
  }> = [];

  for (const q of quotesRes.data || []) {
    items.push({
      kind: 'quote',
      title: `${q.quote_number} — ${q.client_name}`,
      subtitle: [q.campaign, q.status, q.total ? `${q.currency} ${Math.round(q.total).toLocaleString()}` : null].filter(Boolean).join(' · '),
      href: `/quote/${q.id}`,
      keywords: `${q.quote_number} ${q.client_name} ${q.campaign ?? ''} ${q.status}`.toLowerCase(),
    });
  }

  for (const p of playersRes.data || []) {
    items.push({
      kind: 'player',
      title: p.ign || p.name,
      subtitle: [p.game, p.ingame_role, `Tier ${p.tier}`].filter(Boolean).join(' · '),
      href: `/roster/players?focus=${p.id}`,
      keywords: `${p.ign ?? ''} ${p.name} ${p.game ?? ''} ${p.ingame_role ?? ''}`.toLowerCase(),
    });
  }

  for (const c of creatorsRes.data || []) {
    items.push({
      kind: 'creator',
      title: c.handle ? `@${c.handle}` : c.name,
      subtitle: [c.name, c.content_type, `Tier ${c.tier}`].filter(Boolean).join(' · '),
      href: `/roster/creators?focus=${c.id}`,
      keywords: `${c.handle ?? ''} ${c.name} ${c.content_type ?? ''}`.toLowerCase(),
    });
  }

  for (const i of inquiriesRes.data || []) {
    items.push({
      kind: 'inquiry',
      title: i.brand_name || i.contact_name || 'Untitled inquiry',
      subtitle: [i.contact_name, i.status, new Date(i.created_at).toLocaleDateString('en-GB')].filter(Boolean).join(' · '),
      href: `/inquiries`,
      keywords: `${i.brand_name ?? ''} ${i.contact_name ?? ''} ${i.status}`.toLowerCase(),
    });
  }

  return NextResponse.json({ items });
}
