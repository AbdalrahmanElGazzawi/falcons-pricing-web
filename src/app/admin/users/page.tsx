import { requireSuperAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase-server';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { UsersTable } from './UsersTable';

export const dynamic = 'force-dynamic';

export default async function UsersAdminPage() {
  const { denied, profile } = await requireSuperAdmin();
  if (denied) return <AccessDenied message="Super-admin only." />;

  // Use service client so we can list ALL profiles (even inactive)
  const sb = createServiceClient();
  const { data: users } = await sb
    .from('profiles')
    .select('id, email, full_name, role, is_active, created_at')
    .order('created_at', { ascending: true });

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <PageHeader
        title="Users & Access"
        subtitle="Invite team members and assign roles. Only admins can manage users."
      />
      <UsersTable users={users ?? []} currentUserId={profile.id} />
    </Shell>
  );
}
