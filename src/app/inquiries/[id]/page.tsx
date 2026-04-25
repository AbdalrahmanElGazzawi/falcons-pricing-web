import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff, isSuperAdminEmail } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { InquiryDetail } from './InquiryDetail';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function InquiryDetailPage({ params }: { params: { id: string } }) {
  const { denied, profile, supabase } = await requireStaff();
  if (denied) return <AccessDenied />;

  const { data: inquiry } = await supabase
    .from('inquiries')
    .select('*')
    .eq('id', params.id)
    .single();
  if (!inquiry) notFound();

  // If linked to a quote, fetch its number for the cross-link
  let linkedQuote: { id: string; quote_number: string; status: string } | null = null;
  if (inquiry.quote_id) {
    const { data: q } = await supabase
      .from('quotes').select('id, quote_number, status').eq('id', inquiry.quote_id).single();
    if (q) linkedQuote = q;
  }

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <PageHeader
        title={`${inquiry.brand} · ${inquiry.inquiry_number}`}
        subtitle={inquiry.campaign || inquiry.agency || 'Inbound inquiry'}
        crumbs={[{ label: 'Inquiries', href: '/inquiries' }, { label: inquiry.inquiry_number }]}
        action={
          <Link href="/inquiries" className="btn btn-ghost text-sm">
            <ArrowLeft size={14} /> All inquiries
          </Link>
        }
      />
      <InquiryDetail
        inquiry={inquiry}
        linkedQuote={linkedQuote}
        canDelete={isSuperAdminEmail(profile.email)}
      />
    </Shell>
  );
}
