import { requireStaff } from '@/lib/auth';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { RoadmapContent } from './RoadmapContent';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export const metadata = {
  title: 'Roadmap — Team Falcons Pricing',
  description: 'Today, with Shikenso, and the steady-state pricing engine.',
};

export default async function RoadmapPage() {
  const { denied, profile } = await requireStaff();
  if (denied) return <AccessDenied />;

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <RoadmapContent />
    </Shell>
  );
}
