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
  ] = await Promise.all([
    supabase.from('players').select('*').eq('is_active', true).order('nickname'),
    supabase.from('creators').select('*').eq('is_active', true).order('nickname'),
    supabase.from('tiers').select('*').order('sort_order'),
    supabase.from('addons').select('*').eq('is_active', true).order('sort_order'),
    getPageLayout(supabase, 'quote/new', QUOTE_NEW_DEFAULT_ORDER),
  ]);

  return (
    <Shell role={profile.role} email={profile.email}>
      <PageHeader
        title="New Quote"
        subtitle="Build a campaign quote with the live 9-axis pricing engine"
      />
      <QuoteBuilder
        players={players ?? []}
        creators={creators ?? []}
        tiers={tiers ?? []}
        addons={addons ?? []}
        ownerEmail={profile.email}
        initialSectionOrder={sectionOrder}
        canEditLayout={isSuperAdminEmail(profile.email)}
      />
    </Shell>
  );
}
