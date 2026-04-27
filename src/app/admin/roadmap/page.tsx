import Link from 'next/link';
import { requireStaff, isSuperAdminEmail } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { RoadmapView } from './RoadmapView';

export const dynamic = 'force-dynamic';

export default async function RoadmapPage() {
  const { denied, profile, supabase } = await requireStaff();
  if (denied) return <AccessDenied />;

  const { data: kb } = await supabase
    .from('pricing_kb')
    .select('id, title, body, icon, tone, sort_order')
    .eq('section', 'roadmap')
    .eq('is_active', true)
    .order('sort_order');

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <PageHeader
        title="Pricing OS Roadmap"
        subtitle="Where the methodology is today, what Shikenso unlocks next, and the steady-state cadence — anchored to SOT v1.0."
        action={isSuperAdminEmail(profile.email) ? (
          <Link href="/admin/pricing#roadmap" className="btn btn-ghost text-sm">Edit in Pricing OS →</Link>
        ) : undefined}
      />
      <RoadmapView entries={kb ?? []} />
    </Shell>
  );
}
