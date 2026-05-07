import { requireStaff } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { fetchAllActivations } from '@/lib/activations-server';
import { AdminActivationsContent } from './AdminActivationsContent';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Activations Catalogue — Team Falcons Pricing',
  description: 'Productized brand activations · 65 SKUs across 9 pillars and 11 Falcons IPs.',
};

export default async function AdminActivationsPage() {
  const { denied, profile } = await requireStaff();
  if (denied) return <AccessDenied />;

  const activations = await fetchAllActivations();

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <PageHeader
        title="Activations Catalogue"
        subtitle="Productized brand activations brands buy off-the-shelf. 65 SKUs across 9 pillars and 11 Falcons IPs. Read-only for now — editing lands in the next push."
      />
      <AdminActivationsContent initial={activations} />
    </Shell>
  );
}
