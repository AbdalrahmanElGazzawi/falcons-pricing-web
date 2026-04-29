import Link from 'next/link';
import { requireStaff, isSuperAdminEmail } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { RoadmapContent } from './RoadmapContent';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export const metadata = {
  title: 'Roadmap — Team Falcons Pricing',
  description: 'Pricing OS roadmap — engine state and capability roadmap through 2027+.',
};

export default async function RoadmapPage() {
  const { denied, profile, supabase } = await requireStaff();
  if (denied) return <AccessDenied />;

  const { data: kb } = await supabase
    .from('pricing_kb')
    .select('id, title, body, icon, tone, sort_order')
    .eq('section', 'roadmap')
    .eq('is_active', true)
    .order('sort_order');

  const isSuper = isSuperAdminEmail(profile.email);

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <PageHeader
        title="Pricing OS Roadmap"
        subtitle="Where the engine is today, what's building, and what's planned through 2027+."
        action={isSuper ? (
          <Link href="/admin/pricing#roadmap" className="btn btn-primary text-sm">
            Edit phases in Pricing OS →
          </Link>
        ) : undefined}
      />
      <RoadmapContent entries={kb ?? []} canEdit={isSuper} />
    </Shell>
  );
}
