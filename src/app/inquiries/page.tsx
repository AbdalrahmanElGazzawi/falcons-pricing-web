import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { InquiriesList } from './InquiriesList';
import { Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function InquiriesPage() {
  const { denied, profile, supabase } = await requireStaff();
  if (denied) return <AccessDenied />;

  const { data: rows } = await supabase
    .from('inquiries')
    .select('id, inquiry_number, brand, agency, campaign, source, type, status, deliverables, created_at, owner_id, quote_id')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <PageHeader
        title="Inbound Inquiries"
        subtitle="Brand DMs, agency emails, partnership pitches — captured here so they stop living in scattered chat threads."
        action={
          <Link href="/inquiries/new" className="btn btn-primary">
            <Plus size={16} /> Log inbound
          </Link>
        }
      />
      <InquiriesList rows={rows ?? []} />
    </Shell>
  );
}
