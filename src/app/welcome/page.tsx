import { requireStaff } from '@/lib/auth';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { WelcomeContent } from './WelcomeContent';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function WelcomePage() {
  const { denied, profile } = await requireStaff();
  if (denied) return <AccessDenied />;

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <WelcomeContent
        role={profile.role}
        email={profile.email}
        fullName={profile.full_name ?? null}
      />
    </Shell>
  );
}
