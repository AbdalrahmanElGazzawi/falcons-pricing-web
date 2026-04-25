'use client';
import {
  TrendingUp, Users, Calendar, FileText, Languages, Award, Target, Eye,
  Layers, Zap, Heart, Globe, Crown, AlertCircle, Check, Lightbulb, Calculator,
} from 'lucide-react';

/**
 * PricingReference — the canonical, in-app explanation of how the 9-axis
 * matrix works, why each multiplier exists, and the world-best-practice
 * context behind every number.
 *
 * Read-only for v1. The actual factors live in src/lib/pricing.ts and the
 * wizard's MATRIX constant; this component is the human-readable companion.
 */
export function PricingReference() {
  return (
    <div className="space-y-6">
      <ConsolePointerBanner />
      <FormulaCard />
      <ModelComparisonCard />
      <CreatorRightsCard />
      <CreatorAxesCard />
      <BestPracticeCard />
      <AxisCard
        icon={TrendingUp}
        accent="green"
        title="Engagement"
        rationale="The single best predictor of campaign ROI. 100K followers with 10% engagement outperforms 1M with 2% — and brands know it. We multiply on engagement quality, not raw reach, so a Tier-2 player with elite engagement can out-price a Tier-1 with vanity numbers."
        when="Use the band that matches the talent's last 90-day engagement rate (likes + comments / followers, weighted by reach)."
        rows={[
          ['<2%',   0.70, 'Below baseline — discount applied. Audience is largely passive.'],
          ['2–4%',  0.90, 'Below industry baseline (gaming creators average ~3%).'],
          ['4–6%',  1.00, 'Baseline — most active esports talent sits here.'],
          ['6–8%',  1.20, 'Above average — premium engagement, command +20%.'],
          ['8–10%', 1.40, 'Elite engagement — typical of top MENA pros and high-ER influencers.'],
          ['>10%',  1.60, 'World-class. Almost always Tier-S anchors or breakout micros.'],
        ]}
        worldNote="Brands chasing conversion (not just awareness) will pay 30–60% more for engagement above 6% — engagement is the closest proxy for purchase intent in social campaigns."
      />

      <AxisCard
        icon={Users}
        accent="blue"
        title="Audience Quality"
        rationale="Not all followers are worth the same. A core-gaming audience converts on a gaming brand at 5–8× the rate of a generic lifestyle audience. MENA/Saudi audience commands a separate premium because of high purchasing power and brand affinity in a market where esports is mainstream."
        when="Pick the bucket that best describes the talent's primary audience composition (verified via Shikenso or platform analytics)."
        rows={[
          ['Generic',              0.85, 'Lifestyle / general audience — gaming is incidental.'],
          ['Gaming-adjacent',      1.00, 'Aware of gaming culture but not core gamers.'],
          ['Core Gaming',          1.20, 'Active gamers — high conversion for gaming brands.'],
          ['MENA / Saudi',         1.30, '+30% reflects regional purchasing power and esports premium positioning in MENA.'],
          ['Esports-focused',      1.40, 'Tournament viewers, league fans — highest convertibility for esports endemic brands.'],
          ['Global Esports Elite', 1.50, 'Worlds/Major audience — peak commercial leverage.'],
        ]}
        worldNote="The 1.30× MENA Premium is non-negotiable: Saudi/GCC gaming spend per capita is among the highest globally and brands competing for that wallet pay accordingly. Always highlight this in pitches."
      />

      <AxisCard
        icon={Calendar}
        accent="amber"
        title="Seasonality"
        rationale="Talent attention is finite — campaigns running during peak content cycles (Ramadan, Worlds, Game Launch) deliver outsized impact and require premium pricing to reflect opportunity cost. Off-season is discounted because supply > demand."
        when="Pick the window the campaign runs in. If it spans multiple windows, use the one with the highest impact week."
        rows={[
          ['Off-season',       0.80, 'Lower viewership / supply outweighs demand.'],
          ['Regular',          1.00, 'Baseline — standard season schedule.'],
          ['Holiday / Q4',     1.20, 'Year-end consumer peak; budgets unlock.'],
          ['Regional Major',   1.25, 'Regional championship cycle — concentrated viewership.'],
          ['Game launch',      1.30, 'New title release — scarce content slots, high CPMs.'],
          ['Ramadan MENA',     1.35, '3× content consumption in MENA. The highest single-region uplift.'],
          ['Global / Worlds',  1.40, 'Worlds / Esports World Cup — global eyeballs.'],
          ['Exec / Mega Peak', 1.50, 'Once-a-year executional moments. Reserve for confirmed scarcity.'],
        ]}
        worldNote="Ramadan's 1.35× is conservative — for Tier-1 talent during MENA-targeted campaigns we've seen up to 1.45× hold. Don't discount this multiplier; it's the single biggest regional lever."
      />

      <AxisCard
        icon={FileText}
        accent="navy"
        title="Content Type"
        rationale="The further you push the talent away from their organic voice, the more you compensate them for. Brand-scripted content travels less and risks audience pushback, so we charge a premium for scripted/sponsored placements."
        when="Decide jointly with the talent based on the level of brand control. Lock this BEFORE you brief — re-classifying mid-flight burns trust."
        rows={[
          ['Organic',    0.85, 'Talent decides everything; brand provides product only. Best engagement, best long-term equity.'],
          ['Integrated', 1.00, 'Baseline — talent narrates with brand alignment but in their voice.'],
          ['Sponsored',  1.15, 'Client script / approved talking points. Highest brand control, lowest organic reach.'],
        ]}
        worldNote="Talents will quietly under-deliver on heavily-scripted Sponsored campaigns. If you want true performance, structure as Integrated (1.00×) and pay for an Add-on Rights package — better outcome for both sides."
      />

      <AxisCard
        icon={Languages}
        accent="green"
        title="Language"
        rationale="Bilingual content carries a small premium because it reaches both Arabic-speaking and English-speaking gaming audiences in the same activation. Arabic-only content unlocks deep MENA cultural resonance."
        when="Pick the language the talent will deliver in. Bilingual = both Arabic and English in the same piece (caption + voiceover, or two-cut)."
        rows={[
          ['English',   1.00, 'Baseline — global default.'],
          ['Arabic',    1.05, 'Cultural resonance for MENA campaigns; +5% reflects scarcer supply of native-Arabic gaming talent.'],
          ['Bilingual', 1.15, 'Reaches both audiences in one activation — highest leverage for regional brand launches.'],
        ]}
        worldNote="When stacking multipliers, Arabic Bilingual + Ramadan + MENA can push base rates 1.93× before any engagement bonus. Always price the stack first, then negotiate from total."
      />

      <AxisCard
        icon={Award}
        accent="amber"
        title="Authority"
        rationale="A brand isn't just buying reach — it's buying credibility. A world champion saying 'I use this gear' converts orders of magnitude better than a comparable creator without that authority. We multiply this in proportion to the campaign objective (see Objective Weight)."
        when="Apply when the campaign explicitly leans on the talent's competitive credentials (gear endorsements, training tips, performance products)."
        rows={[
          ['Normal',          1.00, 'Authority is not the campaign hook.'],
          ['Proven',          1.15, 'Established competitive record — regional finalists, multi-season pros.'],
          ['Elite Contender', 1.30, 'Top-3 globally in their game or vertical.'],
          ['Global Star',     1.50, 'World champions / mainstream cross-over names. Authority is the entire pitch.'],
        ]}
        worldNote="Authority shouldn't multiply twice. If you're already paying Tier-S base rates, dial Authority down — the Tier itself reflects the championship pedigree."
      />

      <AxisCard
        icon={Target}
        accent="blue"
        title="Objective Weight"
        rationale="Determines how much the Authority multiplier actually applies. An awareness campaign barely needs the championship halo (weight 0.2); a conversion-focused product endorsement needs every drop of credibility (weight 0.7); an authority play (think Cellium endorsing a gaming chair) goes all-in (1.0)."
        when="Pick the dominant campaign objective. Auth multiplier = 1 + ObjectiveWeight × (Authority − 1)."
        rows={[
          ['Awareness',     0.2, 'Awareness — reach is the primary KPI; authority is bonus, not core.'],
          ['Consideration', 0.5, 'Consideration — audience is being educated; mid-weighted.'],
          ['Conversion',    0.7, 'Direct response / e-commerce — credibility pulls the trigger.'],
          ['Authority',     1.0, 'The talent IS the product story. Authority applies in full.'],
        ]}
        worldNote="If you're not sure, default to Consideration (0.5). It's the modal campaign type and avoids over-pricing on either end."
      />

      <AxisCard
        icon={Eye}
        accent="amber"
        title="Measurement Confidence"
        rationale="If we don't have verified follower/engagement data, we discount the price — and gate certain multipliers. This protects us from over-promising on unverified talent and gives the brand a clear paid signal of data quality."
        when="Auto-set per talent in /admin/players. Promotes upward as Shikenso data is connected and verified."
        rows={[
          ['Pending',   0.75, 'No follower data. Discount applied + Engagement, Authority, Seasonality capped at modest values.'],
          ['Estimated', 0.90, 'Partial data (e.g. one platform verified). Engagement/Authority/Seasonality capped (1.2×, 1.3×, 1.25×).'],
          ['Rounded',   1.00, 'Manually verified by an analyst. Full multipliers apply.'],
          ['Exact',     1.00, 'Shikenso-verified. Full multipliers apply, no caps.'],
        ]}
        worldNote="The cap rules exist so a Pending-data talent can't be priced as if they were fully verified. Pushing a player from Pending → Estimated typically nets a 20% rate uplift on its own."
      />

      <AddonsCard />
      <TierLadderCard />
      <NegotiationGuardrails />
    </div>
  );
}


