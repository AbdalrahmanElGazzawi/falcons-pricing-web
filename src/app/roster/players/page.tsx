import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { fmtMoney, tierClass } from '@/lib/utils';
import { PlayersTable } from './PlayersTable';

export const dynamic = 'force-dynamic';

export default async function PlayersPage() {
  const { denied, profile, supabase } = await requireStaff();
  if (denied) return <AccessDenied />;

  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('is_active', true)
    .order('tier_code', { ascending: true })
    .order('nickname', { ascending: true });

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <PageHeader
        title="Player Rate Card"
        subtitle={`${players?.length ?? 0} active players — read-only for sales, admins can edit`}
        action={profile.role === 'admin' ? (
          <Link href="/admin/players/new" className="btn btn-primary">+ Add player</Link>
        ) : undefined}
      />
      <PlayersTable players={players ?? []} isAdmin={profile.role === 'admin'} />
    </Shell>
  );
}
