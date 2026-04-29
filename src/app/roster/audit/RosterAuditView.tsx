'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  AlertTriangle, TrendingDown, TrendingUp, ShieldCheck, Hourglass,
  Pencil, ArrowUpRight, Layers, Filter,
} from 'lucide-react';

type Player = {
  id: number; nickname: string; full_name: string | null;
  role: string | null; game: string | null; team: string | null;
  nationality: string | null; tier_code: string | null;
  rate_ig_reel: number; rate_irl: number;
  measurement_confidence: string | null;
  followers_ig: number | null; followers_twitch: number | null; followers_yt: number | null;
  followers_tiktok: number | null; followers_x: number | null; followers_fb: number | null; followers_snap: number | null;
};
type Tier = { code: string; label: string; base_fee_min: number; base_fee_max: number; sort_order: number };

// Tier follower thresholds — must match the methodology page
const TIER_THRESHOLDS: { code: string; min: number; max: number; rateMin: number; rateMax: number }[] = [
  { code: 'Tier S', min: 1_000_000, max: 3_000_000, rateMin: 40000, rateMax: 50000 },
  { code: 'Tier 1', min:   250_000, max: 1_000_000, rateMin: 22000, rateMax: 30000 },
  { code: 'Tier 2', min:    50_000, max:   250_000, rateMin: 11000, rateMax: 18000 },
  { code: 'Tier 3', min:    10_000, max:    50_000, rateMin:  6500, rateMax: 10000 },
  { code: 'Tier 4', min:         0, max:    10_000, rateMin:  3000, rateMax:  5500 },
];

