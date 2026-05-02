import { requireSuperAdmin } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { IntakesTable } from './IntakesTable';
import { resolveTalentPhoto, audienceMarketFor } from '@/lib/talent-photo';

export const dynamic = 'force-dynamic';

export default async function TalentIntakesPage() {
  const { denied, profile, supabase } = await requireSuperAdmin();
  if (denied) return <AccessDenied />;

  const { data: playersRows } = await supabase
    .from('players')
    .select('id, nickname, full_name, tier_code, role, game, team, is_active, intake_token, intake_status, intake_sent_at, intake_submitted_at, min_rates, min_rates_notes, avatar_url, nationality, instagram, x_handle, tiktok, twitch, youtube, commission')
    .eq('is_active', true)
    .order('intake_status', { ascending: false })
    .order('nickname');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const players: any[] = playersRows ?? [];

  const counts = {
    total:     players.length,
    submitted: players.filter(p => ['submitted','approved','revised'].includes(p.intake_status)).length,
    sent:      players.filter(p => p.intake_status === 'sent').length,
    pending:   players.filter(p => p.intake_status === 'not_started').length,
    withPhoto: players.filter(p => resolveTalentPhoto(p).url !== null).length,
    explicitPhoto: players.filter(p => !!p.avatar_url).length,
    global:    players.filter(p => audienceMarketFor(p.nationality) === 'Global').length,
  };

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <PageHeader
        title="Talent intake — minimum rates"
        subtitle="Send each player their private link. They submit the SAR floor they'll accept per deliverable; pricing engine respects it as a hard floor."
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <Tile label="Active players" value={counts.total} />
        <Tile label="Submitted"      value={counts.submitted} accent="green" />
        <Tile label="Link sent, no reply" value={counts.sent} accent="amber" />
        <Tile label="Not started"    value={counts.pending} />
        <Tile label="With photo"     value={`${counts.withPhoto} / ${counts.total}`} sub={`${counts.explicitPhoto} uploaded · ${counts.withPhoto - counts.explicitPhoto} auto`} accent={counts.withPhoto === counts.total ? 'green' : undefined} />
        <Tile label="Global talents" value={counts.global} sub={"USD primary"} />
      </div>

      <IntakesTable players={players} />
    </Shell>
  );
}

function Tile({ label, value, sub, accent }: { label: string; value: number | string; sub?: string; accent?: 'green' | 'amber' }) {
  const cls = accent === 'green'
    ? 'border-greenDark/30 bg-greenSoft/40 dark:bg-green/15 text-greenDark dark:text-green'
    : accent === 'amber'
      ? 'border-amber-300 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
      : 'border-line bg-card text-ink';
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <div className="text-[11px] uppercase tracking-wider opacity-80 font-bold">{label}</div>
      <div className="text-2xl font-extrabold tabular-nums">{value}</div>
      {sub && <div className="text-[10px] opacity-75 mt-0.5">{sub}</div>}
    </div>
  );
}
