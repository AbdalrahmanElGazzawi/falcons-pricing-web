import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { RosterOverview } from './RosterOverview';

export const dynamic = 'force-dynamic';

export default async function RosterPage() {
  const { denied, profile, supabase } = await requireStaff();
  if (denied) return <AccessDenied />;

  const [{ data: players }, { data: tiers }] = await Promise.all([
    supabase.from('players').select('*').eq('is_active', true)
      .order('tier_code', { ascending: true })
      .order('nickname', { ascending: true }),
    supabase.from('tiers').select('code, label').order('sort_order'),
  ]);

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <PageHeader
        title="Roster"
        subtitle="Players · Coaches · Management · Analysts · Influencers — everyone in one editable view"
        action={
          <div className="flex items-center gap-2">
            <Link href="/roster/audit" className="btn btn-ghost text-xs" title="Per-player rate audit vs methodology">Audit pricing</Link>
            <Link href="/admin/data-audit" className="btn btn-ghost text-xs" title="Liquipedia coverage + achievement weighting per player">Data audit</Link>
            {profile.role === 'admin' && (
              <Link href="/admin/players/new" className="btn btn-primary">+ Add roster member</Link>
            )}
          </div>
        }
      />
      <RosterOverview
        players={players ?? []}
        tiers={tiers ?? []}
        isAdmin={profile.role === 'admin'}
      />
    </Shell>
  );
}
