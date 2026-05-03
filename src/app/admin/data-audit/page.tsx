import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { DataAuditTable, type AuditPlayer } from '@/components/DataAuditTable';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

/**
 * Data audit — explains the WHY behind every player's price.
 *
 * Each row surfaces:
 *   • Data completeness state (drives ConfidenceCap haircut)
 *   • Socials / tournament / audience flags (drives Authority floor scaling
 *     and which axes are gated)
 *   • Liquipedia coverage (URL set, last sync, scraped tournament data)
 *   • Achievement decay factor (recent major win → ×1.0; old win → <1.0)
 *
 * Sales reads this when an agent asks "why is X priced lower than Y" —
 * the answer is in this table, not in opinion.
 */
export default async function DataAuditPage() {
  const { denied, profile, supabase } = await requireAdmin();
  if (denied) return <AccessDenied message="Admin only." />;

  const { data: players } = await supabase
    .from('players')
    .select(`
      id, nickname, full_name, avatar_url, tier_code, role, game, team,
      has_social_data, has_tournament_data, has_audience_demo, data_completeness,
      liquipedia_url, liquipedia_synced_at,
      prize_money_24mo_usd, peak_tournament_tier, current_ranking,
      last_major_finish_date, last_major_placement, achievement_decay_factor,
      followers_ig, followers_x, followers_yt, followers_tiktok, followers_twitch
    `)
    .eq('is_active', true)
    .order('tier_code', { ascending: true })
    .order('nickname', { ascending: true });

  const rows = (players ?? []) as AuditPlayer[];

  // Top-line summary the user reads first
  const total = rows.length;
  const hasLP = rows.filter(r => !!r.liquipedia_url).length;
  const hasTour = rows.filter(r => !!r.has_tournament_data).length;
  const hasSoc = rows.filter(r => !!r.has_social_data).length;
  const hasAud = rows.filter(r => !!r.has_audience_demo).length;
  const decayed = rows.filter(r => Number(r.achievement_decay_factor ?? 1) < 0.90).length;

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <Link href="/roster/players" className="inline-flex items-center gap-1 text-sm text-label hover:text-ink mb-3">
        <ArrowLeft size={14} /> Players roster
      </Link>
      <PageHeader
        title="Data audit"
        subtitle="Liquipedia coverage, achievement weighting, and data completeness per player. This is the WHY behind the price."
      />

      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <SummaryTile label="Active players" value={total} />
        <SummaryTile label="Have Liquipedia URL" value={hasLP} of={total} tone={hasLP === total ? 'good' : 'warn'} />
        <SummaryTile label="Tournament data scraped" value={hasTour} of={total} tone={hasTour > total * 0.5 ? 'good' : 'warn'} />
        <SummaryTile label="Socials data" value={hasSoc} of={total} tone={hasSoc > total * 0.8 ? 'good' : 'warn'} />
        <SummaryTile label="Audience demo" value={hasAud} of={total} tone={hasAud === 0 ? 'bad' : 'warn'} />
      </div>

      {decayed > 0 && (
        <div className="mb-4 px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs">
          <span className="font-semibold">{decayed} player{decayed === 1 ? '' : 's'}</span> have achievement decay below 0.90 — their Authority floor is scaled down. Worth re-syncing Liquipedia to confirm latest finishes.
        </div>
      )}

      <DataAuditTable rows={rows} />
    </Shell>
  );
}

function SummaryTile({ label, value, of, tone }: {
  label: string; value: number; of?: number; tone?: 'good' | 'warn' | 'bad';
}) {
  const toneCls =
    tone === 'good' ? 'border-green/30 bg-green/5'
    : tone === 'bad' ? 'border-red-200 bg-red-50'
    : tone === 'warn' ? 'border-amber-200 bg-amber-50'
    : 'border-line bg-white';
  return (
    <div className={`card card-p border ${toneCls}`}>
      <div className="text-[10px] uppercase tracking-wider text-mute font-semibold">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-2xl font-bold text-ink tabular-nums">{value}</span>
        {of != null && <span className="text-xs text-mute tabular-nums">/ {of}</span>}
      </div>
    </div>
  );
}
