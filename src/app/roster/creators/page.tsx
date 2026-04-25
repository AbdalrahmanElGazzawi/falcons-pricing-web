import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { CreatorsTable } from './CreatorsTable';

export const dynamic = 'force-dynamic';

export default async function CreatorsPage() {
  const { denied, profile, supabase } = await requireStaff();
  if (denied) return <AccessDenied />;

  const { data: creators } = await supabase
    .from('creators')
    .select('*')
    .eq('is_active', true)
    .order('tier_code', { ascending: true })
    .order('score', { ascending: false, nullsFirst: false })
    .order('nickname', { ascending: true });

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <PageHeader
        title="Creator Rate Card"
        subtitle={`${creators?.length ?? 0} active creators — read-only for sales, admins can edit`}
        action={profile.role === 'admin' ? (
          <Link href="/admin/creators/new" className="btn btn-primary">+ Add creator</Link>
        ) : undefined}
      />
      <CreatorsTable creators={creators ?? []} isAdmin={profile.role === 'admin'} />
    </Shell>
  );
}
