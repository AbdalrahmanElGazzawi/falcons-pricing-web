import { requireSuperAdmin } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { IntakesTable } from './IntakesTable';

export const dynamic = 'force-dynamic';

export default async function TalentIntakesPage() {
  const { denied, profile, supabase } = await requireSuperAdmin();
  if (denied) return <AccessDenied />;

  const { data: playersRows } = await supabase
    .from('players')
    .select('id, nickname, full_name, tier_code, role, game, team, is_active, intake_token, intake_status, intake_sent_at, intake_submitted_at, min_rates, min_rates_notes, avatar_url, nationality')
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
  };

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <PageHeader
        title="Talent intake — minimum rates"
        subtitle="Send each player their private link. They submit the SAR floor they'll accept per deliverable; pricing engine respects it as a hard floor."
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Tile label="Active players" value={counts.total} />
        <Tile label="Submitted"      value={counts.submitted} accent="green" />
        <Tile label="Link sent, no reply" value={counts.sent} accent="amber" />
        <Tile label="Not started"    value={counts.pending} />
      </div>

      <IntakesTable players={players} />
    </Shell>
  );
}

function Tile({ label, value, accent }: { label: string; value: number; accent?: 'green' | 'amber' }) {
  const cls = accent === 'green'
    ? 'border-greenDark/30 bg-greenSoft/40 text-greenDark'
    : accent === 'amber'
      ? 'border-amber-300 bg-amber-50 text-amber-800'
      : 'border-line bg-card text-ink';
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <div className="text-[11px] uppercase tracking-wider opacity-80 font-bold">{label}</div>
      <div className="text-2xl font-extrabold tabular-nums">{value}</div>
    </div>
  );
}
