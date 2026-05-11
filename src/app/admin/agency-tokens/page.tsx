import { requireAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AgencyTokensClient from './AgencyTokensClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function AgencyTokensPage() {
  const { denied, supabase } = await requireAdmin();
  if (denied) redirect('/');

  const { data: players } = await supabase
    .from('players')
    .select('id, nickname, full_name, game, team, agency_name')
    .eq('is_active', true)
    .order('agency_name', { nullsFirst: false })
    .order('nickname');

  const { data: tokens } = await supabase
    .from('agency_intake_tokens')
    .select('token, agency_name, agency_email, scope_talent_ids, expires_at, used_at, created_at, notes')
    .order('created_at', { ascending: false });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Agency intake tokens</h1>
        <p className="mt-2 text-sm text-mute">
          Mint a tokenized URL for each agency. The agency uses the URL to submit current brand
          commitments for the players you scope to them — the data lands in <code>talent_brand_commitments</code>
          and immediately powers QuoteBuilder's brand-collision check.
        </p>
      </header>
      <AgencyTokensClient
        players={(players ?? []).map(p => ({
          id: p.id,
          nickname: p.nickname,
          full_name: p.full_name ?? null,
          game: p.game ?? null,
          team: p.team ?? null,
          agency_name: p.agency_name ?? null,
        }))}
        initialTokens={(tokens ?? []).map(t => ({
          token: t.token,
          agency_name: t.agency_name,
          agency_email: t.agency_email,
          scope_talent_ids: t.scope_talent_ids ?? [],
          expires_at: t.expires_at,
          used_at: t.used_at,
          created_at: t.created_at,
          notes: t.notes,
        }))}
      />
    </main>
  );
}
