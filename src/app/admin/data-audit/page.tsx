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
      followers_ig, followers_x, followers_yt, followers_tiktok, followers_twitch,
      followers_kick, followers_snap, followers_fb,
      er_ig, er_tiktok, er_yt, er_twitch, er_x,
      agency_status, agency_name, min_rates, reach_multiplier
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

  // Per-dimension coverage tally for the new "Coverage by dimension" panel.
  const has = (k: keyof typeof rows[0]) => (r: any) => r[k] != null && r[k] !== 0;
  const cov = {
    ig:        rows.filter(r => (r as any).followers_ig > 0).length,
    tiktok:    rows.filter(r => (r as any).followers_tiktok > 0).length,
    yt:        rows.filter(r => (r as any).followers_yt > 0).length,
    twitch:    rows.filter(r => (r as any).followers_twitch > 0).length,
    kick:      rows.filter(r => (r as any).followers_kick > 0).length,
    snap:      rows.filter(r => (r as any).followers_snap > 0).length,
    fb:        rows.filter(r => (r as any).followers_fb > 0).length,
    x:         rows.filter(r => (r as any).followers_x > 0).length,
    er_any:    rows.filter(r => ((r as any).er_ig||0) + ((r as any).er_tiktok||0) + ((r as any).er_yt||0) + ((r as any).er_twitch||0) + ((r as any).er_x||0) > 0).length,
    peakTier:  rows.filter(r => !!(r as any).peak_tournament_tier).length,
    agencyKnown: rows.filter(r => (r as any).agency_status === 'agency' || (r as any).agency_status === 'direct').length,
    minRates:  rows.filter(r => {
      const m = (r as any).min_rates;
      return m && typeof m === 'object' && Object.keys(m).length > 0;
    }).length,
    reachCal:  rows.filter(r => Number((r as any).reach_multiplier ?? 1) !== 1).length,
  };

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

      {/* PER-DIMENSION COVERAGE — what data is filled across the roster.
          Updates live as Manus research / talent intake / Liquipedia syncs land. */}
      <div className="card card-p mb-5">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-label">Coverage by dimension</h2>
          <Link href="/admin/research-import" className="text-xs text-green hover:underline">+ Import research CSV →</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          <CovCell label="IG followers" n={cov.ig} of={total} hint="drives reach mult" />
          <CovCell label="TikTok followers" n={cov.tiktok} of={total} />
          <CovCell label="YouTube followers" n={cov.yt} of={total} />
          <CovCell label="Twitch followers" n={cov.twitch} of={total} />
          <CovCell label="Kick followers" n={cov.kick} of={total} />
          <CovCell label="Snap followers" n={cov.snap} of={total} />
          <CovCell label="Facebook followers" n={cov.fb} of={total} hint="Shikenso target" />
          <CovCell label="X followers" n={cov.x} of={total} />
          <CovCell label="ER (any platform)" n={cov.er_any} of={total} hint="Shikenso unlocks IG/FB" critical />
          <CovCell label="Peak tournament tier" n={cov.peakTier} of={total} hint="Liquipedia" />
          <CovCell label="Agency known" n={cov.agencyKnown} of={total} hint="known or confirmed direct" />
          <CovCell label="Talent intake (min_rates)" n={cov.minRates} of={total} hint="agency-stated minimum" critical />
          <CovCell label="Reach calibrated" n={cov.reachCal} of={total} hint="non-neutral multiplier" />
          <CovCell label="Liquipedia synced" n={hasLP} of={total} />
          <CovCell label="Tournament data" n={hasTour} of={total} />
          <CovCell label="Audience demo" n={hasAud} of={total} hint="Shikenso (IG/FB only)" critical />
        </div>
        <p className="text-[11px] text-mute mt-3">
          Red = critical gap (engine is blind on this axis for &gt;80% of roster). Yellow = partial coverage (~10–80%). Green = ≥80% covered. Manus research feeds the followers + tournament columns; Shikenso would later fill IG/FB ER and audience demographics; talent intake fills min_rates.
        </p>
      </div>

      <DataAuditTable rows={rows} />
    </Shell>
  );
}

function CovCell({ label, n, of, hint, critical }: {
  label: string; n: number; of: number; hint?: string; critical?: boolean;
}) {
  const pct = of > 0 ? Math.round((n / of) * 100) : 0;
  const tone =
    pct >= 80 ? 'border-green/30 bg-green/5 text-green'
    : pct >= 10 ? 'border-amber/30 bg-amber/5 text-amber'
    : critical ? 'border-red/40 bg-red/5 text-red'
    : 'border-mute/30 bg-bg/40 text-mute';
  return (
    <div className={`p-2 rounded border ${tone}`}>
      <div className="text-[9px] uppercase tracking-wider font-semibold opacity-80">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="text-lg font-bold tabular-nums">{n}</span>
        <span className="text-[10px] tabular-nums opacity-70">/ {of}</span>
        <span className="text-[10px] tabular-nums opacity-60 ml-auto">{pct}%</span>
      </div>
      {hint && <div className="text-[9px] opacity-70 mt-0.5">{hint}</div>}
    </div>
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
