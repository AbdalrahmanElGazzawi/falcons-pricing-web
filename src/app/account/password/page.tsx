import { requireAuth } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { ChangePasswordForm } from './ChangePasswordForm';

export const dynamic = 'force-dynamic';

export default async function ChangePasswordPage() {
  const { profile } = await requireAuth();

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <PageHeader
        title="Change password"
        subtitle="Keep it to yourself. You'll be signed out of other browsers after changing it."
      />
      <ChangePasswordForm email={profile.email} />
    </Shell>
  );
}