function ConsolePointerBanner() {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 flex items-start gap-3">
      <Lightbulb size={16} className="shrink-0 mt-0.5" />
      <div className="min-w-0">
        <strong className="font-semibold">Reference — read-only.</strong>{' '}
        The canonical source for these multipliers, best practices, and roadmap entries is the <a href="/admin/pricing" className="underline hover:text-blue-900">Pricing OS console</a>. Super admin edits there. Live sync into this tab is on the roadmap.
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Sections
// ───────────────────────────────────────────────────────────────────────────
function FormulaCard() {
  return (
    <div className="card card-p">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-navy text-white grid place-items-center"><Calculator size={18} /></div>
        <div>
          <div className="text-base font-semibold text-ink leading-tight">How a line is priced</div>
          <div className="text-xs text-mute">The 9-axis matrix engine, in three formulas.</div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <Formula label="Final unit price" expr="MAX(SocialPrice, AuthorityFloor) × ConfidenceCap × (1 + RightsPct)" />
        <Formula label="Social price" expr="BaseFee × Eng × Aud × Seas × CType × Lang × AuthFactor" />
        <Formula label="Authority floor" expr="IRL × FloorShare × Seas × Lang × AuthFactor" />
      </div>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-label">
        <div className="rounded-lg border border-line p-3">
          <div className="font-medium text-ink mb-1">Why MAX of two prices?</div>
          The Authority Floor protects against under-pricing championship-credentialed talent on low-volume platforms (e.g. Twitch with limited followers but elite live engagement).
        </div>
        <div className="rounded-lg border border-line p-3">
          <div className="font-medium text-ink mb-1">Why ConfidenceCap?</div>
          A pricing engine without a measurement quality gate will over-promise. The cap (0.75 / 0.90 / 1.00) keeps us defensible when audited by a brand's data team.
        </div>
      </div>
    </div>
  );
}

function Formula({ label, expr }: { label: string; expr: string }) {
  return (
    <div className="rounded-lg border border-line bg-bg p-3">
      <div className="text-[10px] uppercase tracking-widest text-label font-semibold mb-1.5">{label}</div>
      <code className="text-xs font-mono text-ink leading-relaxed block whitespace-pre-wrap break-words">{expr}</code>
    </div>
  );
}

function BestPracticeCard() {
  const items: Array<{ icon: any; title: string; body: string; tone: 'green' | 'amber' | 'navy' }> = [
    {
      icon: Heart,
      tone: 'green',
      title: 'Engagement quality > follower count',
      body: '100K followers at 10% ER outperforms 1M at 2% on every business metric — clicks, conversions, brand recall. Always present engagement alongside reach in pitches.',
    },
    {
      icon: Globe,
      tone: 'green',
      title: 'MENA / Saudi audience = 20–35% premium',
      body: 'Highest gaming-spend per capita in MENA, peak brand competition for share-of-wallet, and a market where esports is mainstream. Brands targeting this audience expect to pay for it.',
    },
    {
      icon: Calendar,
      tone: 'amber',
      title: 'Ramadan = 3× content consumption',
      body: 'Single biggest regional content moment. The 1.35× multiplier is conservative — Tier-1 talent during MENA-targeted Ramadan campaigns can support 1.45×.',
    },
    {
      icon: Zap,
      tone: 'amber',
      title: 'Micro-influencers (Tier 3) deliver 300–600% ROI',
      body: 'The highest in the industry by some distance. Lead with this data when brands push back on Tier-3 pricing. Smaller follower count, far better engagement and conversion.',
    },
    {
      icon: Layers,
      tone: 'navy',
      title: 'Long-term partnerships convert 3–5× one-offs',
      body: 'Always propose a 3–6 month retainer first. Audiences need to see talent → brand association repeated to internalize it.',
    },
    {
      icon: Crown,
      tone: 'navy',
      title: 'Bundle deals (3+ talent) = +15–20% premium',
      body: 'Multi-talent packages are scarcer and harder to coordinate, and they command premium because of the magnified network effect. Always propose bundles for multi-player campaigns.',
    },
    {
      icon: Lightbulb,
      tone: 'green',
      title: 'Add-on rights add 15–200%',
      body: 'Whitelisting, paid usage, exclusivity all scale on the base rate. Never leave rights on the table — present add-ons as the default, then negotiate down.',
    },
    {
      icon: AlertCircle,
      tone: 'amber',
      title: 'If a brand wants more rights, push to add-ons',
      body: 'Never discount the base fee for additional rights. Discounting devalues every future deal. Always use the add-on uplift mechanism instead.',
    },
    {
      icon: FileText,
      tone: 'navy',
      title: 'Always define term + territory + platforms',
      body: 'Avoid "in perpetuity" unless explicitly priced as exclusive (320% uplift). Clarity here is the difference between a clean 30-day campaign and an indefinite licensing dispute.',
    },
    {
      icon: Check,
      tone: 'green',
      title: 'Whitelist Fee = flat 2,400 SAR per activation',
      body: 'Regardless of tier. Always add to paid-media campaigns. This is non-negotiable boilerplate that brands universally accept once explained.',
    },
    {
      icon: Users,
      tone: 'navy',
      title: 'Non-player staff price at IRL appearance only',
      body: 'Coaches, managers, analysts — content rates do not apply. They’re hired for credibility and presence at brand activations, not for posting.',
    },
    {
      icon: Target,
      tone: 'green',
      title: 'If budget is fixed, cut rights or term, not deliverables',
      body: 'Deliverables are the product the brand actually buys. Protect them at all costs. Reduce term length, narrow territory, or remove paid usage instead.',
    },
  ];
  return (
    <div className="card card-p">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-green/10 text-greenDark grid place-items-center"><Lightbulb size={18} /></div>
        <div>
          <div className="text-base font-semibold text-ink leading-tight">World best practice — what brands actually pay for</div>
          <div className="text-xs text-mute">Negotiation playbook drawn from the v1.5 methodology + industry benchmarks.</div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((it, i) => {
          const Icon = it.icon;
          const tone =
            it.tone === 'green' ? 'border-green/30 bg-greenSoft/40 text-greenDark' :
            it.tone === 'amber' ? 'border-amber/30 bg-amber/5 text-amber' :
                                  'border-navy/20 bg-navy/[0.03] text-navy';
          return (
            <div key={i} className="rounded-lg border border-line bg-white p-4">
              <div className="flex items-start gap-2.5">
                <div className={`shrink-0 w-7 h-7 rounded-md grid place-items-center border ${tone}`}>
                  <Icon size={14} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-ink mb-1">{it.title}</div>
                  <div className="text-xs text-label leading-relaxed">{it.body}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AxisCard({ icon: Icon, accent, title, rationale, when, rows, worldNote }: {
  icon: any;
  accent: 'green' | 'blue' | 'amber' | 'navy';
  title: string;
  rationale: string;
  when: string;
  rows: Array<[string, number, string]>;
  worldNote: string;
}) {
  const accentClass =
    accent === 'green' ? 'bg-green/10 text-greenDark' :
    accent === 'blue'  ? 'bg-blue-100 text-blue-700' :
    accent === 'amber' ? 'bg-amber/15 text-amber' :
                         'bg-navy/10 text-navy';
  return (
    <div className="card card-p">
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg grid place-items-center ${accentClass}`}><Icon size={18} /></div>
        <div className="flex-1">
          <div className="text-base font-semibold text-ink leading-tight">{title}</div>
          <div className="text-sm text-label mt-1">{rationale}</div>
        </div>
      </div>

      <div className="text-xs text-label mb-3">
        <strong className="text-ink">When to use:</strong> {when}
      </div>

      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] text-label uppercase tracking-wider bg-bg">
              <th className="px-3 py-2 w-44">Option</th>
              <th className="px-3 py-2 w-20 text-right">Multiplier</th>
              <th className="px-3 py-2">Rationale</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, val, why]) => (
              <tr key={label} className="border-t border-line">
                <td className="px-3 py-2 font-medium text-ink whitespace-nowrap">{label}</td>
                <td className="px-3 py-2 text-right font-mono text-greenDark">{val.toFixed(2)}×</td>
                <td className="px-3 py-2 text-label text-xs">{why}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 rounded-lg border border-green/30 bg-greenSoft px-3 py-2.5 text-xs text-greenDark">
        <strong className="font-semibold">Field note:</strong> {worldNote}
      </div>
    </div>
  );
}


// ───────────────────────────────────────────────────────────────────────────
// Creator vs Player pricing — key differences
// ───────────────────────────────────────────────────────────────────────────
function ModelComparisonCard() {
  return (
    <div className="card card-p">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 grid place-items-center"><Layers size={18} /></div>
        <div>
          <div className="text-base font-semibold text-ink leading-tight">Players vs Creators — two different pricing models</div>
          <div className="text-xs text-mute">Both share the matrix concept, but the commercial framing differs. Use the right model for the right roster.</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] text-label uppercase tracking-wider bg-bg">
              <th className="px-3 py-2 w-44">Concept</th>
              <th className="px-3 py-2">Players (esports)</th>
              <th className="px-3 py-2">Creators (content / influencers)</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Pricing anchor',     'BASE rate per platform on the player profile. Multipliers add to it.', 'CEILING rate per deliverable on the creator profile. The ceiling is the cap.'],
              ['Opening offer',      'Final unit price = base × multipliers (no opening discount).',         'Opening factor 0.70–0.85 of ceiling so the ask has room to be negotiated up.'],
              ['Authority floor',    'IRL × FloorShare protects against under-pricing championship credentials.', 'No floor concept — ceiling already encodes scarcity / authority.'],
              ['Audience axis',      'Audience QUALITY (generic → core gaming → MENA → elite).',             'Audience FIT (content vertical: sports / comedy / anime / KSA mass / etc.).'],
              ['Bundle economics',   '+15–20% PREMIUM for 3+ talent — coordination effect.',                  '–5 to –15% DISCOUNT for 3+ creators — package volume incentive.'],
              ['Production axis',    'Implicit in Content Type (Organic / Integrated / Sponsored).',         'Explicit Production axis: Organic / Scripted / On-ground shoot — affects margin.'],
              ['Rights packaging',   'One uplift % per add-on (cumulative across selected).',                 'Time-bounded packages (Organic 90d / 180d, Paid 30d / 90d / 180d, Whitelisting).'],
              ['Tiering',            'Tier S → 4 by reach + engagement, applied to base fees.',              'Tier 1 → 4 by Weighted Score, applied to ceilings.'],
            ].map(([concept, player, creator]) => (
              <tr key={concept} className="border-t border-line">
                <td className="px-3 py-2 font-medium text-ink">{concept}</td>
                <td className="px-3 py-2 text-label text-xs leading-relaxed">{player}</td>
                <td className="px-3 py-2 text-label text-xs leading-relaxed">{creator}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-700">
        <strong className="font-semibold">Field note:</strong> the Pricing Engine (\`src/lib/pricing.ts\`) implements the Player model today. The Creator model — ceiling × opening factor × adj-mult — lives in the v3 Creator workbook and will be modelled separately when we move creators into the live builder. Treat creator quotes as a manual overlay until then.
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Creator-specific axes
// ───────────────────────────────────────────────────────────────────────────
function CreatorAxesCard() {
  return (
    <div className="card card-p">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 grid place-items-center"><Target size={18} /></div>
        <div>
          <div className="text-base font-semibold text-ink leading-tight">Creator-specific axes</div>
          <div className="text-xs text-mute">These are unique to the Creator engine and don't exist on the Player side.</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-lg border border-line p-4">
          <div className="text-sm font-semibold text-ink mb-1">Audience Fit (content vertical)</div>
          <div className="text-xs text-label leading-relaxed mb-3">
            Replaces Audience Quality. Brands buy creators for their content vertical
            and audience composition, not raw fit-for-gaming. Pick the lens that
            most accurately describes the creator's primary content cluster.
          </div>
          <div className="space-y-1 text-xs">
            {[
              ['Broad Generic',                 'No clear vertical. Use rarely.'],
              ['Gaming-aware',                  'Casual gaming reference, not core.'],
              ['Core Gaming',                   'Core gaming audience — closest to esports overlap.'],
              ['Esports-native / Premium fit',  'Esports tournaments, pro-audience.'],
              ['Sports / Football / Active',    'Real-world sports + lifestyle.'],
              ['Youth Entertainment / Variety', 'Variety, group, mass entertainment.'],
              ['Comedy / Meme Culture',         'Comedy, podcast, internet humour.'],
              ['Anime / Geek / Fandom',         'Anime, manga, geek culture.'],
              ['Family / Household / Mainstream', 'Family-safe, household-friendly, FMCG.'],
              ['KSA / Saudi Mass',              'Mainstream Saudi household reach.'],
              ['MENA Arabic',                   'MENA-wide Arabic content.'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-start gap-2 border-t border-line/50 pt-1.5">
                <span className="text-ink font-medium min-w-[180px]">{k}</span>
                <span className="text-mute">{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-line p-4">
          <div className="text-sm font-semibold text-ink mb-1">Production type</div>
          <div className="text-xs text-label leading-relaxed mb-3">
            New axis specific to creators. Captures how much production lift the
            creator carries vs how much the brand expects to be served. Compounds
            with Content Type — scripted + on-ground shoots warrant the highest
            multipliers.
          </div>
          <div className="space-y-1 text-xs">
            {[
              ['Organic / talent-led',           '0.95×', 'Talent decides production, low overhead, baseline.'],
              ['Standard',                       '1.00×', 'Brand brief, talent executes.'],
              ['Scripted / extra revisions',     '1.20×', 'Multiple drafts, brand-approved script. Higher coordination cost.'],
              ['On-ground / special shoot',      '1.40×', 'Travel, on-location shoot, extra crew. Premium production lift.'],
            ].map(([k, mult, v]) => (
              <div key={k} className="flex items-start gap-2 border-t border-line/50 pt-1.5">
                <span className="text-ink font-medium min-w-[180px]">{k}</span>
                <span className="font-mono text-greenDark min-w-[44px]">{mult}</span>
                <span className="text-mute">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="rounded-lg border border-line p-3">
          <div className="font-medium text-ink mb-1">Authority (creator framing)</div>
          <div className="text-label">
            Standard · Trusted niche leader · Premium conversion driver · Category-defining hero. Same formula shape as players, different vocabulary that brand-side buyers use.
          </div>
        </div>
        <div className="rounded-lg border border-line p-3">
          <div className="font-medium text-ink mb-1">Timing (creator framing)</div>
          <div className="text-label">
            Always-on / Off-peak · Regular · Product launch · Ramadan / Eid / BTS · Travel / Tourism · Major tournament / EWC peak. Creator timings are commerce-driven, not tournament-driven.
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Creator rights & add-ons (time-bounded)
// ───────────────────────────────────────────────────────────────────────────
function CreatorRightsCard() {
  const bundles: Array<[string, string, string]> = [
    ['None',                    '+0%',   'Default organic use only. Creator retains everything.'],
    ['Organic repost 90d',      '+10%',  'Brand may re-share on owned channels for 90 days.'],
    ['Organic repost 180d',     '+20%',  'Same, six-month window.'],
    ['Paid usage 30d',          '+25%',  'Paid media on creator content for 30 days.'],
    ['Paid usage 90d',          '+60%',  '90-day paid window — most common.'],
    ['Paid usage 180d',         '+100%', '180-day paid window — top of paid bundle.'],
    ['Whitelisting 30d',        '+35%',  'Brand runs paid ads from creator handle for 30 days.'],
    ['Whitelisting 90d',        '+85%',  '90-day whitelisting — high-impact.'],
  ];
  const addons: Array<[string, string, string]> = [
    ['Exclusivity 30d',  '+15%', 'Category lockout — short window.'],
    ['Exclusivity 90d',  '+35%', 'Category lockout — quarterly.'],
    ['Exclusivity 180d', '+60%', 'Category lockout — half-year.'],
    ['Rush 72h',         '+10%', 'Schedule compression to 72h.'],
    ['Rush 48h',         '+20%', 'Schedule compression to 48h.'],
    ['Rush 24h',         '+35%', 'Schedule compression to 24h — tight.'],
    ['Raw footage',      '+15%', 'Brand receives raw shoot files for re-cut.'],
  ];
  return (
    <div className="card card-p">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-green/10 text-greenDark grid place-items-center"><Crown size={18} /></div>
        <div>
          <div className="text-base font-semibold text-ink leading-tight">Creator rights & add-ons</div>
          <div className="text-xs text-label mt-1">Time-bounded packages (30d / 90d / 180d) instead of single-uplift bundles. Pick exactly one Bundle and any Add-ons; uplifts compound.</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-label font-semibold mb-2">Rights bundle</div>
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-label uppercase tracking-wider bg-bg">
                  <th className="px-3 py-2">Bundle</th>
                  <th className="px-3 py-2 text-right w-20">Uplift</th>
                  <th className="px-3 py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {bundles.map(([n, u, d]) => (
                  <tr key={n} className="border-t border-line">
                    <td className="px-3 py-2 font-medium text-ink">{n}</td>
                    <td className="px-3 py-2 text-right font-mono text-greenDark">{u}</td>
                    <td className="px-3 py-2 text-label text-xs">{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-widest text-label font-semibold mb-2">Extra add-on</div>
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-label uppercase tracking-wider bg-bg">
                  <th className="px-3 py-2">Add-on</th>
                  <th className="px-3 py-2 text-right w-20">Uplift</th>
                  <th className="px-3 py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {addons.map(([n, u, d]) => (
                  <tr key={n} className="border-t border-line">
                    <td className="px-3 py-2 font-medium text-ink">{n}</td>
                    <td className="px-3 py-2 text-right font-mono text-greenDark">{u}</td>
                    <td className="px-3 py-2 text-label text-xs">{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-amber/30 bg-amber/5 px-3 py-2.5 text-xs text-amber">
        <strong className="font-semibold">Approval flag:</strong> the v3 Creator workbook flags any quote where the rate breaches the ceiling, and any opening below 70% of ceiling. Mirror this gate when we wire the creator engine into the live builder.
      </div>
    </div>
  );
}

function AddonsCard() {
  const items: Array<[string, string, string]> = [
    ['None',       '0%',    'Base rate only. Talent retains all secondary rights.'],
    ['Basic',      '+15%',  'Organic repost, 1 month, single platform. Lowest-friction add-on; brands accept readily.'],
    ['Standard',   '+60%',  'Organic repost (3 months) + paid usage (limited). Most common SKU.'],
    ['Premium',    '+115%', 'Organic repost (6 months) + paid usage (standard) + MENA territory.'],
    ['Full',       '+170%', 'All organic + paid max + 30-day whitelisting. For lead-campaign hero deliverables.'],
    ['Exclusive',  '+320%', 'Full + category exclusivity (12 months). Locks talent out of competitor work.'],
  ];
  return (
    <div className="card card-p">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-green/10 text-greenDark grid place-items-center"><Crown size={18} /></div>
        <div>
          <div className="text-base font-semibold text-ink leading-tight">Add-on rights packages</div>
          <div className="text-xs text-label mt-1">Cumulative uplift on top of the line subtotal. Always propose a package — never leave rights unpriced.</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] text-label uppercase tracking-wider bg-bg">
              <th className="px-3 py-2 w-40">Package</th>
              <th className="px-3 py-2 w-24 text-right">Uplift</th>
              <th className="px-3 py-2">What's included</th>
            </tr>
          </thead>
          <tbody>
            {items.map(([name, pct, desc]) => (
              <tr key={name} className="border-t border-line">
                <td className="px-3 py-2 font-medium text-ink">{name}</td>
                <td className="px-3 py-2 text-right font-mono text-greenDark">{pct}</td>
                <td className="px-3 py-2 text-label text-xs">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 rounded-lg border border-amber/30 bg-amber/5 px-3 py-2.5 text-xs text-amber">
        <strong className="font-semibold">Whitelist fee:</strong> add a flat <strong>SAR 2,400 per activation</strong> for any campaign that runs paid media — regardless of tier or package.
      </div>
    </div>
  );
}

function TierLadderCard() {
  const tiers: Array<[string, string, string, string]> = [
    ['Tier S', 'Superstar',     '1M+ followers · Global icon · World-class anchor',  'Reserved for Tier-S brands and hero campaigns. Authority dominates the conversation.'],
    ['Tier 1', 'Premium',       '250K–1M · 8%+ engagement · Established',            'Most flagship campaigns sit here. Sweet spot of reach and engagement.'],
    ['Tier 2', 'Target',        '50K–250K · 5–8% engagement · Core pros',             'Best ROI band — pro players with engaged audiences. Often the right answer.'],
    ['Tier 3', 'Emerging',      '10K–50K · High engagement · Rising stars',           '300–600% ROI — the highest in industry. Bundle 3–4 of these for outsized impact.'],
    ['Tier 4', 'Entry / Staff', 'Support roles · Appearance rates',                   'Coaches, managers, analysts. Priced at IRL appearance fees — no content rates.'],
  ];
  return (
    <div className="card card-p">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-gold/15 text-gold grid place-items-center"><Crown size={18} /></div>
        <div>
          <div className="text-base font-semibold text-ink leading-tight">Tier ladder</div>
          <div className="text-xs text-label mt-1">Roster classification. Talent move tiers based on sustained reach + engagement, not single-quarter spikes.</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] text-label uppercase tracking-wider bg-bg">
              <th className="px-3 py-2 w-20">Code</th>
              <th className="px-3 py-2 w-32">Label</th>
              <th className="px-3 py-2 w-72">Threshold</th>
              <th className="px-3 py-2">Best use</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map(([code, label, threshold, use]) => (
              <tr key={code} className="border-t border-line">
                <td className="px-3 py-2 font-medium text-ink whitespace-nowrap">{code}</td>
                <td className="px-3 py-2 text-ink">{label}</td>
                <td className="px-3 py-2 text-label text-xs">{threshold}</td>
                <td className="px-3 py-2 text-label text-xs">{use}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NegotiationGuardrails() {
  return (
    <div className="card card-p">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-red-50 text-red-700 grid place-items-center"><AlertCircle size={18} /></div>
        <div>
          <div className="text-base font-semibold text-ink leading-tight">Negotiation guardrails</div>
          <div className="text-xs text-label mt-1">Hard floors below which we don't go — and what to push to instead.</div>
        </div>
      </div>
      <ul className="space-y-2.5 text-sm">
        <Guard
          rule="Never discount more than 15% on Tier-1 base fees"
          rationale="Discounting the base devalues every future deal with that talent. Cut term, territory, or rights instead."
        />
        <Guard
          rule="Bundle floor = 3 talents minimum"
          rationale="Below 3 the coordination overhead exceeds the bundle premium economics. For 1–2 talents, price individually."
        />
        <Guard
          rule="Sponsored content max 30% of any single talent's annual deliverables"
          rationale="Beyond this the audience perceives the talent as a paid-mouthpiece and engagement collapses. Protect the asset."
        />
        <Guard
          rule="Exclusivity period max 12 months — and always priced at +320%"
          rationale="In-perpetuity exclusivity is never the right deal. If a brand wants 'forever', they're really asking for renewable annual exclusivity."
        />
        <Guard
          rule="Below Tier-2, lead with bundles not solos"
          rationale="A single Tier-3 talent rarely justifies a brand's overhead. Three Tier-3 talents in a campaign do, and they out-perform a single Tier-1 on engagement-weighted ROI."
        />
      </ul>
    </div>
  );
}

function Guard({ rule, rationale }: { rule: string; rationale: string }) {
  return (
    <li className="flex items-start gap-3 rounded-lg border border-line px-3 py-2.5">
      <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-red-500 mt-2" />
      <div className="min-w-0">
        <div className="text-ink font-medium">{rule}</div>
        <div className="text-xs text-label mt-0.5">{rationale}</div>
      </div>
    </li>
  );
}
