import Link from 'next/link';
import { requireStaff, isSuperAdminEmail } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { QuotesTable } from './QuotesTable';
import { PlusCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function QuotesPage() {
  const { denied, profile, supabase } = await requireStaff();
  if (denied) return <AccessDenied />;

  const { data: quotes } = await supabase
    .from('quotes')
    .select('id, quote_number, client_name, campaign, status, total, currency, usd_rate, owner_email, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <PageHeader
        title="Quote Log"
        subtitle={`${quotes?.length ?? 0} quotes — most recent first`}
        action={
          <Link href="/quote/new" className="btn btn-primary">
            <PlusCircle size={16} /> New quote
          </Link>
        }
      />
      <QuotesTable quotes={quotes ?? []} canDelete={isSuperAdminEmail(profile.email)} />
    </Shell>
  );
}
