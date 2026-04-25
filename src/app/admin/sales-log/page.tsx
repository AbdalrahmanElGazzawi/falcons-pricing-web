import { requireStaff } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { SalesLogTable } from './SalesLogTable';

export const dynamic = 'force-dynamic';

export default async function SalesLogPage() {
  const { denied, profile, supabase } = await requireStaff();
  if (denied) return <AccessDenied />;

  const { data: rows } = await supabase
    .from('sales_log')
    .select('*')
    .order('deal_date', { ascending: false })
    .order('created_at', { ascending: false });

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <PageHeader
        title="Sales Log"
        subtitle="Realized-revenue ledger — invoices issued, payments collected, deals in progress"
      />
      <SalesLogTable initial={rows ?? []} />
    </Shell>
  );
}
