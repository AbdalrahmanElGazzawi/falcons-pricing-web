'use client';
import {
  Search, Sliders, FileCheck, Send, ListChecks, Map, Calculator,
  CheckCircle2, Clock, Anchor,
} from 'lucide-react';
import Link from 'next/link';

/**
 * PricingReference — slim sales-side guide. Just enough for someone using
 * the builder to know what's live, what's coming, and how to drive the wizard.
 *
 * The deep encyclopedia (all 9 axes, creator-vs-player matrix, best practice,
 * guardrails) lives in /admin/pricing (super-admin) and /admin/roadmap.
 */
export function PricingReference() {
  return (
    <div className="space-y-5 max-w-3xl">
      <CurrentPhaseCard />
      <PlatformAnchorCard />
      <AuthorityCard />
      <QuickGuideCard />
      <DeeperLinks />
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
function CurrentPhaseCard() {
  return (
    <div className="card overflow-hidden">
      <div className="bg-gradient-to-r from-green to-greenDark text-white px-5 py-4">
        <div className="text-[10px] tracking-widest opacity-80">CURRENT PHASE</div>
        <div className="text-lg font-semibold mt-0.5">Phase 1 — Standardization</div>
        <div className="text-xs opacity-90">Live · April 2026</div>
      </div>
      <div className="p-5 space-y-2.5 text-sm">
        <Bullet ok>Unified rate card across 192 active roster members.</Bullet>
        <Bullet ok>9-axis pricing engine (engagement, audience, seasonality, content type, language, authority, objective, confidence) live in the wizard.</Bullet>
        <Bullet ok>Add-on rights packages (uplift %) baked into line totals.</Bullet>
        <Bullet ok>Audit log on every quote, every layout edit, every roster change.</Bullet>
        <Bullet ok>PDF quotation export — Falcons-branded, VAT inclusive.</Bullet>
        <Bullet ok>Saudi-players filter on the picker — toggle to narrow the roster to Saudi nationals in one click.</Bullet>
        <Bullet ok>Draft loader on /quote/new — pick from your last 25 saved drafts and resume right where you left off.</Bullet>
        <Bullet ok>Prepared-by title pulled from your profile (no per-quote typing) — appears next to your name on the PDF.</Bullet>

        <div className="border-t border-line pt-3 mt-3">
          <div className="text-xs uppercase tracking-wider text-label font-semibold mb-2">Awaiting next</div>
          <Bullet pending>
            <strong className="text-ink font-medium">Shikenso API (Phase 2)</strong> —
            once integrated, IG Reel rates auto-update from verified follower + engagement data.
            Until then, base rates are tier-driven and adjusted manually per player.
          </Bullet>
        </div>
      </div>
    </div>
  );
}

function PlatformAnchorCard() {
  return (
    <div className="card card-p">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-green/10 text-greenDark grid place-items-center"><Anchor size={18} /></div>
        <div>
          <div className="text-base font-semibold text-ink leading-tight">How a price is built</div>
          <div className="text-xs text-mute">IG Reel is the price anchor. Other platforms derive from it.</div>
        </div>
      </div>
      <div className="text-sm text-label leading-relaxed mb-3">
        Each player's IG Reel rate is set by tier and refined manually by follower count + esports
        achievements. Other platforms cascade from IG Reel using world-best-practice ratios:
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {[
          ['IG Reel',         '100%', 'anchor'],
          ['IG Story',         '70%', 'ephemeral, swipe-up'],
          ['Twitch 2h',       '145%', 'live premium'],
          ['IRL appearance',  '220%', 'full-day cost'],
          ['TikTok',           '78%', 'higher ER, lower CPM'],
          ['YouTube Short',    '32%', 'short-form discount'],
          ['X Post',           '20%', 'amplification only'],
        ].map(([name, pct, note]) => (
          <div key={name} className="rounded-lg border border-line bg-bg/40 px-3 py-2">
            <div className="text-xs text-label">{name}</div>
            <div className="text-base font-bold text-ink">{pct}</div>
            <div className="text-[10px] text-mute">{note}</div>
          </div>
        ))}
      </div>
      <div className="text-xs text-mute mt-3">
        After base × ratio, the wizard applies the 6 multiplier axes (engagement, audience, seasonality, content type, language, authority) and rights uplift.
      </div>
    </div>
  );
}

function AuthorityCard() {
  const levels: Array<{ label: string; mult: string; signal: string }> = [
    { label: 'Normal',                       mult: '1.00×', signal: 'Standard player or content creator. No major podiums.' },
    { label: 'Proven / Established',         mult: '1.15×', signal: 'Regional champion · Top-10 in their game/vertical · 2+ years pro.' },
    { label: 'Elite Contender',              mult: '1.30×', signal: 'Top-10 world ranking · Major finalist · IEM / EWC qualifier.' },
    { label: 'Global Star / Major Winner',   mult: '1.50×', signal: 'World champion · EWC / Worlds winner · Iconic pro name (NiKo / m0NESY tier).' },
  ];
  return (
    <div className="card card-p">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-navy/10 text-navy grid place-items-center"><Anchor size={18} /></div>
        <div>
          <div className="text-base font-semibold text-ink leading-tight">Authority — pro credentials premium</div>
          <div className="text-xs text-mute">What counts as &ldquo;Elite&rdquo; vs &ldquo;Global Star&rdquo;, and how it sets a price floor.</div>
        </div>
      </div>
      <div className="text-sm text-label leading-relaxed mb-3">
        Authority is the only multiplier with a <strong className="text-ink">floor</strong>: a pro player&apos;s social rate is never
        priced below their IRL appearance value times their tier&apos;s floor share.
        Pick the level by their best tournament result in the last 12 months — when in doubt, default to <em>Proven</em> for active pros.
      </div>
      <div className="rounded-lg border border-line divide-y divide-line overflow-hidden mb-3">
        {levels.map(l => (
          <div key={l.label} className="flex items-start gap-3 px-3 py-2.5">
            <div className="w-12 text-xs font-mono font-bold text-greenDark tabular-nums shrink-0 pt-0.5">{l.mult}</div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-ink">{l.label}</div>
              <div className="text-xs text-mute">{l.signal}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-lg bg-bg/50 border border-line px-3 py-2 text-[11px] font-mono text-label leading-relaxed">
        <div><strong className="text-ink">SocialPrice</strong>  = base × eng × aud × seas × ctype × lang × <em>authFactor</em></div>
        <div><strong className="text-ink">AuthorityFloor</strong> = IRL × floorShare × seas × lang × <em>authFactor</em></div>
        <div><strong className="text-ink">FinalPrice</strong>   = MAX(Social, Floor) × (1 + addOnPct)</div>
        <div className="mt-1"><em>authFactor = 1 + objectiveWeight × (authority − 1)</em></div>
      </div>
      <div className="text-[11px] text-mute mt-2">
        Tournament examples come from the v8 Adjustment Matrix (sheet of record). Calibration revisits each quarter as Shikenso data lands.
      </div>
    </div>
  );
}

function QuickGuideCard() {
  const steps: Array<{ icon: any; title: string; body: string }> = [
    {
      icon: ListChecks,
      title: '1. Fill the header',
      body: 'Client name, campaign, currency, VAT. The client name is the only required field — everything else can be filled later.',
    },
    {
      icon: Sliders,
      title: '2. Set campaign axes (defaults)',
      body: 'Pick the campaign-level engagement / audience / seasonality / content type / language / authority. These apply to every line by default. Override per line in the wizard.',
    },
    {
      icon: Search,
      title: '3. Add deliverables via the wizard',
      body: 'Click "+ Add deliverable" → step through Type → Tier/Game/Team → Talent → Deliverable → Axis tweaks → Review. Click any breadcrumb to jump back. Every step shows the live price.',
    },
    {
      icon: FileCheck,
      title: '4. Check Preview',
      body: 'Switch to the Preview tab to see exactly what the saved quote will look like. Same data as Build — flipping does not recompute anything.',
    },
    {
      icon: Send,
      title: '5. Save Draft or Submit',
      body: 'Save Draft = keeps it private, only you see it. Submit = goes to Pending Approval. Buttons are in the right rail — sticky, available from any tab.',
    },
  ];
  return (
    <div className="card card-p">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-navy text-white grid place-items-center"><FileCheck size={18} /></div>
        <div>
          <div className="text-base font-semibold text-ink leading-tight">Quick guide — how to use the builder</div>
          <div className="text-xs text-mute">Five steps from blank to submitted.</div>
        </div>
      </div>
      <div className="space-y-3">
        {steps.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.title} className="flex items-start gap-3">
              <div className="shrink-0 w-7 h-7 rounded-md bg-greenSoft text-greenDark grid place-items-center mt-0.5">
                <Icon size={14} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-ink">{s.title}</div>
                <div className="text-xs text-label leading-relaxed mt-0.5">{s.body}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DeeperLinks() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Link href="/admin/roadmap" className="card p-4 hover:border-green transition group">
        <div className="flex items-center gap-3 mb-1.5">
          <div className="w-8 h-8 rounded-md bg-greenSoft text-greenDark grid place-items-center group-hover:scale-105 transition">
            <Map size={14} />
          </div>
          <div className="text-sm font-semibold text-ink">Roadmap →</div>
        </div>
        <div className="text-xs text-label">
          Phases, evolution components, and the Falcon Points economy. Where the engine is heading.
        </div>
      </Link>
      <Link href="/admin/pricing" className="card p-4 hover:border-green transition group">
        <div className="flex items-center gap-3 mb-1.5">
          <div className="w-8 h-8 rounded-md bg-blue-100 text-blue-700 grid place-items-center group-hover:scale-105 transition">
            <Calculator size={14} />
          </div>
          <div className="text-sm font-semibold text-ink">Pricing OS →</div>
        </div>
        <div className="text-xs text-label">
          Full reference: every multiplier explained, all axis options, best practices, guardrails.
          Super-admin can edit; staff can view.
        </div>
      </Link>
    </div>
  );
}

function Bullet({ children, ok, pending }: {
  children: React.ReactNode; ok?: boolean; pending?: boolean;
}) {
  const Icon = ok ? CheckCircle2 : pending ? Clock : CheckCircle2;
  const tone = ok ? 'text-greenDark' : pending ? 'text-amber' : 'text-mute';
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={14} className={`shrink-0 mt-0.5 ${tone}`} />
      <div className="text-sm text-label leading-relaxed">{children}</div>
    </div>
  );
}
