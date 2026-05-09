import { requireStaff } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { DealsContent } from './DealsContent';

export const dynamic = 'force-dynamic';

export default async function DealsPage() {
  const { denied, profile, supabase } = await requireStaff();
  if (denied) return <AccessDenied />;

  const { data: deals } = await supabase
    .from('deals')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  const { data: metrics } = await supabase
    .from('v_deal_metrics')
    .select('*');

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <PageHeader
        title="Closed-Deal Log"
        subtitle="Log quoted vs closed price after each deal. Powers price-elasticity learning (V2)."
      />
      <DealsContent deals={deals ?? []} metrics={metrics ?? []} />
    </Shell>
  );
}
