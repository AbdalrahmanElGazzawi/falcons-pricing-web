'use client';
import Link from 'next/link';
import {
  Compass, CheckCircle2, Clock, Sparkles, ArrowRight, GitBranch, Calendar,
  Database, RefreshCw, Users, Activity, Target, ShieldCheck, Layers,
} from 'lucide-react';

export function RoadmapContent() {
  return (
    <div className="space-y-10 -mx-4 sm:-mx-6 lg:-mx-8 -mt-2 pb-10">
      {/* ─── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-2xl bg-navy text-white px-6 sm:px-10 py-10 sm:py-14">
        <div
          aria-hidden
          className="absolute -top-24 -right-24 w-80 h-80 rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, #2ED06E 0%, transparent 70%)' }}
        />
        <div
          aria-hidden
          className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #D4A514 0%, transparent 70%)' }}
        />
        <div className="relative max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur text-xs uppercase tracking-wider font-medium">
            <Compass size={14} /> Roadmap
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight">
            Today, Shikenso, steady state.
          </h1>
          <p className="mt-4 text-base sm:text-lg text-white/80 max-w-2xl">
            The methodology engine doesn&rsquo;t change. What changes is the data quality feeding it.
            Three states, one formula — here&rsquo;s how we get from where we are to a fully
            data-driven rate book.
          </p>
        </div>
      </section>

      {/* ─── Three-state strip ────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* State 1 — Today */}
        <div className="card card-p border-2 border-green/40 bg-greenSoft/30 relative">
          <div className="absolute -top-3 left-5 px-2.5 py-0.5 rounded-full bg-green text-white text-[10px] uppercase tracking-wider font-bold">
            You are here
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-green text-white flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">State 1 — Today</h2>
              <p className="text-xs text-greenDark mt-0.5 font-medium">April 27, 2026 onward</p>
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-ink/85">
            <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green mt-2 flex-shrink-0" /> Methodology engine fully implemented in app + Supabase</li>
            <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green mt-2 flex-shrink-0" /> Tier baselines validated against industry benchmarks</li>
            <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green mt-2 flex-shrink-0" /> Follower data for 22 talents (deck + esports influencer DB)</li>
            <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green mt-2 flex-shrink-0" /> Tier classifications for all 196 active talents</li>
          </ul>
          <div className="mt-4 pt-4 border-t border-green/20">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-greenDark">Confidence levels</div>
            <div className="mt-2 space-y-1.5 text-xs text-ink/75">
              <div className="flex items-center justify-between"><span>22 talents</span><span className="font-semibold text-greenDark">HIGH</span></div>
              <div className="flex items-center justify-between"><span>~170 talents</span><span className="font-semibold text-label">BASELINE</span></div>
            </div>
          </div>
        </div>

        {/* State 2 — Shikenso */}
        <div className="card card-p border-2 border-gold/40 bg-gold/5 relative">
          <div className="absolute -top-3 left-5 px-2.5 py-0.5 rounded-full bg-gold text-white text-[10px] uppercase tracking-wider font-bold">
            Building
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gold text-white flex items-center justify-center flex-shrink-0">
              <Database size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">State 2 — With Shikenso</h2>
              <p className="text-xs text-gold mt-0.5 font-medium">Thursday onward, 4-week ramp</p>
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-ink/85">
            <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-gold mt-2 flex-shrink-0" /> Shikenso pulls follower + engagement + demographic data weekly</li>
            <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-gold mt-2 flex-shrink-0" /> ~60–70% of roster auto-resolves (~144 talents)</li>
            <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-gold mt-2 flex-shrink-0" /> CPM &amp; CPE methods become precise per-talent</li>
            <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-gold mt-2 flex-shrink-0" /> Audience &amp; engagement multipliers data-driven</li>
          </ul>
          <div className="mt-4 pt-4 border-t border-gold/20">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-gold">Confidence levels</div>
            <div className="mt-2 space-y-1.5 text-xs text-ink/75">
              <div className="flex items-center justify-between"><span>~144 talents</span><span className="font-semibold text-greenDark">HIGH</span></div>
              <div className="flex items-center justify-between"><span>~30–40 talents</span><span className="font-semibold text-gold">MEDIUM</span></div>
              <div className="flex items-center justify-between"><span>~15–20 talents</span><span className="font-semibold text-label">BASELINE</span></div>
            </div>
          </div>
        </div>

        {/* State 3 — Steady state */}
        <div className="card card-p border-2 border-navy/40 bg-navy/5 relative">
          <div className="absolute -top-3 left-5 px-2.5 py-0.5 rounded-full bg-navy text-white text-[10px] uppercase tracking-wider font-bold">
            Future
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-navy text-white flex items-center justify-center flex-shrink-0">
              <RefreshCw size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">State 3 — Steady state</h2>
              <p className="text-xs text-navy mt-0.5 font-medium">~July 2026, 3 months in</p>
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-ink/85">
            <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-navy mt-2 flex-shrink-0" /> Monday auto-sync, recompute methodology rates</li>
            <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-navy mt-2 flex-shrink-0" /> Pending changes review queue in /admin/players</li>
            <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-navy mt-2 flex-shrink-0" /> Quarterly manual refresh for uncovered talent</li>
            <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-navy mt-2 flex-shrink-0" /> Annual baseline re-calibration vs fresh benchmarks</li>
          </ul>
          <div className="mt-4 pt-4 border-t border-navy/20">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-navy">Confidence levels</div>
            <div className="mt-2 space-y-1.5 text-xs text-ink/75">
              <div className="flex items-center justify-between"><span>~170+ talents</span><span className="font-semibold text-greenDark">HIGH</span></div>
              <div className="flex items-center justify-between"><span>~25–30 talents</span><span className="font-semibold text-gold">MEDIUM</span></div>
              <div className="flex items-center justify-between"><span>edge cases</span><span className="font-semibold text-label">BASELINE</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── What changes vs what stays ───────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card card-p">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-greenSoft text-greenDark flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">What never changes</h2>
              <p className="text-xs text-label mt-0.5">Locked, sourced, defensible.</p>
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-ink/85">
            <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-green mt-0.5 flex-shrink-0" /> The formula</li>
            <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-green mt-0.5 flex-shrink-0" /> Tier baselines (S/1/2/3/4)</li>
            <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-green mt-0.5 flex-shrink-0" /> Platform ratios</li>
            <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-green mt-0.5 flex-shrink-0" /> Multiplier ranges</li>
            <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-green mt-0.5 flex-shrink-0" /> Add-on rights bands</li>
            <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-green mt-0.5 flex-shrink-0" /> Authority Floor for pros</li>
          </ul>
        </div>
        <div className="card card-p">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gold/15 text-gold flex items-center justify-center flex-shrink-0">
              <Activity size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">What evolves</h2>
              <p className="text-xs text-label mt-0.5">Data quality, not the engine.</p>
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-ink/85">
            <li className="flex items-start gap-2"><Sparkles size={14} className="text-gold mt-0.5 flex-shrink-0" /> Where reach data comes from (judgment → Shikenso → live)</li>
            <li className="flex items-start gap-2"><Sparkles size={14} className="text-gold mt-0.5 flex-shrink-0" /> Engagement multiplier (1.00 default → precise per-talent)</li>
            <li className="flex items-start gap-2"><Sparkles size={14} className="text-gold mt-0.5 flex-shrink-0" /> Audience-quality multiplier (1.20 default → demographic-driven)</li>
            <li className="flex items-start gap-2"><Sparkles size={14} className="text-gold mt-0.5 flex-shrink-0" /> Refresh cadence (manual → weekly auto)</li>
            <li className="flex items-start gap-2"><Sparkles size={14} className="text-gold mt-0.5 flex-shrink-0" /> Confidence per talent (tagged in <code className="px-1 py-0.5 rounded bg-bg border border-line text-xs">rate_source</code>)</li>
          </ul>
        </div>
      </section>

      {/* ─── Migration timeline ───────────────────────────────────────── */}
      <section className="card card-p">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-navy/10 text-navy flex items-center justify-center flex-shrink-0">
            <GitBranch size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink">Migration plan</h2>
            <p className="text-sm text-label mt-0.5">Two staged migrations to go from today to Shikenso-driven.</p>
          </div>
        </div>

        <div className="mt-6 space-y-5">
          {/* 019 */}
          <div className="rounded-xl border-2 border-green/40 bg-greenSoft/30 p-5">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="px-2.5 py-1 rounded-md bg-green text-white text-xs font-bold uppercase tracking-wider">Migration 019</div>
              <h3 className="font-bold text-ink">Pre-Shikenso fix · sales-unblock</h3>
              <span className="ml-auto text-xs text-greenDark font-medium flex items-center gap-1.5">
                <Clock size={12} /> Ready to ship
              </span>
            </div>
            <ul className="mt-3 space-y-1.5 text-sm text-ink/85">
              <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green mt-2 flex-shrink-0" /> Add <code className="px-1 py-0.5 rounded bg-white border border-line text-xs">rate_source</code> + <code className="px-1 py-0.5 rounded bg-white border border-line text-xs">audience_market</code> columns to <code className="px-1 py-0.5 rounded bg-white border border-line text-xs">players</code> &amp; <code className="px-1 py-0.5 rounded bg-white border border-line text-xs">creators</code></li>
              <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green mt-2 flex-shrink-0" /> Update 22 known-data talents to methodology rates → tag <code className="px-1 py-0.5 rounded bg-white border border-line text-xs">methodology_v2</code></li>
              <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green mt-2 flex-shrink-0" /> Fix 16 tier mismatches (e.g. 9leeh Tier 3 → Tier 1, oPiiLz Tier 1 → Tier S)</li>
              <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green mt-2 flex-shrink-0" /> Cap 24 known-hot lines (Twitch/Kick parity issue)</li>
              <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green mt-2 flex-shrink-0" /> Tag remainder <code className="px-1 py-0.5 rounded bg-white border border-line text-xs">tier_baseline_legacy</code> for Shikenso refresh</li>
            </ul>
          </div>

          {/* 020 */}
          <div className="rounded-xl border-2 border-gold/40 bg-gold/5 p-5">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="px-2.5 py-1 rounded-md bg-gold text-white text-xs font-bold uppercase tracking-wider">Migration 020</div>
              <h3 className="font-bold text-ink">Post-Shikenso refresh · roster-wide</h3>
              <span className="ml-auto text-xs text-gold font-medium flex items-center gap-1.5">
                <Calendar size={12} /> After Thursday
              </span>
            </div>
            <ul className="mt-3 space-y-1.5 text-sm text-ink/85">
              <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-gold mt-2 flex-shrink-0" /> Pull follower &amp; engagement data for the remaining ~170 talents</li>
              <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-gold mt-2 flex-shrink-0" /> Recompute methodology rates with real inputs</li>
              <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-gold mt-2 flex-shrink-0" /> Bulk update with <code className="px-1 py-0.5 rounded bg-white border border-line text-xs">rate_source = &lsquo;shikenso_v1&rsquo;</code></li>
              <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-gold mt-2 flex-shrink-0" /> Fix the seed-formula bug on <code className="px-1 py-0.5 rounded bg-white border border-line text-xs">rate_event_snap</code> &amp; <code className="px-1 py-0.5 rounded bg-white border border-line text-xs">rate_yt_full</code></li>
              <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-gold mt-2 flex-shrink-0" /> Set up Monday auto-sync job</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ─── Operational rhythm post-Shikenso ────────────────────────── */}
      <section className="card card-p">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-greenSoft text-greenDark flex items-center justify-center flex-shrink-0">
            <RefreshCw size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink">Steady-state operational rhythm</h2>
            <p className="text-sm text-label mt-0.5">Once Shikenso is plumbed in, this is the weekly cycle.</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { day: 'Monday', t: '02:00 SAR', a: 'Shikenso sync runs. Followers, engagement, demographics refresh.', icon: Database },
            { day: 'Monday', t: 'AM',        a: 'Pending changes appear in /admin/players for any talent with >10% delta.', icon: Activity },
            { day: 'Tuesday', t: '—',         a: 'Commercial reviews and approves rate changes in batch.', icon: CheckCircle2 },
            { day: 'Quarterly', t: '—',         a: 'Manual data refresh for the ~15-20% Shikenso doesn&rsquo;t cover.', icon: Users },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="rounded-xl border border-line bg-bg p-4">
                <div className="flex items-center gap-2">
                  <Icon size={14} className="text-greenDark" />
                  <div className="text-xs uppercase tracking-wider font-bold text-greenDark">{s.day}</div>
                </div>
                <div className="text-[11px] uppercase tracking-wider text-mute mt-0.5">{s.t}</div>
                <div className="text-sm text-ink mt-2 leading-relaxed">{s.a}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Coverage expectations ────────────────────────────────────── */}
      <section className="card card-p">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gold/15 text-gold flex items-center justify-center flex-shrink-0">
            <Target size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink">Shikenso coverage expectations</h2>
            <p className="text-sm text-label mt-0.5">Realistic — not all teams/talent will be auto-resolvable.</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-green/40 bg-greenSoft/30 p-4">
            <div className="text-xs uppercase tracking-wider font-bold text-greenDark">Bucket A — Auto</div>
            <div className="text-xl font-extrabold mt-1 text-ink">~60–70%</div>
            <div className="text-xs text-label mt-2 leading-relaxed">
              International esports pros (NiKo, m0NESY, Hikaru, ImperialHal, Cellium, COD/CS2/Apex/MLBB rosters). Weekly auto-refresh.
            </div>
          </div>
          <div className="rounded-xl border border-gold/40 bg-gold/5 p-4">
            <div className="text-xs uppercase tracking-wider font-bold text-gold">Bucket B — Manual</div>
            <div className="text-xl font-extrabold mt-1 text-ink">~20–25%</div>
            <div className="text-xs text-label mt-2 leading-relaxed">
              Saudi/MENA micro-creators, esports influencers (Abo Ghazi, Ghala, Moaz, vacwep, FMG). Quarterly manual refresh via /admin.
            </div>
          </div>
          <div className="rounded-xl border border-line bg-bg p-4">
            <div className="text-xs uppercase tracking-wider font-bold text-label">Bucket C — Tier-only</div>
            <div className="text-xl font-extrabold mt-1 text-ink">~10–15%</div>
            <div className="text-xs text-label mt-2 leading-relaxed">
              Coaches, managers, analysts, niche-game players. Priced via tier baseline + Authority Floor — social data not relevant.
            </div>
          </div>
        </div>
        <p className="mt-4 text-xs text-mute leading-relaxed">
          Bucket B and C are not a problem — they have working pricing today and stay on the same approach. Shikenso upgrades the data layer for Bucket A; the methodology engine handles all three buckets identically.
        </p>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/about" className="card card-p hover:shadow-lift transition group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-greenDark text-white flex items-center justify-center">
              <Layers size={20} />
            </div>
            <div>
              <div className="font-bold text-ink group-hover:text-greenDark transition">Read the methodology</div>
              <div className="text-xs text-label">Formula, tier baselines, calculation methods</div>
            </div>
            <ArrowRight size={16} className="ml-auto text-mute group-hover:text-greenDark transition" />
          </div>
        </Link>
        <Link href="/quote/new" className="card card-p hover:shadow-lift transition group bg-navy text-white border-navy">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green text-white flex items-center justify-center">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="font-bold text-white">Build a quote now</div>
              <div className="text-xs text-white/70">Methodology applied to today&rsquo;s rate book</div>
            </div>
            <ArrowRight size={16} className="ml-auto text-white/60 group-hover:text-green transition" />
          </div>
        </Link>
      </section>

      <p className="text-xs text-mute text-center leading-relaxed px-4">
        Methodology v2.0 · Last calibration: April 2026 · Confidential — Internal Use Only
      </p>
    </div>
  );
}
