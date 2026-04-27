import { requireStaff } from '@/lib/auth';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { AboutContent } from './AboutContent';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export const metadata = {
  title: 'About — Team Falcons Pricing',
  description: 'How Team Falcons prices talent — methodology, sources, and the data quality ladder.',
};

export default async function AboutPage() {
  const { denied, profile } = await requireStaff();
  if (denied) return <AccessDenied />;

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <AboutContent />
    </Shell>
  );
}
