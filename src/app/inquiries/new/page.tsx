import { requireStaff } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { InquiryForm } from './InquiryForm';

export const dynamic = 'force-dynamic';

export default async function NewInquiryPage() {
  const { denied, profile } = await requireStaff();
  if (denied) return <AccessDenied />;

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <PageHeader
        title="Log inbound inquiry"
        subtitle="Paste the message, capture the asks. Triage and quote later."
        crumbs={[{ label: 'Inquiries', href: '/inquiries' }, { label: 'New' }]}
      />
      <InquiryForm />
    </Shell>
  );
}
