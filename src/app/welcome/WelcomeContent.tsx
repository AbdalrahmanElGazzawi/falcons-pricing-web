'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Sparkles, Users, FileText, Send, ShieldCheck, Calculator, Layers,
  Inbox, Map, ArrowRight, BookOpen, Trophy,
} from 'lucide-react';
import type { UserRole } from '@/lib/types';

const WELCOME_KEY = 'falcons_welcome_seen_v1';

// Derive a friendly greeting name from whatever profile data is available.
// Priority: full_name first word → email prefix (capitalized + cleaned) → "there".
function deriveFirstName(fullName: string | null, email: string): string {
  const n = (fullName ?? '').trim();
  if (n) {
    const first = n.split(/\s+/)[0];
    if (first) return first;
  }
  const prefix = (email.split('@')[0] ?? '')
    .replace(/[._+-]+/g, ' ')
    .replace(/\d+$/, '')
    .trim();
  if (prefix) {
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }
  return 'there';
}

const ROLE_LABEL: Record<UserRole, string> = {
  admin:   'Admin',
  sales:   'Sales',
  finance: 'Finance',
  viewer:  'Viewer',
};

export function WelcomeContent({
  role,
  email,
  fullName,
}: {
  role: UserRole;
  email: string;
  fullName: string | null;
}) {
  const router = useRouter();
  const firstName = deriveFirstName(fullName, email);

  const dismiss = (href: string) => {
    try { localStorage.setItem(WELCOME_KEY, new Date().toISOString()); } catch {}
    router.push(href);
  };

  const primaryCta =
    role === 'admin'
      ? { label: 'Review pending quotes', href: '/quotes?status=pending_approval' }
      : role === 'sales'
      ? { label: 'Build your first quote', href: '/quote/new' }
      : role === 'finance'
      ? { label: 'Open the quote log', href: '/quotes' }
      : { label: 'Open the dashboard', href: '/dashboard' };

  return (
    <div className="space-y-10 -mx-4 sm:-mx-6 lg:-mx-8 -mt-2 pb-8">
      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden rounded-2xl bg-navy text-white px-6 sm:px-10 py-10 sm:py-14">
        {/* decorative gradient blobs */}
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
        <div className="relative grid grid-cols-1 lg:grid-cols-[1.5fr,1fr] gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur text-xs uppercase tracking-wider font-medium">
              <Sparkles size={14} /> Welcome to Pricing OS
            </div>
            <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight">
              Hey {firstName}, this is how Team Falcons prices its activations now.
            </h1>
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-green inline-block" />
              <span className="text-white/90">Signed in as <strong className="font-semibold text-white">{email}</strong></span>
              <span className="text-white/40">·</span>
              <span className="uppercase tracking-wider font-semibold text-white/80">{ROLE_LABEL[role]}</span>
            </div>
            <p className="mt-4 text-base sm:text-lg text-white/80 max-w-2xl">
              No more spreadsheets passed around in DMs. Pricing OS is the single source of truth for
              every quote that goes out the door — measured, audited, on-brand.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={() => dismiss(primaryCta.href)}
                className="btn btn-primary !py-2.5 !px-5"
              >
                {primaryCta.label} <ArrowRight size={16} />
              </button>
              <button
                onClick={() => dismiss('/dashboard')}
                className="btn !py-2.5 !px-5 bg-white/10 hover:bg-white/15 text-white border border-white/20"
              >
                Skip to dashboard
              </button>
            </div>
            <p className="mt-3 text-xs text-white/50">
              We&rsquo;ll only show this once. You can revisit it anytime from <strong>About</strong> in the sidebar.
            </p>
          </div>
          <div className="hidden lg:flex justify-center">
            <Image
              src="/team-falcons-logo.png"
              alt="Team Falcons"
              width={220}
              height={220}
              className="opacity-90 drop-shadow-2xl"
              priority
            />
          </div>
        </div>
      </section>

      {/* ─── The logic in 30 seconds (entry brief) ─── */}
      <section className="px-4 sm:px-6">
        <h2 className="text-xs uppercase tracking-wider text-label font-semibold mb-3">
          The logic, in 30 seconds
        </h2>
        <div className="card overflow-hidden border-l-4 border-l-green">
          <div className="p-5 sm:p-6 border-b border-line bg-greenSoft/30">
            <div className="text-base sm:text-lg font-semibold text-ink leading-snug">
              How a price gets made — and why it can be trusted.
            </div>
            <p className="text-sm text-label mt-1.5 max-w-2xl">
              Four rules carry the whole system. If you understand these, you understand
              every number that leaves this building.
            </p>
          </div>
          <div className="divide-y divide-line">
            <LogicRow
              n={1}
              label="Data, not gut."
              body="Every price starts from real follower counts, real engagement, and tier floors set by leadership. The wizard adds nothing a spreadsheet couldn't justify."
            />
            <LogicRow
              n={2}
              label="Nine axes, one number."
              body="Content type · audience · engagement · seasonality · language · authority · objective weight · confidence · rights — multiplied together — produce one auditable price per line."
            />
            <LogicRow
              n={3}
              label="Floors protect us."
              body="A tier floor stops the engine from underpricing anchor talent. A confidence cap stops it from overpricing on shaky measurement. Either way, the price stays defensible."
            />
            <LogicRow
              n={4}
              label="Every quote is auditable."
              body="Approvals, edits, sends, brand decisions — all logged with who, what, when. Finance and legal stop chasing screenshots."
            />
          </div>
          <div className="px-5 sm:px-6 py-3.5 bg-bg/60 text-xs text-label flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-ink">In one line:</span>
            <span>
              Final = MAX(SocialPrice, AuthorityFloor) × ConfidenceCap × (1 + RightsUplift) — and every number above is sourced.
            </span>
          </div>
        </div>
      </section>

      {/* ─── What this is ─── */}
      <section className="px-4 sm:px-6">
        <h2 className="text-xs uppercase tracking-wider text-label font-semibold mb-3">What is Pricing OS?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeatureCard
            icon={Calculator}
            title="A real pricing engine"
            body="Every quote runs through a 9-axis matrix — content type, engagement, audience, seasonality, language, authority, objective weight, confidence, and rights uplift. No more eyeballed numbers."
          />
          <FeatureCard
            icon={Users}
            title="Your roster, live"
            body="189 players + 17 creators, with rates, tiers, and platform-specific pricing. Edit once, every quote updates. Tier floors stop teams from underpricing."
          />
          <FeatureCard
            icon={ShieldCheck}
            title="Audit-ready by default"
            body="Approvals, send-to-client, brand decisions, and admin actions all log to an audit trail. Finance and legal stop chasing screenshots."
          />
        </div>
      </section>

      {/* ─── How it works (4-step flow) ─── */}
      <section className="px-4 sm:px-6">
        <h2 className="text-xs uppercase tracking-wider text-label font-semibold mb-4">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StepCard
            n={1}
            icon={FileText}
            title="Build the quote"
            body="Open New Quote, add talent + deliverables, override per-line factors if needed. Live pricing as you tweak."
          />
          <StepCard
            n={2}
            icon={ShieldCheck}
            title="Submit for approval"
            body="Quotes go to the admin queue. Approver sees the full breakdown and can approve, request changes, or reject."
          />
          <StepCard
            n={3}
            icon={Send}
            title="Send to client"
            body="Approved quotes get a token-protected client URL. Brand reviews and clicks Approve/Reject — no login required."
          />
          <StepCard
            n={4}
            icon={Trophy}
            title="Close the loop"
            body="Won, lost, or rejected — every outcome is captured. The pipeline view tells you what's live and what's at risk."
          />
        </div>
      </section>

      {/* ─── Where to look in the sidebar ─── */}
      <section className="px-4 sm:px-6">
        <h2 className="text-xs uppercase tracking-wider text-label font-semibold mb-4">Where to find things</h2>
        <div className="card card-p">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-sm">
            <SidebarHint icon={FileText} label="New Quote" body="Build a campaign quote from scratch." />
            <SidebarHint icon={Layers} label="Quote Log" body="Every quote, every status, searchable." />
            <SidebarHint icon={Inbox} label="Inquiries" body="Inbound brand DMs, agency emails, leads waiting to become deals." />
            <SidebarHint icon={Users} label="Roster" body="Players — rate cards, tiers, platforms." />
            <SidebarHint icon={Sparkles} label="Creators" body="External creator partners and their rates." />
            <SidebarHint icon={Map} label="Roadmap" body="What's planned, what's shipping, what's live." />
          </div>
        </div>
      </section>

      {/* ─── Foundational concepts (collapsible-feel cards) ─── */}
      <section className="px-4 sm:px-6">
        <h2 className="text-xs uppercase tracking-wider text-label font-semibold mb-4">Concepts worth knowing</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ConceptCard
            title="The 9-axis pricing engine"
            body="Final = MAX(SocialPrice, AuthorityFloor) × ConfidenceCap × (1 + RightsUplift). The Authority Floor stops the engine from underpricing anchor talent. The Confidence Cap prevents overpricing on shaky measurement."
          />
          <ConceptCard
            title="Tiers and floor share"
            body="Players sit in tiers S/1/2/3/4. Each tier has a floor share that anchors the IRL fee against the social price. Admins can adjust tiers live without redeploying."
          />
          <ConceptCard
            title="Add-on rights packages"
            body="Usage rights (paid media, perpetual, exclusivity, etc.) stack as additive uplifts on top of the per-line price. Cap is enforced at the quote level."
          />
          <ConceptCard
            title="Quote lifecycle"
            body="draft → pending_approval → approved → sent_to_client → client_approved/rejected → closed_won/lost. Every transition is logged. Clients see only the public portal."
          />
        </div>
      </section>

      {/* ─── Footer CTA ─── */}
      <section className="px-4 sm:px-6">
        <div className="card card-p flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="font-semibold text-ink">Ready when you are.</div>
            <div className="text-sm text-label mt-0.5">
              Hit the button. We&rsquo;ll keep this guide one click away under <strong>About</strong>.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="btn btn-ghost">
              <BookOpen size={14} /> Browse first
            </Link>
            <button onClick={() => dismiss(primaryCta.href)} className="btn btn-primary">
              {primaryCta.label} <ArrowRight size={14} />
            </button>
          </div>
        </div>
        <p className="text-xs text-mute mt-4 text-center">
          Built by Abdalrahman elGazzawi · Team Falcons Commercial
        </p>
      </section>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────
function FeatureCard({
  icon: Icon, title, body,
}: {
  icon: typeof Sparkles; title: string; body: string;
}) {
  return (
    <div className="card card-p hover:shadow-lift transition">
      <div className="w-10 h-10 rounded-lg bg-greenSoft flex items-center justify-center mb-3">
        <Icon size={20} className="text-greenDark" />
      </div>
      <div className="font-semibold text-ink mb-1">{title}</div>
      <p className="text-sm text-label leading-relaxed">{body}</p>
    </div>
  );
}

function StepCard({
  n, icon: Icon, title, body,
}: {
  n: number; icon: typeof Sparkles; title: string; body: string;
}) {
  return (
    <div className="card card-p relative">
      <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-navy text-white flex items-center justify-center text-sm font-bold shadow-card">
        {n}
      </div>
      <Icon size={20} className="text-navy mb-3" />
      <div className="font-semibold text-ink mb-1">{title}</div>
      <p className="text-sm text-label leading-relaxed">{body}</p>
    </div>
  );
}

function SidebarHint({
  icon: Icon, label, body,
}: {
  icon: typeof Sparkles; label: string; body: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-md bg-bg flex items-center justify-center flex-shrink-0">
        <Icon size={16} className="text-label" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-ink">{label}</div>
        <div className="text-xs text-label leading-snug">{body}</div>
      </div>
    </div>
  );
}

function ConceptCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="card card-p border-l-4 border-l-green">
      <div className="font-semibold text-ink mb-1">{title}</div>
      <p className="text-sm text-label leading-relaxed">{body}</p>
    </div>
  );
}

function LogicRow({ n, label, body }: { n: number; label: string; body: string }) {
  return (
    <div className="px-5 sm:px-6 py-4 sm:py-5 flex items-start gap-4 sm:gap-5">
      <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-navy text-white grid place-items-center font-extrabold text-base sm:text-lg shadow-card tabular-nums">
        {n}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm sm:text-base font-semibold text-ink leading-tight">{label}</div>
        <p className="text-sm text-label leading-relaxed mt-1">{body}</p>
      </div>
    </div>
  );
}
