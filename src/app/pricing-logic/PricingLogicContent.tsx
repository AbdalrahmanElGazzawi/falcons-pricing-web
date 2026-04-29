'use client';
import Link from 'next/link';
import {
  Layers, Trophy, Users, Globe, BookOpen, Compass,
  Sparkles, ShieldCheck, AlertTriangle, ArrowRight,
  TrendingUp, Activity, GitBranch, Calculator, Sigma, Lock,
} from 'lucide-react';

type Player = {
  id: number; nickname: string; role: string | null; game: string | null;
  team: string | null; nationality: string | null; tier_code: string | null;
  rate_ig_reel: number; rate_irl: number;
  authority_factor: number | null; measurement_confidence: string | null;
};
type Creator = { id: number; nickname: string; tier_code: string | null;
  rate_ig_reels: number; rate_yt_full: number; rate_tiktok_ours: number };
type Tier = { code: string; label: string;
  base_fee_min: number; base_fee_max: number; floor_share: number; sort_order: number };

function regionOf(nat: string | null | undefined): string {
  const n = (nat ?? '').toLowerCase().trim();
  if (n.startsWith('saudi')) return 'KSA';
  if (['emirati','bahraini','kuwaiti','qatari','omani'].includes(n)) return 'GCC (non-KSA)';
  if (['egyptian','jordanian','lebanese','tunisian','moroccan','algerian','iraqi','syrian','palestinian'].includes(n)) return 'MENA broader';
  if (['filipino','indonesian','vietnamese','thai','malaysian','singaporean','myanmar'].includes(n)) return 'SEA';
  if (['korean','chinese','japanese','taiwanese'].includes(n)) return 'East Asia';
  if (['american','canadian','british','french','german','danish','swedish','norwegian','dutch','spanish','italian','finnish','irish','polish','austrian','swiss','belgian','greek','iranian'].includes(n)) return 'NA / EU';
  return 'Other / Unspecified';
}

