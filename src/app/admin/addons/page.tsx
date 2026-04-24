import { requireAdmin } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { AddonsTable } from './AddonsTable';

export const dynamic = 'force-dynamic';

export default async function AddonsAdmin() {
  const { denied, profile, supabase } = await requireAdmin();
  if (denied) return <AccessDenied message="Admin only." />;

  const { data: addons } = await supabase.from('addons').select('*').order('sort_order');

  return (
    <Shell role={profile.role} email={profile.email}>
      <PageHeader
        title="Add-on Rights Packages"
        subtitle="Configure rights uplifts that get applied per-quote line."
      />
      <AddonsTable addons={addons ?? []} />
    </Shell>
  );
}