function maxReach(p: Player): number {
  return Math.max(
    p.followers_ig || 0, p.followers_twitch || 0, p.followers_yt || 0,
    p.followers_tiktok || 0, p.followers_x || 0, p.followers_fb || 0, p.followers_snap || 0,
  );
}
function expectedTier(reach: number): string | null {
  for (const t of TIER_THRESHOLDS) if (reach >= t.min) return t.code;
  return null;
}
function expectedRate(reach: number): number | null {
  const t = TIER_THRESHOLDS.find(x => reach >= x.min);
  if (!t) return null;
  if (t.code === 'Tier S') {
    const pos = Math.min((reach - t.min) / (t.max - t.min), 1);
    return Math.round(t.rateMin + pos * (t.rateMax - t.rateMin));
  }
  const pos = Math.min((reach - t.min) / (t.max - t.min), 1);
  return Math.round(t.rateMin + pos * (t.rateMax - t.rateMin));
}
function fmtSar(n: number): string { return `SAR ${Math.round(n).toLocaleString('en-US')}`; }
function fmtReach(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

type Issue = 'fine' | 'underpriced' | 'overpriced' | 'tier_under' | 'tier_over' | 'no_data' | 'locked_no_data' | 'staff_role';

function classify(p: Player, reach: number, exp_tier: string | null, exp_rate: number | null): { issue: Issue; severity: 'high' | 'med' | 'low' | 'ok'; note: string } {
  // Staff roles use Authority Floor logic — methodology rates don't apply directly
  const isStaff = p.role && ['Coach', 'Head Coach', 'Assistant Coach', 'Manager', 'Analyst'].includes(p.role);

  if (reach === 0) {
    if (p.measurement_confidence === 'exact') {
      return { issue: 'locked_no_data', severity: 'med', note: 'Marked verified but no follower data — should be TBD.' };
    }
    return { issue: 'no_data', severity: 'low', note: 'No follower data — using tier baseline. Refresh when data lands.' };
  }

  if (isStaff) {
    return { issue: 'staff_role', severity: 'ok', note: 'Staff role (coach / manager / analyst) — Authority Floor logic applies, not methodology rate.' };
  }

  if (!exp_tier || !exp_rate) return { issue: 'fine', severity: 'ok', note: '' };

  // Tier mismatch
  if (p.tier_code !== exp_tier) {
    const order: Record<string, number> = { 'Tier S': 0, 'Tier 1': 1, 'Tier 2': 2, 'Tier 3': 3, 'Tier 4': 4 };
    const cur = order[p.tier_code || ''] ?? 9;
    const exp = order[exp_tier] ?? 9;
    if (cur > exp) {
      return { issue: 'tier_under', severity: 'high', note: `Followers (${fmtReach(reach)}) qualify for ${exp_tier}, currently ${p.tier_code}. Promotion + rate bump.` };
    } else {
      return { issue: 'tier_over', severity: 'med', note: `Followers (${fmtReach(reach)}) suggest ${exp_tier}, currently ${p.tier_code}. Demote unless Authority signal justifies.` };
    }
  }

  // Rate vs expected
  const delta = (p.rate_ig_reel - exp_rate) / exp_rate;
  if (delta < -0.20) {
    return { issue: 'underpriced', severity: 'high', note: `Rate ${fmtSar(p.rate_ig_reel)} is ${Math.abs(Math.round(delta * 100))}% below methodology (expected ${fmtSar(exp_rate)}).` };
  }
  if (delta > 0.20) {
    return { issue: 'overpriced', severity: 'med', note: `Rate ${fmtSar(p.rate_ig_reel)} is ${Math.round(delta * 100)}% above methodology (expected ${fmtSar(exp_rate)}).` };
  }
  return { issue: 'fine', severity: 'ok', note: 'Rate within ±20% of methodology.' };
}

const ISSUE_LABEL: Record<Issue, { label: string; color: string }> = {
  fine:           { label: 'In range',           color: 'bg-green/10 text-greenDark border-green/30' },
  underpriced:    { label: 'Underpriced',        color: 'bg-red-50 text-red-700 border-red-200' },
  overpriced:     { label: 'Overpriced',         color: 'bg-orange-50 text-orange-700 border-orange-200' },
  tier_under:     { label: 'Tier — bump up',     color: 'bg-red-50 text-red-700 border-red-200' },
  tier_over:      { label: 'Tier — bump down',   color: 'bg-orange-50 text-orange-700 border-orange-200' },
  no_data:        { label: 'No follower data',   color: 'bg-bg text-label border-line' },
  locked_no_data: { label: 'Locked, no data',    color: 'bg-amber/10 text-amber border-amber/30' },
  staff_role:     { label: 'Staff (Authority Floor)', color: 'bg-navy/10 text-navy border-navy/30' },
};

export function RosterAuditView({ players, tiers: _tiers, isAdmin }: { players: Player[]; tiers: Tier[]; isAdmin: boolean }) {
  const [filterIssue, setFilterIssue] = useState<Issue | 'all'>('all');
  const [showRecalibrateInfo, setShowRecalibrateInfo] = useState(false);

  const audited = useMemo(() => {
    return players.map(p => {
      const reach = maxReach(p);
      const exp_tier = expectedTier(reach);
      const exp_rate = expectedRate(reach);
      const c = classify(p, reach, exp_tier, exp_rate);
      return { p, reach, exp_tier, exp_rate, ...c };
    });
  }, [players]);

  const counts = useMemo(() => {
    const c: Record<Issue, number> = {
      fine: 0, underpriced: 0, overpriced: 0, tier_under: 0, tier_over: 0, no_data: 0, locked_no_data: 0, staff_role: 0,
    };
    audited.forEach(a => { c[a.issue] = (c[a.issue] || 0) + 1; });
    return c;
  }, [audited]);

  const filtered = useMemo(() => {
    if (filterIssue === 'all') {
      // Default: show issues only (not 'fine' / 'staff_role' / 'no_data')
      return audited.filter(a => ['underpriced', 'overpriced', 'tier_under', 'tier_over', 'locked_no_data'].includes(a.issue))
                    .sort((a, b) => {
                      const sevOrder: Record<string, number> = { high: 0, med: 1, low: 2, ok: 3 };
                      return sevOrder[a.severity] - sevOrder[b.severity];
                    });
    }
    return audited.filter(a => a.issue === filterIssue);
  }, [audited, filterIssue]);

  const totalGap = useMemo(() => {
    let cur = 0, exp = 0;
    audited.forEach(a => {
      if (a.exp_rate && a.reach > 0 && a.p.role && !['Coach','Head Coach','Assistant Coach','Manager','Analyst'].includes(a.p.role)) {
        cur += a.p.rate_ig_reel || 0;
        exp += a.exp_rate;
      }
    });
    return { cur, exp, gap: exp - cur, gapPct: cur > 0 ? Math.round((exp - cur) / cur * 100) : 0 };
  }, [audited]);

  return (
    <div className="space-y-6">
      {/* ─── Headline finding ─────────────────────────────────────────── */}
      <section className={[
        'rounded-2xl border-2 p-6',
        totalGap.gapPct > 50 ? 'border-red-300 bg-red-50' : totalGap.gapPct > 20 ? 'border-amber/40 bg-amber/5' : 'border-green/40 bg-greenSoft/30',
      ].join(' ')}>
        <div className="flex items-start gap-4">
          <div className={[
            'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
            totalGap.gapPct > 50 ? 'bg-red-600 text-white' : totalGap.gapPct > 20 ? 'bg-amber text-white' : 'bg-green text-white',
          ].join(' ')}>
            <AlertTriangle size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider font-bold text-label">Roster vs methodology gap</div>
            <h2 className="text-2xl font-extrabold text-ink mt-0.5">
              {totalGap.gapPct > 0 ? `${totalGap.gapPct}% under methodology` : totalGap.gapPct < 0 ? `${Math.abs(totalGap.gapPct)}% over methodology` : 'Aligned with methodology'}
            </h2>
            <p className="text-sm text-label mt-2 leading-relaxed">
              Across {audited.filter(a => a.reach > 0 && !['Coach','Head Coach','Assistant Coach','Manager','Analyst'].includes(a.p.role || '')).length} players with follower data,
              the sum of current IG Reel rates is <strong className="text-ink tabular-nums">{fmtSar(totalGap.cur)}</strong>,
              vs methodology-implied <strong className="text-ink tabular-nums">{fmtSar(totalGap.exp)}</strong>.
              {totalGap.gap > 0 && (
                <> Closing this gap recovers <strong className="text-greenDark tabular-nums">{fmtSar(totalGap.gap)}</strong> of headline rate-card value across the roster.</>
              )}
            </p>
          </div>
        </div>
      </section>

      {/* ─── Issue counters ─────────────────────────────────────────── */}
      <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {([
          ['all',            `${counts.underpriced + counts.overpriced + counts.tier_under + counts.tier_over + counts.locked_no_data} flagged`, 'bg-navy text-white border-navy'],
          ['underpriced',    `${counts.underpriced} underpriced`,         ISSUE_LABEL.underpriced.color],
          ['tier_under',     `${counts.tier_under} bump tier up`,         ISSUE_LABEL.tier_under.color],
          ['overpriced',     `${counts.overpriced} overpriced`,           ISSUE_LABEL.overpriced.color],
          ['tier_over',      `${counts.tier_over} bump tier down`,        ISSUE_LABEL.tier_over.color],
          ['locked_no_data', `${counts.locked_no_data} locked, no data`, ISSUE_LABEL.locked_no_data.color],
          ['no_data',        `${counts.no_data} no data`,                 ISSUE_LABEL.no_data.color],
        ] as const).map(([k, label, color]) => (
          <button
            key={k}
            onClick={() => setFilterIssue(k as any)}
            className={[
              'rounded-lg border px-3 py-2 text-xs font-bold transition text-left',
              filterIssue === k ? color : 'bg-white border-line text-label hover:border-mute',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </section>

      {/* ─── Bulk recalibrate explainer ───────────────────────────────── */}
      <section className="card card-p border-2 border-greenDark/30 bg-greenSoft/20">
        <button
          onClick={() => setShowRecalibrateInfo(v => !v)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-greenDark text-white flex items-center justify-center">
              <Layers size={18} />
            </div>
            <div>
              <div className="font-semibold text-ink">Bulk recalibrate to methodology</div>
              <div className="text-xs text-label">One-shot SQL: re-anchor every player's rate to their max-reach interpolation, lock confidence='exact'.</div>
            </div>
          </div>
          <ArrowUpRight size={18} className={['text-greenDark transition-transform', showRecalibrateInfo ? 'rotate-45' : ''].join(' ')} />
        </button>
        {showRecalibrateInfo && (
          <div className="mt-4 space-y-3 text-sm text-label">
            <p>
              The audit shows {totalGap.gapPct}% gap between current rates and methodology-implied rates.
              The fastest way to close it: re-run the same calibration we used in April — for every player with follower data, set
              IG Reel to <code className="px-1 py-0.5 rounded bg-white border text-xs">tier_floor + position × tier_range</code>,
              then scale every other platform rate by the same factor.
            </p>
            <p className="text-xs text-mute italic">
              This is a destructive update — it overwrites individual rate overrides. Snapshots are taken first
              so we can roll back. To apply: ask Claude to "recalibrate to methodology" — Claude has the SQL ready
              to run via the Supabase MCP.
            </p>
            <div className="rounded-lg border border-line bg-white p-3 text-[11px] font-mono leading-relaxed text-label">
              <div className="text-ink font-semibold mb-1">// Pseudocode</div>
              for each active player with max_reach &gt; 0:<br/>
              &nbsp;&nbsp;target_tier  = tier_for_reach(max_reach)<br/>
              &nbsp;&nbsp;target_rate  = floor + (max_reach − tier_min) / range × (ceiling − floor)<br/>
              &nbsp;&nbsp;factor       = target_rate / current_rate_ig_reel<br/>
              &nbsp;&nbsp;update all 16 rate columns × factor, set confidence = 'exact'<br/>
            </div>
          </div>
        )}
      </section>

      {/* ─── Flagged rows ─────────────────────────────────────────────── */}
      <section className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-line flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-mute" />
            <h3 className="font-semibold text-sm">
              {filterIssue === 'all' ? 'All flagged players' : ISSUE_LABEL[filterIssue]?.label}
              <span className="text-mute font-normal ml-2">({filtered.length})</span>
            </h3>
          </div>
          {filterIssue !== 'all' && (
            <button onClick={() => setFilterIssue('all')} className="text-xs text-mute hover:text-ink underline">
              show all flagged
            </button>
          )}
        </div>
        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center text-mute text-sm">
            <ShieldCheck size={28} className="mx-auto opacity-50 mb-2" />
            No flagged players in this category. The roster is clean.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-label uppercase tracking-wide bg-bg/50">
                  <th className="px-4 py-2.5">Player</th>
                  <th className="px-4 py-2.5">Issue</th>
                  <th className="px-4 py-2.5 text-right">Reach</th>
                  <th className="px-4 py-2.5">Tier</th>
                  <th className="px-4 py-2.5 text-right">Current</th>
                  <th className="px-4 py-2.5 text-right">Methodology</th>
                  <th className="px-4 py-2.5 text-right">Δ</th>
                  <th className="px-4 py-2.5">What to do</th>
                  {isAdmin && <th className="px-4 py-2.5 w-16"></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ p, reach, exp_tier, exp_rate, issue, severity, note }) => {
                  const delta = exp_rate ? p.rate_ig_reel - exp_rate : 0;
                  const deltaPct = exp_rate ? Math.round((delta / exp_rate) * 100) : 0;
                  const isHigh = severity === 'high';
                  return (
                    <tr key={p.id} className={['border-t border-line', isHigh ? 'bg-red-50/40' : ''].join(' ')}>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-ink">{p.nickname}</div>
                        <div className="text-[10px] text-mute capitalize">{p.role} · {p.game}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${ISSUE_LABEL[issue].color}`}>
                          {issue === 'underpriced' && <TrendingDown size={10} />}
                          {issue === 'tier_under' && <TrendingDown size={10} />}
                          {issue === 'overpriced' && <TrendingUp size={10} />}
                          {issue === 'tier_over' && <TrendingUp size={10} />}
                          {issue === 'locked_no_data' && <Hourglass size={10} />}
                          {ISSUE_LABEL[issue].label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-label">{reach > 0 ? fmtReach(reach) : '—'}</td>
                      <td className="px-4 py-2.5 text-xs">
                        <span className="text-ink">{p.tier_code}</span>
                        {exp_tier && exp_tier !== p.tier_code && (
                          <span className="text-mute"> → <strong className="text-ink">{exp_tier}</strong></span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmtSar(p.rate_ig_reel)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-greenDark font-medium">{exp_rate ? fmtSar(exp_rate) : '—'}</td>
                      <td className={['px-4 py-2.5 text-right tabular-nums font-bold text-xs',
                          deltaPct > 0 ? 'text-orange-600' : deltaPct < 0 ? 'text-red-600' : 'text-mute'].join(' ')}>
                        {exp_rate ? `${deltaPct > 0 ? '+' : ''}${deltaPct}%` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-label leading-snug max-w-[280px]">{note}</td>
                      {isAdmin && (
                        <td className="px-4 py-2.5 text-right">
                          <Link href={`/admin/players/${p.id}`} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-greenDark hover:bg-greenSoft" title="Edit player">
                            <Pencil size={12} />
                          </Link>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
