import { requireAdmin } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { TiersTable } from './TiersTable';

export const dynamic = 'force-dynamic';

export default async function TiersAdmin() {
  const { denied, profile, supabase } = await requireAdmin();
  if (denied) return <AccessDenied message="Admin only." />;

  const { data: tiers } = await supabase.from('tiers').select('*').order('sort_order');

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <PageHeader
        title="Tier Progression"
        subtitle="Floor share, fee bands, and promotion / demotion triggers per tier."
      />
      <TiersTable tiers={tiers ?? []} />
    </Shell>
  );
}
