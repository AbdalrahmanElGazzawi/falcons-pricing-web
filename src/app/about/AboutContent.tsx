'use client';
import Link from 'next/link';
import {
  Sparkles, Calculator, Layers, BookOpen, Trophy, Globe, Target,
  Compass, GitBranch, Zap, Award, ArrowRight, ShieldCheck, FileText,
  TrendingUp, Eye, CheckCircle2, Coins, Flag, Database, MessageCircleQuestion,
  Lock, Hourglass, AlertCircle, ListChecks,
} from 'lucide-react';

export function AboutContent() {
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
            <Sparkles size={14} /> How we price
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight">
            One formula, defended on real benchmarks, calibrated for MENA.
          </h1>
          <p className="mt-4 text-lg text-white/85 leading-relaxed max-w-2xl">
            Every quote we send sits inside a defensible band — Floor, Anchor, Stretch, Ceiling — anchored to peer rate cards
            (FaZe / Cloud9 / 100T / T1 / G2 / NRG), audited per tier × game × audience market, and source-attributed per cell.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/quote/new" className="btn !py-2.5 !px-5 bg-green hover:bg-greenDark text-white">
              Build a quote <ArrowRight size={16} className="-mr-1" />
            </Link>
            <Link href="/admin/market-bands" className="btn !py-2.5 !px-5 bg-white/10 hover:bg-white/15 text-white border border-white/20">
              See the bands
            </Link>
            <Link href="/roadmap" className="btn !py-2.5 !px-5 bg-white/10 hover:bg-white/15 text-white border border-white/20">
              Roadmap
            </Link>
          </div>
          <div className="mt-7 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl">
            {[
              { v: '5', l: 'tiers (S → 4)' },
              { v: '22', l: 'platform ratios' },
              { v: '6', l: 'markets (KSA · MENA · NA · EU · APAC · Global)' },
              { v: '19+', l: 'pricing axes' },
            ].map(s => (
              <div key={s.l} className="rounded-xl border border-white/15 bg-white/5 backdrop-blur px-3 py-2.5">
                <div className="text-2xl font-extrabold text-white tabular-nums">{s.v}</div>
                <div className="text-[10px] uppercase tracking-wider text-white/70 mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── F / A / S / C model ─────────────────────────────────────── */}
      <section className="card card-p">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-greenSoft text-greenDark flex items-center justify-center flex-shrink-0">
            <Target size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-ink">The four-point model — Floor · Anchor · Stretch · Ceiling</h2>
            <p className="text-sm text-label mt-0.5">Every quote line sits somewhere on this bar. Management can defend any number on it; nothing outside it goes out without an override + reason.</p>
          </div>
        </div>

        <div className="mt-6">
          {/* Visual band */}
          <div className="relative h-20 rounded-xl overflow-hidden border border-line">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-100 via-greenSoft via-green/20 to-gold/15 dark:from-orange-900/30 dark:via-green/15 dark:via-green/15 dark:to-gold/20" />
            <div className="absolute inset-0 grid grid-cols-3">
              <div className="border-r border-line/50" />
              <div className="border-r border-line/50" />
              <div />
            </div>
            <div className="absolute inset-0 flex items-center justify-between px-4 text-[11px] font-bold uppercase tracking-wider">
              <span className="text-orange-700 dark:text-orange-300">FLOOR</span>
              <span className="text-greenDark dark:text-green">ANCHOR</span>
              <span className="text-greenDark dark:text-green">STRETCH</span>
              <span className="text-gold">CEILING</span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { k: 'Floor',   ic: ShieldCheck, color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700/50',
                desc: "MAX(talent's stated minimum × 0.95, last accepted × 0.95, production cost, methodology floor). Below this we don't go without coming back to the talent." },
              { k: 'Anchor',  ic: Target,      color: 'text-greenDark dark:text-green', bg: 'bg-green/10 border-green/30',
                desc: 'Median of the market_band for tier × game × audience × platform — backed by peer rate cards. The number we lead with on most quotes.' },
              { k: 'Stretch', ic: TrendingUp,  color: 'text-greenDark dark:text-green', bg: 'bg-green/10 border-green/30',
                desc: 'Anchor × (1 + rights stack: exclusivity / paid usage / whitelisting / rush). Capped at Ceiling.' },
              { k: 'Ceiling', ic: Award,       color: 'text-gold',            bg: 'bg-gold/10 border-gold/30',
                desc: 'Top of the market_band. Above here, we have to defend it explicitly — usually only flagship campaigns or first-time category clearance.' },
            ].map(b => {
              const Icon = b.ic;
              return (
                <div key={b.k} className={`rounded-xl border p-4 ${b.bg}`}>
                  <div className={`flex items-center gap-2 ${b.color}`}>
                    <Icon size={16} />
                    <div className="text-xs uppercase tracking-wider font-bold">{b.k}</div>
                  </div>
                  <p className="text-xs text-ink mt-2 leading-relaxed">{b.desc}</p>
                </div>
              );
            })}
          </div>

          <p className="mt-4 text-xs text-mute leading-relaxed">
            Every band cell traces to a source: <strong>peer_rate_card</strong>, <strong>methodology_v2_baseline</strong>, <strong>closed_deal_history</strong>, or <strong>manual_override</strong>. View and edit at <Link href="/admin/market-bands" className="text-greenDark hover:underline">/admin/market-bands</Link>.
          </p>
        </div>
      </section>

      {/* ─── The formula ─────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.4fr,1fr] gap-6">
        <div className="card card-p">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-greenSoft text-greenDark flex items-center justify-center flex-shrink-0">
              <Calculator size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-ink">The engine</h2>
              <p className="text-sm text-label mt-0.5">Same formula every quote, every talent.</p>
            </div>
          </div>
          <div className="mt-5 rounded-xl bg-greenSoft/40 dark:bg-green/10 border border-green/20 p-5 font-mono text-sm leading-relaxed">
            <div className="text-greenDark dark:text-green font-semibold">
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
            BaseRate is the MAX of available calculation methods (Comparable / CPM / CPE / Tier Baseline / Authority Floor / Cost-Plus). The Authority Floor protects pro-player pricing from being undercut by social-only metrics — a 3-time EWC champion with modest IG should still command a real fee.
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
            <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-green flex-shrink-0 mt-0.5" /> Tier ladder S/1/2/3/4</li>
            <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-green flex-shrink-0 mt-0.5" /> Platform ratios (TikTok 0.78×, YT Full 2.50×, IRL 2.20×, Twitch 1.45×)</li>
            <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-green flex-shrink-0 mt-0.5" /> SAR canonical · 1 USD = 3.75 SAR (Saudi peg)</li>
            <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-green flex-shrink-0 mt-0.5" /> Authority Floor protection</li>
            <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-green flex-shrink-0 mt-0.5" /> Source attribution per band cell</li>
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
            <h2 className="text-xl font-bold text-ink">Tier baselines (Instagram Reel, SAR, KSA market)</h2>
            <p className="text-sm text-label mt-0.5">
              Every other deliverable is a fixed ratio of IG Reel. IG Reel is the lingua franca because every creator does them — not because it&rsquo;s the highest-paid format. KSA = baseline; MENA = 0.85×; Global = 0.65×.
            </p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { tier: 'Tier S', sar: '28,000', desc: '>1M reach · global anchor',           accent: 'bg-gold/10 dark:bg-gold/20 border-gold/40 text-gold' },
            { tier: 'Tier 1', sar: '18,000', desc: '250K – 1M · regional top-tier',       accent: 'bg-greenDark/10 dark:bg-green/15 border-greenDark/40 text-greenDark dark:text-green' },
            { tier: 'Tier 2', sar: '11,000', desc: '50K – 250K · active pro / mid',       accent: 'bg-navy/10 dark:bg-blue-900/30 border-navy/30 text-navy dark:text-blue-300' },
            { tier: 'Tier 3', sar:  '6,500', desc: '10K – 50K · emerging / niche',         accent: 'bg-line dark:bg-card border-mute text-label' },
            { tier: 'Tier 4', sar:  '3,500', desc: '<10K · entry / staff / support',       accent: 'bg-line dark:bg-card border-mute text-label' },
          ].map(t => (
            <div key={t.tier} className={`rounded-xl border ${t.accent} p-4`}>
              <div className="text-xs uppercase tracking-wider font-semibold opacity-90">{t.tier}</div>
              <div className="text-2xl font-extrabold mt-1 text-ink tabular-nums">{t.sar}</div>
              <div className="text-[11px] uppercase tracking-wider mt-0.5 opacity-70">SAR · IG Reel</div>
              <div className="text-xs mt-2 text-label">{t.desc}</div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-mute leading-relaxed">
          Baselines are auto-flagged at the row level — if assigned tier doesn&rsquo;t match peak follower data we surface a Promote/Demote action on Roster. Methodology v2.0 calibration; replace cells with peer-card-sourced bands at <Link href="/admin/market-bands" className="text-greenDark hover:underline">/admin/market-bands</Link> as you collect them.
        </p>
      </section>

      {/* ─── Audience markets ─────────────────────────────────────────── */}
      <section className="card card-p">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 flex items-center justify-center flex-shrink-0">
            <Globe size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink">Audience markets</h2>
            <p className="text-sm text-label mt-0.5">Region drives both pricing band and currency display. Same talent, different brand audiences price differently.</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { code: 'KSA',    mult: '1.00×', ccy: 'SAR primary', desc: 'Saudi mass + GCC affluent. Mainstream brand demand. Highest premium for nationality + Arabic language.', tone: 'border-green/30 bg-green/10 text-greenDark dark:text-green' },
            { code: 'MENA',   mult: '0.85×', ccy: 'SAR primary', desc: 'GCC + Levant + Egypt + Maghreb. Pan-Arab regional play. Slightly slimmer brand budgets vs KSA.', tone: 'border-amber-300 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300' },
            { code: 'NA',     mult: '1.30×', ccy: 'USD primary', desc: 'North-American pros (US / Canada). FaZe / Cloud9 / 100T comparable bands. Highest brand-budget tier in the system.', tone: 'border-purple-200 dark:border-purple-700/50 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
            { code: 'EU',     mult: '1.10×', ccy: 'USD primary', desc: 'European pros (CS2, EAFC, R6 scenes). Karmine Corp / Fnatic comparable. Mid-premium band.', tone: 'border-indigo-200 dark:border-indigo-700/50 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' },
            { code: 'APAC',   mult: '0.85×', ccy: 'USD primary', desc: 'Asia-Pacific pros (Korean / Filipino / Australian / Pakistani). MLBB / PUBG dominant. Smaller per-deal brand budgets.', tone: 'border-teal-200 dark:border-teal-700/50 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300' },
            { code: 'Global', mult: '1.00×', ccy: 'USD primary', desc: 'Fallback for talents without dominant region (chess, multi-game). Used sparingly post-Mig 061/063.', tone: 'border-blue-200 dark:border-blue-700/50 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
          ].map(m => (
            <div key={m.code} className={`rounded-xl border p-4 ${m.tone}`}>
              <div className="flex items-center justify-between">
                <div className="text-lg font-extrabold">{m.code}</div>
                <div className="text-xs font-mono tabular-nums">{m.mult}</div>
              </div>
              <div className="text-[11px] uppercase tracking-wider mt-1 font-semibold opacity-80">{m.ccy}</div>
              <p className="text-xs text-ink mt-2 leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Five calculation methods ─────────────────────────────────── */}
      <section>
        <h2 className="text-xl font-bold text-ink px-1">Six ways to calculate the base rate — we take the MAX</h2>
        <p className="text-sm text-label mt-1 px-1">Floor of all applicable methods. Per the methodology, never below.</p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { num: '1', name: 'CPM',         sub: 'Cost per Mille',       icon: TrendingUp, formula: '(Followers × Reach × CPM) ÷ 1,000', use: 'Talent with verified follower data' },
            { num: '2', name: 'CPE',         sub: 'Cost per Engagement',  icon: Zap,        formula: 'Engagements × CPE rate',           use: 'High-engagement micro-influencers' },
            { num: '3', name: 'Comparable',  sub: 'Industry benchmarks',  icon: Globe,      formula: 'Peer org tier-equivalent × MENA adj.', use: 'Sanity check on every quote' },
            { num: '4', name: 'Tier Baseline', sub: 'SOT lookup',         icon: Layers,     formula: 'IG Reel tier × Platform ratio',    use: 'Default when other methods unavailable' },
            { num: '5', name: 'Streaming',   sub: 'ACV-based',            icon: Eye,        formula: 'ACV × Stream CPM × Hours',         use: 'Twitch / Kick / YouTube Live' },
            { num: '6', name: 'Cost-Plus',   sub: 'Production basis',     icon: Database,   formula: 'production_cost ÷ (1 − splits − margin)', use: 'Events, on-ground, rev-share lanes' },
          ].map(m => {
            const Icon = m.icon;
            return (
              <div key={m.num} className="card card-p">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-greenSoft dark:bg-green/15 text-greenDark dark:text-green flex items-center justify-center flex-shrink-0 font-bold text-sm">
                    {m.num}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Icon size={14} className="text-greenDark dark:text-green" />
                      <h3 className="font-bold text-ink text-sm">{m.name}</h3>
                    </div>
                    <p className="text-[11px] uppercase tracking-wider text-mute mt-0.5">{m.sub}</p>
                  </div>
                </div>
                <div className="mt-3 rounded-lg bg-bg dark:bg-card border border-line p-3 font-mono text-xs text-ink/80">
                  {m.formula}
                </div>
                <p className="text-xs text-label mt-3 leading-relaxed">{m.use}</p>
              </div>
            );
          })}
          <div className="card card-p border-2 border-gold/40 bg-gold/5 dark:bg-gold/10">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-gold text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">=</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Target size={14} className="text-gold" />
                  <h3 className="font-bold text-ink text-sm">Base Rate</h3>
                </div>
                <p className="text-[11px] uppercase tracking-wider text-gold mt-0.5">Master rule</p>
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-gold/10 dark:bg-gold/20 border border-gold/30 p-3 font-mono text-xs text-ink font-semibold">
              MAX(applicable methods)
            </div>
            <p className="text-xs text-label mt-3 leading-relaxed">
              The floor. Never below. Then multipliers apply, then add-on rights uplift, then VAT.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Talent cut policy ───────────────────────────────────────── */}
      <section className="card card-p">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-greenSoft dark:bg-green/15 text-greenDark dark:text-green flex items-center justify-center flex-shrink-0">
            <Coins size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink">Talent cut · Falcons commission</h2>
            <p className="text-sm text-label mt-0.5">What share of the gross deal value goes to the talent vs. retained by Falcons. Per-talent setting; surfaced in every roster row + quote line internal note.</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { range: 'T 70% / F 30%',  label: 'Standard freelance', desc: 'Default for creators + most influencer pros. Talent leads relationship, Falcons handles delivery + invoicing.', tone: 'bg-green/10 border-green/30 text-greenDark dark:text-green' },
            { range: 'T 50% / F 50%',  label: 'Co-managed',          desc: 'Joint commercial development. Falcons brings inbound + delivery; talent brings audience + content.', tone: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700/50 text-blue-700 dark:text-blue-300' },
            { range: 'T 25% / F 75%',  label: 'Salaried pro',        desc: 'Talent is on Falcons payroll. Sponsorship fees on top of salary route mostly to org. ~22% of active roster sits here.', tone: 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700/50 text-orange-700 dark:text-orange-300' },
          ].map(c => (
            <div key={c.label} className={`rounded-xl border p-4 ${c.tone}`}>
              <div className="text-base font-extrabold tabular-nums">{c.range}</div>
              <div className="text-[11px] uppercase tracking-wider mt-1 font-semibold opacity-80">{c.label}</div>
              <p className="text-xs text-ink mt-2 leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-mute leading-relaxed">
          Edit per-talent at <Link href="/roster/players" className="text-greenDark hover:underline">/roster/players</Link> · <Link href="/roster/creators" className="text-greenDark hover:underline">/roster/creators</Link>. Cut is part of the cost-plus floor formula when production-based pricing fires.
        </p>
      </section>

      {/* ─── Talent intake loop ──────────────────────────────────────── */}
      <section className="card card-p">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 flex items-center justify-center flex-shrink-0">
            <MessageCircleQuestion size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink">The Talent Intake loop</h2>
            <p className="text-sm text-label mt-0.5">Each player gets a private link. They submit the minimum SAR they will accept per deliverable. The pricing engine respects it as a hard Floor — sales never quotes below it without coming back to the talent first.</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-3">
          {[
            { num: '1', t: 'Send link', d: 'Sales copies a per-talent /talent/<token> link and sends via WhatsApp / Email. Same link valid forever.' },
            { num: '2', t: 'Talent reviews', d: 'Sees their photo, tier, region, peer-band Min/Median/Max per deliverable, and their Liquipedia achievements (if any).' },
            { num: '3', t: 'Talent submits', d: 'Sets minimum SAR per deliverable. Saved to players.min_rates jsonb + audit-logged.' },
            { num: '4', t: 'Engine respects it', d: 'Floor = MAX(stated_min × 0.95, …). Quote builder warns sales if a line drops below.' },
          ].map(s => (
            <div key={s.num} className="rounded-xl border border-line bg-card p-4">
              <div className="text-xs uppercase tracking-wider font-bold text-greenDark dark:text-green">Step {s.num}</div>
              <div className="text-sm font-bold text-ink mt-1">{s.t}</div>
              <p className="text-xs text-label mt-2 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-mute leading-relaxed">
          Manage at <Link href="/admin/talent-intakes" className="text-greenDark hover:underline">/admin/talent-intakes</Link> — see who&rsquo;s submitted, copy links, view per-deliverable floors in SAR + USD.
        </p>
      </section>

      {/* ─── Confidence ladder / data states ──────────────────────────── */}
      <section className="card card-p">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-navy/10 dark:bg-blue-900/30 text-navy dark:text-blue-300 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink">Data confidence ladder</h2>
            <p className="text-sm text-label mt-0.5">Same formula at every level — only the data quality changes. Each step applies a different ConfidenceCap haircut on the final price.</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-3">
          {[
            { label: 'LOCKED',     ic: Lock,        sub: 'Verified',     cap: '×1.00 cap', desc: 'Shikenso-confirmed followers + engagement + audience demo. All multipliers fully active.', tone: 'border-green/40 bg-greenSoft dark:bg-green/15 text-greenDark dark:text-green' },
            { label: 'TBD',        ic: Hourglass,   sub: 'Manual',       cap: '×1.00 cap', desc: 'Manually-verified FMG numbers, rounded to nearest 100. Premiums active via championship Authority.', tone: 'border-gold/40 bg-gold/5 dark:bg-gold/15 text-gold' },
            { label: 'PENDING',    ic: AlertCircle, sub: 'No data yet',  cap: '×0.75 cap', desc: 'No follower data. Falls back to tier baseline. Engagement / Authority capped to ≤1.2× / ≤1.3×.', tone: 'border-amber-300 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300' },
            { label: 'UNVERIFIED', ic: AlertCircle, sub: 'Block',        cap: 'Block quote', desc: 'Talent flagged as having unverified or contested reach. Quoting blocked until manager confirms.', tone: 'border-red-300 dark:border-red-700/50 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
          ].map(c => {
            const Icon = c.ic;
            return (
              <div key={c.label} className={`rounded-xl border ${c.tone} p-4`}>
                <div className="flex items-center gap-2">
                  <Icon size={14} />
                  <div className="text-xs uppercase tracking-wider font-bold">{c.label}</div>
                </div>
                <div className="text-[11px] uppercase tracking-wider mt-1 font-semibold opacity-80">{c.sub} · {c.cap}</div>
                <div className="text-xs mt-2.5 leading-relaxed text-ink">{c.desc}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Currency policy ──────────────────────────────────────────── */}
      <section className="card card-p">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-green/10 text-greenDark dark:text-green flex items-center justify-center flex-shrink-0">
            <Flag size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink">Currency policy</h2>
            <p className="text-sm text-label mt-0.5">SAR is canonical because all internal cards, methodology numbers, and SOT v1 are SAR. USD is a presentation layer via the Saudi peg.</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="rounded-xl border border-line bg-card p-4">
            <div className="text-[11px] uppercase tracking-wider font-bold text-greenDark dark:text-green">Rate</div>
            <div className="text-2xl font-extrabold text-ink mt-1 tabular-nums">1 USD = 3.75 SAR</div>
            <p className="text-xs text-mute mt-2 leading-relaxed">Saudi peg. Locked. No FX UI.</p>
          </div>
          <div className="rounded-xl border border-line bg-card p-4">
            <div className="text-[11px] uppercase tracking-wider font-bold text-greenDark dark:text-green">Storage</div>
            <div className="text-base font-bold text-ink mt-1">SAR everywhere</div>
            <p className="text-xs text-mute mt-2 leading-relaxed">DB rates, market_bands, min_rates, sales_log — all SAR-canonical. USD computed on render.</p>
          </div>
          <div className="rounded-xl border border-line bg-card p-4">
            <div className="text-[11px] uppercase tracking-wider font-bold text-greenDark dark:text-green">Display</div>
            <div className="text-base font-bold text-ink mt-1">Both currencies, market-aware</div>
            <p className="text-xs text-mute mt-2 leading-relaxed">KSA / MENA → SAR primary, USD secondary. Global → USD primary, SAR secondary.</p>
          </div>
        </div>
      </section>

      {/* ─── Liquipedia + Authority ────────────────────────────────── */}
      <section className="card card-p">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-greenSoft dark:bg-green/15 text-greenDark dark:text-green flex items-center justify-center flex-shrink-0">
            <Trophy size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink">Liquipedia → Authority signal</h2>
            <p className="text-sm text-label mt-0.5">Per-player Liquipedia URL + scraper feeds the Authority Floor. Tournament tier (S/A/B/C), prize money (24-month), and last major placement decay-weighted at 12-month half-life.</p>
          </div>
        </div>
        <div className="mt-5 rounded-xl bg-bg dark:bg-card border border-line p-5 font-mono text-sm leading-relaxed">
          <div className="text-greenDark dark:text-green font-semibold">
            achievement_decay_factor = MIN(1.5, 0.5 + Σ (weight × tier_value) / 10)
          </div>
          <div className="mt-3 text-ink/80 text-xs">
            weight(monthsAgo) = 0.5 ^ (monthsAgo / 12)  · 12-month half-life
          </div>
          <div className="text-ink/80 text-xs mt-1">
            tier_value: S = 1.0 · A = 0.7 · B = 0.4 · C = 0.2
          </div>
        </div>
        <p className="mt-4 text-xs text-mute leading-relaxed">
          Coverage at a glance from <Link href="/roster/players" className="text-greenDark hover:underline">/roster/players</Link> — banner shows who has a URL set, who&rsquo;s synced, who&rsquo;s stale &gt;30d.
        </p>
      </section>

      {/* ─── Sources ───────────────────────────────────────────────── */}
      <section className="card card-p">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-greenSoft dark:bg-green/15 text-greenDark dark:text-green flex items-center justify-center flex-shrink-0">
            <BookOpen size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink">Sources we calibrate against</h2>
            <p className="text-sm text-label mt-0.5">Defensible to clients, leadership, and internal review.</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          {[
            ['FaZe Clan / Cloud9 / 100 Thieves rate cards', 'Tier 1 IG Reel + IRL benchmarks (NA)'],
            ['T1 / G2 / NRG rate cards',                    'Tier 1 cross-region positioning'],
            ['Karmine Corp rate card (EU)',                 'European Tier 1 calibration'],
            ['Newzoo Global Esports & Live Streaming 2025', 'Org benchmarks + MENA market data'],
            ['Shikenso Esports Sponsorship ROI Guide 2025', 'Sponsorship values + multiplier benchmarks'],
            ['Nielsen Esports Audience Report 2025',        'CPM benchmarks + brand recall'],
            ['Influencity Rate Card Benchmarks 2026',       'Platform ratios + multiplier standards'],
            ['StreamElements State of Streaming 2025',      'Twitch / Kick rate benchmarks'],
            ['Internal Falcons commercial data 2025–26',    'Negotiated cards + closed-deal history'],
          ].map(([source, used]) => (
            <div key={source} className="rounded-lg border border-line bg-bg dark:bg-card p-3">
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
            <p className="text-sm text-label mt-0.5">Today we sit at the low-end of US Tier 1. As 3-time EWC champions and the largest org in MENA, the defensible mid-pack target is between Cloud9 and 100 Thieves territory.</p>
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
                ['T1 Esports',  'Global', '$15K–50K+',     '$3K–8K'],
                ['FaZe Clan',   'NA',     '$12K–30K',      '$2.5K–6K'],
                ['Cloud9',      'NA',     '$8K–20K',       '$2K–5K'],
                ['100 Thieves', 'NA',     '$10K–25K',      '$2.5K–6K'],
                ['NRG',         'NA',     '$6K–15K',       '$1.5K–4K'],
                ['Karmine Corp','EU',     '€5K–15K',       '€1.5K–4K'],
              ].map(([o, r, t1, t2]) => (
                <tr key={o} className="border-b border-line">
                  <td className="py-2 pr-4 font-medium">{o}</td>
                  <td className="py-2 pr-4 text-label">{r}</td>
                  <td className="py-2 pr-4">{t1}</td>
                  <td className="py-2 pr-4">{t2}</td>
                </tr>
              ))}
              <tr className="bg-greenSoft/40 dark:bg-green/15">
                <td className="py-2.5 pr-4 font-bold text-greenDark dark:text-green">Team Falcons (today)</td>
                <td className="py-2.5 pr-4 text-greenDark dark:text-green font-medium">MENA</td>
                <td className="py-2.5 pr-4 font-bold text-greenDark dark:text-green tabular-nums">$4.8K (SAR 18,000)</td>
                <td className="py-2.5 pr-4 font-bold text-greenDark dark:text-green tabular-nums">$2.9K (SAR 11,000)</td>
              </tr>
              <tr className="bg-gold/5 dark:bg-gold/15">
                <td className="py-2.5 pr-4 font-bold text-gold">Team Falcons (target 2027)</td>
                <td className="py-2.5 pr-4 text-gold font-medium">MENA</td>
                <td className="py-2.5 pr-4 font-bold text-gold tabular-nums">$10–12K (SAR 38–45K)</td>
                <td className="py-2.5 pr-4 font-bold text-gold tabular-nums">$4.8–6.7K (SAR 18–25K)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── Quick links ──────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/quote/new" className="card card-p hover:shadow-lift transition group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green text-white flex items-center justify-center"><FileText size={20} /></div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-ink group-hover:text-greenDark transition">Build a quote</div>
              <div className="text-xs text-label">Apply the methodology now</div>
            </div>
            <ArrowRight size={16} className="text-mute group-hover:text-greenDark transition" />
          </div>
        </Link>
        <Link href="/admin/market-bands" className="card card-p hover:shadow-lift transition group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gold text-white flex items-center justify-center"><Database size={20} /></div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-ink group-hover:text-gold transition">Market bands</div>
              <div className="text-xs text-label">F/A/S/C cells per market × tier × platform</div>
            </div>
            <ArrowRight size={16} className="text-mute group-hover:text-gold transition" />
          </div>
        </Link>
        <Link href="/admin/talent-intakes" className="card card-p hover:shadow-lift transition group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-navy text-white flex items-center justify-center"><ListChecks size={20} /></div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-ink group-hover:text-navy transition">Talent intakes</div>
              <div className="text-xs text-label">Floors submitted by talent</div>
            </div>
            <ArrowRight size={16} className="text-mute group-hover:text-navy transition" />
          </div>
        </Link>
        <Link href="/roadmap" className="card card-p hover:shadow-lift transition group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center"><Compass size={20} /></div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-ink group-hover:text-blue-700 dark:group-hover:text-blue-300 transition">Roadmap</div>
              <div className="text-xs text-label">Where we&rsquo;re going next</div>
            </div>
            <ArrowRight size={16} className="text-mute group-hover:text-blue-700 dark:group-hover:text-blue-300 transition" />
          </div>
        </Link>
      </section>

      {/* ─── Footer note ──────────────────────────────────────────────── */}
      <p className="text-xs text-mute text-center leading-relaxed px-4">
        Methodology v2.0 · SOT v1 calibration April 2026 · SAR canonical (1 USD = 3.75 SAR · Saudi peg) · Confidential — Internal Use Only
      </p>
    </div>
  );
}
