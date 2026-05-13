import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase-server';
import AgencyIntakeForm from './AgencyIntakeForm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function AgencyIntakePage({ params }: { params: { token: string } }) {
  const supabase = createServiceClient();

  // Validate token
  const { data: tok } = await supabase
    .from('agency_intake_tokens')
    .select('token, agency_name, agency_email, scope_talent_ids, expires_at, used_at')
    .eq('token', params.token)
    .maybeSingle();

  if (!tok) notFound();
  const expired = tok.expires_at && new Date(tok.expires_at) < new Date();
  if (expired) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold mb-2">This intake link has expired</h1>
        <p className="text-sm text-mute">Please reach out to Team Falcons commercial to request a new link.</p>
      </main>
    );
  }

  // Load the players in scope
  const ids: number[] = tok.scope_talent_ids ?? [];
  const { data: players } = await supabase
    .from('players')
    .select('id, nickname, full_name, game, team, role, agency_name, independent_sponsorship_clause_type, independent_sponsorship_notice_days, independent_sponsorship_clause_text, contract_source_doc_link')
    .in('id', ids);

  // Existing commitments for those players (so agency sees what's already on file)
  const { data: commits } = await supabase
    .from('v_talent_brand_commitments_with_economics')
    .select('id, talent_id, brand, brand_parent, commercial_category_id, sub_category, exclusivity_scope, exclusivity_type, term_start, term_end, status')
    .in('talent_id', ids);

  // Commercial categories for the dropdown
  const { data: cats } = await supabase
    .from('commercial_categories')
    .select('id, code, name, parent_code, sort_order')
    .eq('is_active', true)
    .order('sort_order');

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Brand commitments — {tok.agency_name}
        </h1>
        <p className="mt-2 text-sm text-mute">
          For each player below, please submit the current, previous, and future brand commitments you've negotiated on their behalf.
          What you fill here directly feeds Team Falcons' commercial collision check so we never pitch a brand that conflicts with your client's existing deals.
        </p>
        <p className="mt-1 text-xs text-mute">
          Scope: {(players ?? []).length} player{(players ?? []).length === 1 ? '' : 's'}.
          Token expires {tok.expires_at ? new Date(tok.expires_at).toISOString().slice(0,10) : '—'}.
        </p>
      </header>
      <AgencyIntakeForm
        token={params.token}
        agencyName={tok.agency_name}
        players={(players ?? []).map((p: any) => ({
          id: p.id, nickname: p.nickname, full_name: p.full_name ?? null,
          game: p.game ?? null, team: p.team ?? null, role: p.role ?? null,
          independent_sponsorship_clause_type: p.independent_sponsorship_clause_type ?? null,
          independent_sponsorship_notice_days: p.independent_sponsorship_notice_days ?? null,
          independent_sponsorship_clause_text: p.independent_sponsorship_clause_text ?? null,
          contract_source_doc_link: p.contract_source_doc_link ?? null,
        }))}
        existing={(commits ?? []).map((c: any) => ({
          id: c.id, talent_id: c.talent_id, brand: c.brand, brand_parent: c.brand_parent,
          category_id: c.commercial_category_id, sub_category: c.sub_category,
          exclusivity_scope: c.exclusivity_scope, exclusivity_type: c.exclusivity_type,
          term_start: c.term_start, term_end: c.term_end, status: c.status,
        }))}
        categories={(cats ?? []).map(c => ({ id: c.id, code: c.code, name: c.name, parent_code: c.parent_code }))}
      />
    </main>
  );
}
