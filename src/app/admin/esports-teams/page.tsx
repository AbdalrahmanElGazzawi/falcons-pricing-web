import { requireAdmin } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { EsportsTeamsEditor } from './EsportsTeamsEditor';

export const dynamic = 'force-dynamic';

export default async function EsportsTeamsPage() {
  const { denied, profile, supabase } = await requireAdmin();
  if (denied) return <AccessDenied />;
  const { data: rows } = await supabase.from('esports_teams').select('*').order('sort_order').order('game');

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <PageHeader
        title="Owned Media — Team Channels"
        subtitle="The social handles Falcons owns per game. These are the assets we sell directly to brands."
      />
      <EsportsTeamsEditor initial={rows ?? []} />
    </Shell>
  );
}
