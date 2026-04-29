'use client';
import Link from 'next/link';
import {
  Sparkles, Calculator, Layers, BookOpen, Trophy, Globe, Target,
  Compass, GitBranch, Zap, Award, ArrowRight, ShieldCheck, FileText,
  TrendingUp, Eye, CheckCircle2,
} from 'lucide-react';

export function AboutContent() {
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
            <Sparkles size={14} /> How we price
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight">
            One formula, built on world-class benchmarks, calibrated for MENA.
          </h1>
          <p className="mt-4 text-base sm:text-lg text-white/80 max-w-2xl">
            Team Falcons uses the industry-standard CPM-anchored pricing model — the same approach
            used by WME, CAA, Wasserman, and every Tier 1 esports organization globally. Adapted for
            the Saudi & MENA market, calibrated against Newzoo, Nielsen, Shikenso, Influencity,
            Porter Wills, and StreamElements benchmarks.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href="/quote/new" className="btn btn-primary !py-2.5 !px-5">
              Build a quote <ArrowRight size={16} />
            </Link>
            <Link href="/roadmap" className="btn !py-2.5 !px-5 bg-white/10 hover:bg-white/15 text-white border border-white/20">
              See the roadmap
            </Link>
          </div>
        </div>
      </section>

      {/* ─── The principle ─────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.4fr,1fr] gap-6">
        <div className="card card-p">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-greenSoft text-greenDark flex items-center justify-center flex-shrink-0">
              <Calculator size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-ink">The formula</h2>
              <p className="text-sm text-label mt-0.5">Same engine, every quote, every talent.</p>
            </div>
          </div>
          <div className="mt-5 rounded-xl bg-greenSoft/40 border border-green/20 p-5 font-mono text-sm leading-relaxed">
            <div className="text-greenDark font-semibold">
              Final = MAX(SocialPrice, AuthorityFloor) × ConfidenceCap × (1 + RightsUplift)
            </div>
            <div className="mt-3 text-ink/80 text-xs">
              SocialPrice = BaseRate × Engagement × Audience × Seasonality × ContentType × Language × AuthorityFactor
            </div>
            <div className="text-ink/80 text-xs mt-1">
              AuthorityFloor = IRL × FloorShare × Seasonality × Language × AuthorityFactor
            </div>
          </div>
          <p className="mt-4 text-sm text-label leading-relaxed">
            Three independent calibration sources (CPM, CPE, Comparables) feed the BaseRate.
            Multipliers adjust for engagement, audience quality, seasonality, content type, and
            language. Add-on rights packages layer uplift. The Authority Floor protects pro player
            pricing from being undercut by social-only metrics.
          </p>
        </div>

        <div className="card card-p bg-navy text-white border-navy">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 text-gold flex items-center justify-center flex-shrink-0">
              <Award size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">What never changes</h2>
              <p className="text-sm text-white/70 mt-0.5">The locked, defensible foundation.</p>
            </div>
          </div>
          <ul className="mt-5 space-y-2.5 text-sm text-white/85">
            <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-green flex-shrink-0 mt-0.5" /> The formula</li>
            <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-green flex-shrink-0 mt-0.5" /> Tier baselines (S/1/2/3/4)</li>
            <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-green flex-shrink-0 mt-0.5" /> Platform ratios (TikTok 0.78×, YT Full 2.50×, IRL 2.20×, Twitch 1.45×)</li>
            <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-green flex-shrink-0 mt-0.5" /> Multiplier ranges (industry-sourced, MENA-adjusted)</li>
            <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-green flex-shrink-0 mt-0.5" /> Add-on rights uplift bands</li>
            <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-green flex-shrink-0 mt-0.5" /> Authority Floor protection</li>
          </ul>
          <p className="mt-5 text-xs text-gold/90 italic">What evolves is the data quality feeding the engine — not the engine itself.</p>
        </div>
      </section>

      {/* ─── Tier baselines ──────────────────────────────────────────── */}
      <section className="card card-p">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gold/15 text-gold flex items-center justify-center flex-shrink-0">
            <Layers size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink">Tier baselines (Instagram Reel = SAR baseline)</h2>
            <p className="text-sm text-label mt-0.5">
              Every other deliverable is a fixed ratio of IG Reel. IG Reel is the lingua franca because every creator does them — not because it&rsquo;s the highest-paid format.
            </p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { tier: 'Tier S', sar: '40,000', desc: '>1M on any platform · global anchor',   accent: 'bg-gold/10 border-gold/40 text-gold' },
            { tier: 'Tier 1', sar: '22,000', desc: '250K – 1M · regional top-10',           accent: 'bg-greenDark/10 border-greenDark/40 text-greenDark' },
            { tier: 'Tier 2', sar: '11,000', desc: '50K – 250K · active pro / mid creator', accent: 'bg-navy/10 border-navy/30 text-navy' },
            { tier: 'Tier 3', sar:  '6,500', desc: '10K – 50K · emerging / niche',           accent: 'bg-line border-mute text-label' },
            { tier: 'Tier 4', sar:  '3,500', desc: '<10K or staff · entry / support',        accent: 'bg-line border-mute text-label' },
          ].map(t => (
            <div key={t.tier} className={`rounded-xl border ${t.accent} p-4`}>
              <div className="text-xs uppercase tracking-wider font-semibold opacity-90">{t.tier}</div>
              <div className="text-2xl font-extrabold mt-1 text-ink">{t.sar}</div>
              <div className="text-[11px] uppercase tracking-wider mt-0.5 opacity-70">SAR · IG Reel</div>
              <div className="text-xs mt-2 text-label">{t.desc}</div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-mute leading-relaxed">
          Tier assignment is data-driven (peak follower count across platforms) when we have data; judgment-driven when we don&rsquo;t. Calibrated against FaZe Clan, Cloud9, T1, NRG, 100 Thieves, and Karmine Corp Tier 1 ranges, scaled for MENA market positioning.
        </p>
      </section>

      {/* ─── Five calculation methods ─────────────────────────────────── */}
      <section>
        <h2 className="text-xl font-bold text-ink px-1">Five ways to calculate the base rate — we take the MAX</h2>
        <p className="text-sm text-label mt-1 px-1">Floor of all applicable methods. Per the methodology, never below.</p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { num: '1', name: 'CPM', sub: 'Cost per Mille', icon: TrendingUp, formula: '(Followers × Reach × CPM) ÷ 1,000', use: 'Talent with reliable follower data', color: 'text-greenDark', bg: 'bg-greenSoft' },
            { num: '2', name: 'CPE', sub: 'Cost per Engagement', icon: Zap, formula: 'Engagements × CPE rate', use: 'High-engagement micro-influencers', color: 'text-gold', bg: 'bg-gold/10' },
            { num: '3', name: 'Comparable', sub: 'Industry benchmarks', icon: Globe, formula: 'Peer org Tier-equivalent × MENA adj.', use: 'Sanity check on every quote', color: 'text-navy', bg: 'bg-navy/10' },
            { num: '4', name: 'Tier Baseline', sub: 'Lookup table', icon: Layers, formula: 'IG Reel base × Platform ratio', use: 'Default when other methods unavailable', color: 'text-greenDark', bg: 'bg-greenSoft' },
            { num: '5', name: 'Streaming-Specific', sub: 'ACV-based', icon: Eye, formula: 'ACV × Stream CPM × Hours', use: 'Twitch/Kick/YouTube Live deliverables', color: 'text-gold', bg: 'bg-gold/10' },
          ].map(m => {
            const Icon = m.icon;
            return (
              <div key={m.num} className="card card-p">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg ${m.bg} ${m.color} flex items-center justify-center flex-shrink-0 font-bold text-sm`}>
                    {m.num}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Icon size={14} className={m.color} />
                      <h3 className="font-bold text-ink text-sm">{m.name}</h3>
                    </div>
                    <p className="text-[11px] uppercase tracking-wider text-mute mt-0.5">{m.sub}</p>
                  </div>
                </div>
                <div className="mt-3 rounded-lg bg-bg border border-line p-3 font-mono text-xs text-ink/80">
                  {m.formula}
                </div>
                <p className="text-xs text-label mt-3 leading-relaxed">{m.use}</p>
              </div>
            );
          })}
          <div className="card card-p border-2 border-gold/40 bg-gold/5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-gold text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">
                =
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Target size={14} className="text-gold" />
                  <h3 className="font-bold text-ink text-sm">Base Rate</h3>
                </div>
                <p className="text-[11px] uppercase tracking-wider text-gold mt-0.5">Master rule</p>
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-gold/10 border border-gold/30 p-3 font-mono text-xs text-ink font-semibold">
              MAX(applicable methods)
            </div>
            <p className="text-xs text-label mt-3 leading-relaxed">
              The floor. Never below. Then multipliers apply, then add-on rights uplift, then VAT.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Confidence ladder ────────────────────────────────────────── */}
      <section className="card card-p">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-navy/10 text-navy flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink">The confidence ladder</h2>
            <p className="text-sm text-label mt-0.5">Same formula at every level — only the data quality changes.</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-3">
          {[
            { label: 'HIGH', sub: 'Data-driven', desc: 'Verified followers + engagement + demographics from Shikenso or internal database. CPM + CPE + Comparable methods all run.', tone: 'border-green/40 bg-greenSoft text-greenDark' },
            { label: 'MEDIUM', sub: 'Partial data', desc: 'Some follower data (deck, manual lookup). CPM + Comparable methods run.', tone: 'border-gold/40 bg-gold/5 text-gold' },
            { label: 'BASELINE', sub: 'Tier-classified', desc: 'No follower data. Falls back to Tier baseline lookup table. Refresh when Shikenso lands.', tone: 'border-navy/30 bg-navy/5 text-navy' },
            { label: 'FALLBACK', sub: 'Authority Floor', desc: 'Pro player / coach / staff role. Priced on appearance fee logic, not social metrics.', tone: 'border-line bg-bg text-label' },
          ].map(c => (
            <div key={c.label} className={`rounded-xl border ${c.tone} p-4`}>
              <div className="text-xs uppercase tracking-wider font-bold">{c.label}</div>
              <div className="text-[11px] uppercase tracking-wider mt-0.5 opacity-80">{c.sub}</div>
              <div className="text-xs mt-2.5 leading-relaxed text-ink/80">{c.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Sources ───────────────────────────────────────────────── */}
      <section className="card card-p">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-greenSoft text-greenDark flex items-center justify-center flex-shrink-0">
            <BookOpen size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink">Sources we calibrate against</h2>
            <p className="text-sm text-label mt-0.5">Defensible to clients, leadership, and internal review.</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          {[
            ['Newzoo Global Esports & Live Streaming Report 2025', 'Org benchmarks, MENA market data'],
            ['Shikenso Esports Sponsorship ROI Guide 2025', 'Sponsorship values, multiplier benchmarks'],
            ['Nielsen Esports Audience Report 2025', 'CPM benchmarks, brand recall'],
            ['Influencity 2026 Rate Card Benchmarks', 'Platform rates, multiplier standards'],
            ['Porter Wills Esports Marketing Guide 2025', 'Tier 1 benchmarks, usage rights'],
            ['StreamElements State of Streaming 2025', 'Twitch/Kick rate benchmarks'],
            ['WME / CAA / Wasserman agency practice', 'Base fee pricing methodology'],
            ['Internal Falcons commercial data 2025', 'Negotiated cards, historical deals'],
          ].map(([source, used]) => (
            <div key={source} className="rounded-lg border border-line bg-bg p-3">
              <div className="font-medium text-ink text-xs leading-snug">{source}</div>
              <div className="text-xs text-label mt-1.5">{used}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Comparable positioning ───────────────────────────────────── */}
      <section className="card card-p">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gold/15 text-gold flex items-center justify-center flex-shrink-0">
            <Trophy size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink">Where Falcons sits in the market (Tier 1 IG Reel, USD)</h2>
            <p className="text-sm text-label mt-0.5">Today we sit at the low end of US Tier 1 ranges. As a 3-time EWC champion and the largest org in MENA, the defensible target is mid-pack — between Cloud9 and 100 Thieves territory.</p>
          </div>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-line">
                <th className="py-2 pr-4 font-semibold text-label">Org</th>
                <th className="py-2 pr-4 font-semibold text-label">Region</th>
                <th className="py-2 pr-4 font-semibold text-label">Tier 1 IG Reel</th>
                <th className="py-2 pr-4 font-semibold text-label">Tier 2 IG Reel</th>
              </tr>
            </thead>
            <tbody className="text-ink">
              {[
                ['T1 Esports', 'Global', '$15K–50K+', '$3K–8K'],
                ['FaZe Clan', 'NA', '$12K–30K', '$2.5K–6K'],
                ['Cloud9', 'NA', '$8K–20K', '$2K–5K'],
                ['100 Thieves', 'NA', '$10K–25K', '$2.5K–6K'],
                ['NRG', 'NA', '$6K–15K', '$1.5K–4K'],
                ['Karmine Corp', 'EU', '€5K–15K', '€1.5K–4K'],
              ].map(([o, r, t1, t2]) => (
                <tr key={o} className="border-b border-line">
                  <td className="py-2 pr-4 font-medium">{o}</td>
                  <td className="py-2 pr-4 text-label">{r}</td>
                  <td className="py-2 pr-4">{t1}</td>
                  <td className="py-2 pr-4">{t2}</td>
                </tr>
              ))}
              <tr className="bg-greenSoft/40">
                <td className="py-2.5 pr-4 font-bold text-greenDark">Team Falcons (today, post-floor-lift)</td>
                <td className="py-2.5 pr-4 text-greenDark font-medium">MENA</td>
                <td className="py-2.5 pr-4 font-bold text-greenDark">$5.9K (SAR 22K)</td>
                <td className="py-2.5 pr-4 font-bold text-greenDark">$2.9K (SAR 11K)</td>
              </tr>
              <tr className="bg-gold/5">
                <td className="py-2.5 pr-4 font-bold text-gold">Team Falcons (target 2027 — middle of pack)</td>
                <td className="py-2.5 pr-4 text-gold font-medium">MENA</td>
                <td className="py-2.5 pr-4 font-bold text-gold">$10–12K (SAR 38–45K)</td>
                <td className="py-2.5 pr-4 font-bold text-gold">$4.8–6.7K (SAR 18–25K)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── Quick links ──────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/quote/new" className="card card-p hover:shadow-lift transition group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green text-white flex items-center justify-center">
              <FileText size={20} />
            </div>
            <div>
              <div className="font-bold text-ink group-hover:text-greenDark transition">Build a quote</div>
              <div className="text-xs text-label">Apply the methodology now</div>
            </div>
            <ArrowRight size={16} className="ml-auto text-mute group-hover:text-greenDark transition" />
          </div>
        </Link>
        <Link href="/roadmap" className="card card-p hover:shadow-lift transition group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-navy text-white flex items-center justify-center">
              <Compass size={20} />
            </div>
            <div>
              <div className="font-bold text-ink group-hover:text-navy transition">See the roadmap</div>
              <div className="text-xs text-label">Today → Shikenso → Steady state</div>
            </div>
            <ArrowRight size={16} className="ml-auto text-mute group-hover:text-navy transition" />
          </div>
        </Link>
        <Link href="/calculator" className="card card-p hover:shadow-lift transition group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gold text-white flex items-center justify-center">
              <Calculator size={20} />
            </div>
            <div>
              <div className="font-bold text-ink group-hover:text-gold transition">Quick estimate</div>
              <div className="text-xs text-label">Single-deliverable price check</div>
            </div>
            <ArrowRight size={16} className="ml-auto text-mute group-hover:text-gold transition" />
          </div>
        </Link>
      </section>

      {/* ─── Footer note ──────────────────────────────────────────────── */}
      <p className="text-xs text-mute text-center leading-relaxed px-4">
        Methodology v2.0 · Last calibration: April 2026 · Currency: SAR (1 USD = 3.75 SAR) · Confidential — Internal Use Only
      </p>
    </div>
  );
}
