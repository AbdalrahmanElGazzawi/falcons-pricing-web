import { requireStaff } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { QuoteBuilder } from './QuoteBuilder';

export const dynamic = 'force-dynamic';

export default async function NewQuotePage() {
  const { denied, profile, supabase } = await requireStaff();
  if (denied) return <AccessDenied />;

  const [
    { data: players },
    { data: creators },
    { data: tiers },
    { data: addons },
  ] = await Promise.all([
    supabase.from('players').select('*').eq('is_active', true).order('nickname'),
    supabase.from('creators').select('*').eq('is_active', true).order('nickname'),
    supabase.from('tiers').select('*').order('sort_order'),
    supabase.from('addons').select('*').eq('is_active', true).order('sort_order'),
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
      />
    </Shell>
  );
}
