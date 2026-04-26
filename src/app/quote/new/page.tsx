import { requireStaff, isSuperAdminEmail } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { QuoteBuilder } from './QuoteBuilder';
import { getPageLayout } from '@/lib/layout';

export const dynamic = 'force-dynamic';

const QUOTE_NEW_DEFAULT_ORDER = ['header', 'globals', 'addons', 'lines', 'notes_totals'];

export default async function NewQuotePage() {
  const { denied, profile, supabase } = await requireStaff();
  if (denied) return <AccessDenied />;

  const [
    { data: players },
    { data: creators },
    { data: tiers },
    { data: addons },
    sectionOrder,
    { data: draftsRaw },
  ] = await Promise.all([
    supabase.from('players').select('*').eq('is_active', true).order('nickname'),
    supabase.from('creators').select('*').eq('is_active', true).order('nickname'),
    supabase.from('tiers').select('*').order('sort_order'),
    supabase.from('addons').select('*').eq('is_active', true).order('sort_order'),
    getPageLayout(supabase, 'quote/new', QUOTE_NEW_DEFAULT_ORDER),
    // List of the user's most recent drafts — used by the "Load draft" picker on
    // the New Quote page so they can resume work on a previously-saved draft.
    supabase
      .from('quotes')
      .select('id, quote_number, client_name, campaign, currency, total, updated_at, owner_email, owner_id')
      .eq('status', 'draft')
      .or(`owner_id.eq.${profile.id},owner_email.eq.${profile.email}`)
      .order('updated_at', { ascending: false })
      .limit(25),
  ]);

  const drafts = (draftsRaw ?? []).map(d => ({
    id: d.id as string,
    quote_number: (d.quote_number as string) ?? '',
    client_name: (d.client_name as string) ?? '',
    campaign: (d.campaign as string | null) ?? null,
    currency: (d.currency as string) ?? 'SAR',
    total: Number(d.total ?? 0),
    updated_at: (d.updated_at as string) ?? '',
  }));

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <PageHeader
        title="New Quote"
        subtitle="Build a campaign quote with the live 9-axis pricing engine"
      />
      <QuoteBuilder
        players={players ?? []}
        creators={creators ?? []}
        tiers={tiers ?? []}
        addons={addons ?? []}
        drafts={drafts}
        ownerEmail={profile.email}
        ownerName={profile.full_name || profile.email.split('@')[0]}
        ownerTitle={(profile as any).title || ''}
        initialSectionOrder={sectionOrder}
        canEditLayout={isSuperAdminEmail(profile.email)}
      />
    </Shell>
  );
}