export function PricingLogicContent({
  players, creators, tiers,
}: { players: Player[]; creators: Creator[]; tiers: Tier[] }) {
  // ── Tier breakdown
  const tierStats = tiers.map(t => {
    const inTier = players.filter(p => p.tier_code === t.code);
    const avgIg = inTier.length ? Math.round(inTier.reduce((s, p) => s + (p.rate_ig_reel || 0), 0) / inTier.length) : 0;
    return { ...t, count: inTier.length, avg_ig_reel: avgIg };
  });

  // ── Game breakdown (top 12 by count)
  const gameMap = new Map<string, { count: number; sum: number; tiers: Set<string> }>();
  players.forEach(p => {
    const g = p.game || 'Unknown';
    const cur = gameMap.get(g) ?? { count: 0, sum: 0, tiers: new Set() };
    cur.count += 1; cur.sum += p.rate_ig_reel || 0;
    if (p.tier_code) cur.tiers.add(p.tier_code);
    gameMap.set(g, cur);
  });
  const games = Array.from(gameMap.entries())
    .map(([game, v]) => ({ game, count: v.count, avg: Math.round(v.sum / Math.max(1, v.count)),
      tiers: Array.from(v.tiers).sort() }))
    .sort((a, b) => b.count - a.count);

  // ── Team breakdown (top 10)
  const teamMap = new Map<string, { count: number; sum: number; tiers: Set<string> }>();
  players.forEach(p => {
    const t = p.team || '—';
    const cur = teamMap.get(t) ?? { count: 0, sum: 0, tiers: new Set() };
    cur.count += 1; cur.sum += p.rate_ig_reel || 0;
    if (p.tier_code) cur.tiers.add(p.tier_code);
    teamMap.set(t, cur);
  });
  const teams = Array.from(teamMap.entries())
    .map(([team, v]) => ({ team, count: v.count, avg: Math.round(v.sum / Math.max(1, v.count)),
      tiers: Array.from(v.tiers).sort() }))
    .sort((a, b) => b.count - a.count);

  // ── Region breakdown
  const regionMap = new Map<string, { count: number; sum: number }>();
  players.forEach(p => {
    const r = regionOf(p.nationality);
    const cur = regionMap.get(r) ?? { count: 0, sum: 0 };
    cur.count += 1; cur.sum += p.rate_ig_reel || 0;
    regionMap.set(r, cur);
  });
  const regions = Array.from(regionMap.entries())
    .map(([region, v]) => ({ region, count: v.count, avg: Math.round(v.sum / Math.max(1, v.count)) }))
    .sort((a, b) => b.count - a.count);

  // ── Role breakdown (just totals)
  const byRole: Record<string, number> = {};
  players.forEach(p => {
    const r = p.role || 'Other';
    byRole[r] = (byRole[r] || 0) + 1;
  });

  // ── Confidence + championship-authority counts
  const confidenceCounts: Record<string, number> = {};
  players.forEach(p => {
    const c = p.measurement_confidence || 'unknown';
    confidenceCounts[c] = (confidenceCounts[c] || 0) + 1;
  });
  const championAuthorityCount = players.filter(p => (p.authority_factor || 1) > 1.0).length;

  const fmtSar = (n: number) => `SAR ${Math.round(n).toLocaleString('en-US')}`;
  const fmtUsd = (n: number) => `$${Math.round(n / 3.75).toLocaleString('en-US')}`;

  return (
    <div className="space-y-10 -mx-4 sm:-mx-6 lg:-mx-8 -mt-2 pb-10">
      {/* ─── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-2xl bg-navy text-white px-6 sm:px-10 py-10 sm:py-14">
        <div aria-hidden className="absolute -top-24 -right-24 w-80 h-80 rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, #2ED06E 0%, transparent 70%)' }} />
        <div aria-hidden className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #D4A514 0%, transparent 70%)' }} />
        <div className="relative max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur text-xs uppercase tracking-wider font-medium">
            <Activity size={14} /> Live snapshot
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight">
            Current pricing logic — every category, team, and role.
          </h1>
          <p className="mt-4 text-base sm:text-lg text-white/80 max-w-2xl">
            Where every Falcons price comes from today, why each segment sits where it sits, and what evolves
            once Shikenso lands. Numbers fetched live from the engine — no stale screenshots.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href="/about" className="btn !py-2.5 !px-5 bg-white/10 hover:bg-white/15 text-white border border-white/20">
              Methodology &amp; sources
            </Link>
            <Link href="/roadmap" className="btn !py-2.5 !px-5 bg-white/10 hover:bg-white/15 text-white border border-white/20">
              See the roadmap <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Quick stats ─────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Active talent',     value: players.length.toString(),                  hint: 'Players + influencers + staff' },
          { label: 'Creators',          value: creators.length.toString(),                  hint: 'Separate rate engine' },
          { label: 'Distinct games',    value: games.length.toString(),                     hint: 'Across MLBB, CS2, CoD …' },
          { label: 'Champion-tier authority', value: championAuthorityCount.toString(),     hint: 'authority_factor > 1.0' },
        ].map(s => (
          <div key={s.label} className="card card-p">
            <div className="text-[11px] uppercase tracking-wider text-mute font-semibold">{s.label}</div>
            <div className="text-3xl font-extrabold text-ink mt-1 tabular-nums">{s.value}</div>
            <div className="text-xs text-label mt-1">{s.hint}</div>
          </div>
        ))}
      </section>

      {/* ─── Tier baselines (live) ───────────────────────────────────── */}
      <section className="card card-p">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gold/15 text-gold flex items-center justify-center flex-shrink-0">
            <Layers size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink">Tier baselines — what every IG Reel anchors to</h2>
            <p className="text-sm text-label mt-0.5">
              Today every player sits at their tier's <strong>floor</strong>. Within-tier spread (where Vejrgang ≠ Cellium even at the same tier)
              is a Shikenso-phase calibration. Until then, tier &amp; championship-authority do the differentiation.
            </p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-3">
          {tierStats.map(t => (
            <div key={t.code} className="rounded-xl border border-line p-4 bg-bg/40">
              <div className="text-[11px] uppercase tracking-wider font-bold text-label">{t.code}</div>
              <div className="text-xs text-mute">{t.label}</div>
              <div className="text-2xl font-extrabold text-ink mt-2 tabular-nums">
                {t.avg_ig_reel ? fmtSar(t.avg_ig_reel) : '—'}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-mute mt-0.5">avg IG Reel today</div>
              <div className="mt-3 pt-3 border-t border-line text-[11px] text-label">
                Tier range <strong className="text-ink">{fmtSar(t.base_fee_min)}–{fmtSar(t.base_fee_max)}</strong>
              </div>
              <div className="text-[11px] text-label">Floor share <strong className="text-ink">{Math.round(t.floor_share * 100)}%</strong> of IRL</div>
              <div className="text-[11px] text-label mt-1">
                <span className="text-ink font-semibold">{t.count}</span> active talent
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Calibration math (the Apr 2026 lock pass) ─────────────── */}
      <section className="card card-p">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-navy/10 text-navy flex items-center justify-center flex-shrink-0">
            <Sigma size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink">Within-tier calibration math</h2>
            <p className="text-sm text-label mt-0.5">
              How max-platform-reach turns into a SAR rate. Run on Apr 2026 to lock 149 of 183 talents.
            </p>
          </div>
        </div>

        {/* Step-by-step formula */}
        <ol className="mt-5 space-y-3 text-sm">
          <li className="rounded-lg border border-line bg-bg/40 p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-6 h-6 rounded-full bg-navy text-white text-[11px] font-bold inline-flex items-center justify-center">1</span>
              <strong className="text-ink">Take max-platform-reach</strong>
            </div>
            <p className="text-label leading-relaxed text-xs">
              Highest single follower count across IG / TikTok / YT / Twitch / X / Facebook / Snapchat.
              We use <strong>max</strong>, not <strong>sum</strong> — brands buy the platform where the talent is biggest.
            </p>
            <code className="block mt-2 text-[11px] bg-white border border-line rounded px-2 py-1.5 font-mono text-ink">
              max_reach = MAX(followers_ig, followers_tiktok, followers_yt, followers_twitch, followers_x, followers_fb, followers_snap)
            </code>
          </li>

          <li className="rounded-lg border border-line bg-bg/40 p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-6 h-6 rounded-full bg-navy text-white text-[11px] font-bold inline-flex items-center justify-center">2</span>
              <strong className="text-ink">Map max-reach to a tier</strong>
            </div>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              {[
                { code: 'Tier S', range: '> 1M' },
                { code: 'Tier 1', range: '250K – 1M' },
                { code: 'Tier 2', range: '50K – 250K' },
                { code: 'Tier 3', range: '10K – 50K' },
                { code: 'Tier 4', range: '< 10K' },
              ].map(t => (
                <div key={t.code} className="rounded border border-line bg-white px-2 py-1.5">
                  <div className="text-[10px] uppercase tracking-wider text-label font-semibold">{t.code}</div>
                  <div className="text-ink font-medium">{t.range}</div>
                </div>
              ))}
            </div>
          </li>

          <li className="rounded-lg border border-line bg-bg/40 p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-6 h-6 rounded-full bg-navy text-white text-[11px] font-bold inline-flex items-center justify-center">3</span>
              <strong className="text-ink">Linear interpolation inside the tier</strong>
            </div>
            <p className="text-label leading-relaxed text-xs">
              Tier-floor followers map to the tier-floor SAR rate. Tier-ceiling followers map to the tier-ceiling SAR rate.
              Anyone in between is placed proportionally.
            </p>
            <code className="block mt-2 text-[11px] bg-white border border-line rounded px-2 py-1.5 font-mono text-ink leading-relaxed">
              position = clamp01( (max_reach − tier_floor_followers) ÷ tier_range_followers )
              <br />
              ig_reel  = tier_floor_sar + position × (tier_ceiling_sar − tier_floor_sar)
            </code>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left border-b border-line">
                    <th className="py-1.5 pr-3 font-semibold text-label">Tier</th>
                    <th className="py-1.5 pr-3 font-semibold text-label">Floor followers → SAR</th>
                    <th className="py-1.5 pr-3 font-semibold text-label">Ceiling followers → SAR</th>
                  </tr>
                </thead>
                <tbody className="text-ink">
                  {[
                    ['Tier S', '1M → 40,000',   '3M+ → 50,000'],
                    ['Tier 1', '250K → 22,000', '1M → 30,000'],
                    ['Tier 2', '50K → 11,000',  '250K → 18,000'],
                    ['Tier 3', '10K → 6,500',   '50K → 10,000'],
                    ['Tier 4', '0 → 3,000',     '10K → 5,500'],
                  ].map(([tier, lo, hi]) => (
                    <tr key={tier} className="border-b border-line">
                      <td className="py-1.5 pr-3 font-medium">{tier}</td>
                      <td className="py-1.5 pr-3 font-mono text-[11px]">{lo}</td>
                      <td className="py-1.5 pr-3 font-mono text-[11px]">{hi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-mute mt-2 leading-snug">
              Worked example — FlapTzy at 885K followers (Tier 1, range 250K–1M):
              position = (885,000 − 250,000) ÷ 750,000 = <strong className="text-ink">0.847</strong>;
              ig_reel = 22,000 + 0.847 × 8,000 = <strong className="text-ink">SAR 28,773</strong>.
            </p>
          </li>

          <li className="rounded-lg border border-line bg-bg/40 p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-6 h-6 rounded-full bg-navy text-white text-[11px] font-bold inline-flex items-center justify-center">4</span>
              <strong className="text-ink">Scale every other platform by the same factor</strong>
            </div>
            <p className="text-label leading-relaxed text-xs">
              Cross-platform ratios stay uniform (IG Static 65%, TikTok 78%, IRL 220%, Twitch 145%, etc.) — set the IG Reel anchor right and every other column follows.
            </p>
            <code className="block mt-2 text-[11px] bg-white border border-line rounded px-2 py-1.5 font-mono text-ink leading-relaxed">
              factor = new_ig_reel ÷ old_ig_reel
              <br />
              new_rate_X = round(old_rate_X × factor / 100) × 100   // nearest SAR 100
            </code>
          </li>

          <li className="rounded-lg border-2 border-green/40 bg-greenSoft/30 p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-6 h-6 rounded-full bg-green text-white text-[11px] font-bold inline-flex items-center justify-center">5</span>
              <Lock size={14} className="text-greenDark" />
              <strong className="text-ink">Lock</strong>
            </div>
            <p className="text-label leading-relaxed text-xs">
              Set <code className="px-1 py-0.5 rounded bg-white border border-line">measurement_confidence = 'exact'</code> for every talent that came in with non-zero follower data.
              Engine drops the 25% confidence haircut and lets premium multipliers ride at full strength.
            </p>
            <p className="text-[11px] text-mute mt-2">
              Outcome: 149 of 183 talents Locked. The other 34 stay TBD on the tier baseline (= within-tier average) until follower data lands for them too.
            </p>
          </li>
        </ol>

        <div className="mt-4 rounded-lg border border-amber/40 bg-amber/5 px-4 py-3 text-[11px] text-label leading-relaxed">
          <strong className="text-ink">Why linear and not CPM?</strong> Until Shikenso lands engagement + audience-quality + verified reach data per platform,
          we can't run a real CPM model. Linear interpolation is the defensible interim — same engine, simpler input.
          When Shikenso onboards each talent, the formula evolves to <code className="px-1 py-0.5 rounded bg-white border">CPM × Verified Reach × Engagement multiplier</code> per platform,
          and the within-tier spread reshapes around real performance instead of follower count alone.
        </div>
      </section>

      {/* ─── By game ─────────────────────────────────────────────────── */}
      <section className="card card-p">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-greenSoft text-greenDark flex items-center justify-center flex-shrink-0">
            <Trophy size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink">By game discipline</h2>
            <p className="text-sm text-label mt-0.5">
              Average IG Reel per game = function of how Tier S/1 the roster is for that title. PUBG and Chess average highest because Falcons holds genuine global anchors there;
              Fatal Fury / Tekken sit lower because the roster is exclusively T2/T3 (no Tier S).
            </p>
          </div>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-line">
                <th className="py-2 pr-4 font-semibold text-label">Game</th>
                <th className="py-2 pr-4 font-semibold text-label text-right">Talent</th>
                <th className="py-2 pr-4 font-semibold text-label text-right">Avg IG Reel</th>
                <th className="py-2 pr-4 font-semibold text-label">Tiers present</th>
              </tr>
            </thead>
            <tbody className="text-ink">
              {games.slice(0, 14).map(g => (
                <tr key={g.game} className="border-b border-line">
                  <td className="py-2 pr-4 font-medium">{g.game}</td>
                  <td className="py-2 pr-4 text-right tabular-nums text-label">{g.count}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{fmtSar(g.avg)} <span className="text-xs text-mute">· {fmtUsd(g.avg)}</span></td>
                  <td className="py-2 pr-4 text-xs text-mute">{g.tiers.join(' · ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── By team / sub-roster ────────────────────────────────────── */}
      <section className="card card-p">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-navy/10 text-navy flex items-center justify-center flex-shrink-0">
            <Users size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink">By team / sub-roster</h2>
            <p className="text-sm text-label mt-0.5">
              <strong>Riyadh Falcons</strong> is the highest-priced sub-roster because it's where the Tier S Apex/CoD anchors live.
              <strong>Team Falcons MENA</strong> and <strong>Falcons Vega MENA</strong> sit lower because they're the developmental rosters. Sub-roster doesn't change pricing — tier does — but it explains the averages.
            </p>
          </div>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-line">
                <th className="py-2 pr-4 font-semibold text-label">Team / Sub-roster</th>
                <th className="py-2 pr-4 font-semibold text-label text-right">Talent</th>
                <th className="py-2 pr-4 font-semibold text-label text-right">Avg IG Reel</th>
                <th className="py-2 pr-4 font-semibold text-label">Tiers</th>
              </tr>
            </thead>
            <tbody className="text-ink">
              {teams.slice(0, 12).map(t => (
                <tr key={t.team} className="border-b border-line">
                  <td className="py-2 pr-4 font-medium">{t.team}</td>
                  <td className="py-2 pr-4 text-right tabular-nums text-label">{t.count}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{fmtSar(t.avg)}</td>
                  <td className="py-2 pr-4 text-xs text-mute">{t.tiers.join(' · ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── By region / market context ──────────────────────────────── */}
      <section className="card card-p">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gold/15 text-gold flex items-center justify-center flex-shrink-0">
            <Globe size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink">By region — and why pricing isn't one-size-fits-all</h2>
            <p className="text-sm text-label mt-0.5">
              The base rate is the same across all regions today — but client market context changes what that rate is worth. Filipino macro-influencers
              (100K-1M followers) command PHP 20K–100K per post (~SAR 1.3K–6.7K). MENA macro-influencers command 3-4× that. The same player priced
              for a Filipino brand vs a Saudi brand should reflect that gap.
            </p>
          </div>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-line">
                <th className="py-2 pr-4 font-semibold text-label">Region</th>
                <th className="py-2 pr-4 font-semibold text-label text-right">Talent</th>
                <th className="py-2 pr-4 font-semibold text-label text-right">Avg IG Reel</th>
                <th className="py-2 pr-4 font-semibold text-label">Pricing context</th>
              </tr>
            </thead>
            <tbody className="text-ink">
              {regions.map(r => {
                const ctx: Record<string, string> = {
                  'KSA': 'Home market · MENA premium audience axis active (1.30×)',
                  'GCC (non-KSA)': 'Adjacent home market · GCC = MENA-tier pricing',
                  'MENA broader': 'Egypt/Levant — slightly below GCC, audience 1.20×',
                  'SEA': 'Local SEA brand context = audience 0.65× (planned). Currently same as KSA — overpriced for PH/ID.',
                  'East Asia': 'KR/JP/CN — premium markets, audience 1.15×',
                  'NA / EU': 'Tier 1 esports markets — audience 1.00–1.20×',
                  'Other / Unspecified': 'Nationality not yet captured. Defaults to MENA pricing.',
                };
                return (
                  <tr key={r.region} className="border-b border-line">
                    <td className="py-2 pr-4 font-medium">{r.region}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-label">{r.count}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{fmtSar(r.avg)}</td>
                    <td className="py-2 pr-4 text-xs text-mute">{ctx[r.region] || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 rounded-lg border border-amber/40 bg-amber/5 px-4 py-3 text-sm">
          <div className="flex items-start gap-2 text-amber">
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
            <div>
              <strong className="block text-ink">Open gap:</strong>
              <span className="text-label">SEA-local audience tier (proposed 0.65×) isn't in the engine yet. Until then, sales must manually drop the audience axis to <em>Generic / Broad</em> (0.85×) when quoting Filipino/Indonesian brands — still 30%+ overpriced. Adding a dedicated SEA-local option to the audience axis is next on the roadmap.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Roles ──────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.4fr,1fr] gap-6">
        <div className="card card-p">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-greenSoft text-greenDark flex items-center justify-center flex-shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-ink">How non-Players are priced</h2>
              <p className="text-sm text-label mt-0.5">
                Coaches, managers, analysts, and influencers all use the same tier-driven base rate. The intent: pricing reflects <em>brand value to the buying client</em>, not in-game KDA.
                A team manager with 80K followers commands the same Tier 2 rate as a player with 80K followers — both deliver the same audience.
              </p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(byRole).sort((a,b) => b[1] - a[1]).slice(0, 6).map(([role, count]) => (
              <div key={role} className="rounded-lg border border-line bg-bg/40 p-3">
                <div className="text-xs text-mute uppercase tracking-wider font-semibold">{role}</div>
                <div className="text-2xl font-bold text-ink tabular-nums mt-1">{count}</div>
                <div className="text-[10px] uppercase tracking-wider text-mute">active</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card card-p bg-navy text-white border-navy">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 text-gold flex items-center justify-center flex-shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Creators (separate engine)</h2>
              <p className="text-sm text-white/70 mt-0.5">17 creators. Different platform menu, same formula.</p>
            </div>
          </div>
          <ul className="mt-5 space-y-2.5 text-sm text-white/85">
            <li className="flex items-start gap-2"><Trophy size={14} className="text-gold flex-shrink-0 mt-0.5" /> All Tier 1 / Tier S — premium-only roster</li>
            <li className="flex items-start gap-2"><Trophy size={14} className="text-gold flex-shrink-0 mt-0.5" /> Audience axis = sector match (Sports / Tech / Anime / KSA / MENA)</li>
            <li className="flex items-start gap-2"><Trophy size={14} className="text-gold flex-shrink-0 mt-0.5" /> Authority axis = conversion-driven (Trusted niche / Hero) instead of championship</li>
            <li className="flex items-start gap-2"><Trophy size={14} className="text-gold flex-shrink-0 mt-0.5" /> Production axis replaces Seasonality (creators don't have tournament cycles)</li>
            <li className="flex items-start gap-2"><Trophy size={14} className="text-gold flex-shrink-0 mt-0.5" /> Manual archetypes available — Lifestyle / Day-in-Life / Brand Ambassador packages</li>
          </ul>
        </div>
      </section>

      {/* ─── Reasoning ──────────────────────────────────────────────── */}
      <section className="card card-p">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-navy/10 text-navy flex items-center justify-center flex-shrink-0">
            <BookOpen size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink">Why it's built this way</h2>
            <p className="text-sm text-label mt-0.5">Five design choices that explain every line you'll see in a quote.</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { title: 'Tier-anchored, not per-talent', icon: Layers,
              body: 'Every player in a tier gets the same IG Reel anchor today. Why: until Shikenso, manual per-talent calibration drifts and creates negotiation chaos. Floor first, calibration later.' },
            { title: 'Authority Floor protects pros', icon: ShieldCheck,
              body: 'Pro player social rate = MAX(SocialPrice, IRL × FloorShare × axes). A world-champ with modest social reach is never priced below their appearance value. Locked in computeLine().' },
            { title: 'Confidence cap = guardrail', icon: AlertTriangle,
              body: '184 of 185 talent at "rounded" (TBV via Shikenso — manually verified). Premiums active, no haircut. The 1 "exact" + the rest will be reset to graded confidence as Shikenso onboards.' },
            { title: 'Cross-platform ratios are uniform', icon: TrendingUp,
              body: 'IG Static 65% · TikTok 78% · YT Short 32% · Twitch 2h 145% · IRL 220% — same across every tier. Set the IG Reel anchor right and every other platform falls into place automatically.' },
            { title: 'Regional context via the audience axis', icon: Globe,
              body: 'Same player priced different per market: MENA campaign = 1.30× audience; SEA local = 0.65× (proposed). Adjusts price to the client\'s market — not the player\'s nationality.' },
            { title: 'Championship credentials via authority_factor', icon: Trophy,
              body: 'Per-talent intrinsic Authority. M5 / EWC / Worlds champion = 1.50× by default. Currently 1.0× for everyone (rolled back pending the SEA audience tier — would have over-priced PH champions).' },
          ].map(r => {
            const Icon = r.icon;
            return (
              <div key={r.title} className="rounded-lg border border-line bg-bg/40 p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon size={16} className="text-greenDark" />
                  <h3 className="font-semibold text-ink text-sm">{r.title}</h3>
                </div>
                <p className="text-xs text-label leading-relaxed">{r.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Confidence distribution snapshot ───────────────────────── */}
      <section className="card card-p">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-greenSoft text-greenDark flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink">Where the data quality stands today</h2>
            <p className="text-sm text-label mt-0.5">
              Every talent is tagged with measurement_confidence. The engine uses this to gate premium multipliers + apply a haircut.
            </p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(['exact','rounded','estimated','pending'] as const).map(k => {
            const labels: Record<string, { name: string; what: string; tone: string }> = {
              exact:     { name: 'Verified',        what: 'Shikenso confirmed',                        tone: 'border-green/40 bg-greenSoft text-greenDark' },
              rounded:   { name: 'TBV (manual)',    what: 'Manually verified · premiums active',       tone: 'border-gold/40 bg-gold/5 text-gold' },
              estimated: { name: 'Estimated',       what: 'Partial data · capped premiums',            tone: 'border-navy/30 bg-navy/5 text-navy' },
              pending:   { name: 'Pending',         what: 'No data · 1.0× cap + 25% haircut',          tone: 'border-line bg-bg text-label' },
            };
            const l = labels[k];
            const count = confidenceCounts[k] || 0;
            return (
              <div key={k} className={`rounded-xl border ${l.tone} p-4`}>
                <div className="text-[11px] uppercase tracking-wider font-bold">{l.name}</div>
                <div className="text-3xl font-extrabold tabular-nums mt-1">{count}</div>
                <div className="text-[11px] mt-1">{l.what}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Evolution ──────────────────────────────────────────────── */}
      <section className="card card-p">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gold/15 text-gold flex items-center justify-center flex-shrink-0">
            <Compass size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink">How the logic evolves from here</h2>
            <p className="text-sm text-label mt-0.5">Three immediate moves, then steady-state Shikenso.</p>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {[
            { phase: 'Next', title: 'SEA-local audience tier', detail: 'Add audience option 0.65× for Filipino / Indonesian / Vietnamese local-brand campaigns. Unlocks correct PH market pricing for FlapTzy / Hadji / Vega SEA roster.', tone: 'border-green/40 bg-greenSoft' },
            { phase: 'Next', title: 'Re-apply M5 championship Authority (1.50×)', detail: 'Once SEA audience tier is live, the 6 M5 World Champions get authority_factor = 1.50 again. SEA campaigns: 0.65 × 1.50 ≈ 0.975× — premium but defensible. KSA campaigns: 1.30 × 1.50 = 1.95× — proper export premium.', tone: 'border-green/40 bg-greenSoft' },
            { phase: 'Soon', title: 'Tier mid-band lift', detail: 'Move every tier from floor → mid of range (T S 40K → 45K, T1 22K → 26K, T2 11K → 14.5K). Defensible — still inside published tier ranges. ~20% revenue uplift across the board.', tone: 'border-gold/40 bg-gold/5' },
            { phase: 'Soon', title: 'Backfill nationality for "Other / Unspecified"', detail: '76 talents in the roster have no nationality — they all default to MENA pricing context. Filling this in unlocks correct regional adjustments at quote time.', tone: 'border-gold/40 bg-gold/5' },
            { phase: 'Q3 2026', title: 'Shikenso integration → per-talent calibration', detail: 'Within-tier spread starts: top of Tier S (Vejrgang, ImperialHal, NiKo at 50K) vs entry of Tier S (newer signings at 40K). Engagement + audience multipliers become data-driven per talent. Confidence promotes from rounded → exact en masse.', tone: 'border-navy/30 bg-navy/5' },
            { phase: 'Q4 2026 →', title: 'Move to middle of global pack', detail: 'Once Shikenso data backs up the case, push Tier 1 IG Reel toward $9–12K USD (SAR 35–45K) — between Cloud9 and 100 Thieves. Falcons is a 3× EWC champion; bottom-of-pack pricing is no longer defensible.', tone: 'border-navy/30 bg-navy/5' },
          ].map((e, i) => (
            <div key={i} className={`rounded-xl border-2 ${e.tone} p-4`}>
              <div className="flex items-center gap-3">
                <div className="text-[10px] uppercase tracking-wider font-bold text-label px-2 py-0.5 rounded-full bg-white border border-line">
                  {e.phase}
                </div>
                <h3 className="font-bold text-ink text-sm">{e.title}</h3>
              </div>
              <p className="text-xs text-label mt-2 leading-relaxed">{e.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Quick links ───────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/quote/new" className="card card-p hover:shadow-lift transition group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green text-white flex items-center justify-center"><Calculator size={20} /></div>
            <div>
              <div className="font-bold text-ink group-hover:text-greenDark transition">Apply this in a quote</div>
              <div className="text-xs text-label">Build now with these multipliers</div>
            </div>
            <ArrowRight size={16} className="ml-auto text-mute group-hover:text-greenDark transition" />
          </div>
        </Link>
        <Link href="/admin/pricing" className="card card-p hover:shadow-lift transition group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-navy text-white flex items-center justify-center"><GitBranch size={20} /></div>
            <div>
              <div className="font-bold text-ink group-hover:text-navy transition">Pricing OS (admin)</div>
              <div className="text-xs text-label">Edit axes, KB, defaults</div>
            </div>
            <ArrowRight size={16} className="ml-auto text-mute group-hover:text-navy transition" />
          </div>
        </Link>
        <Link href="/admin/assumptions" className="card card-p hover:shadow-lift transition group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gold text-white flex items-center justify-center"><BookOpen size={20} /></div>
            <div>
              <div className="font-bold text-ink group-hover:text-gold transition">Assumptions log</div>
              <div className="text-xs text-label">Every default + revisit trigger</div>
            </div>
            <ArrowRight size={16} className="ml-auto text-mute group-hover:text-gold transition" />
          </div>
        </Link>
      </section>

      {/* ─── Footer ───────────────────────────────────────────────── */}
      <p className="text-xs text-mute text-center leading-relaxed px-4">
        Live snapshot · Currency display: SAR (1 USD = 3.75 SAR) · Counts and averages refresh on every page load · Confidential — Internal Use Only
      </p>
    </div>
  );
}
