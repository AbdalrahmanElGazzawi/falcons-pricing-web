'use client';
import { useMemo, useState } from 'react';
import {
  CheckCircle2, TrendingUp, Calculator, Crown, Trophy, Zap, Layers, Image as ImageIcon,
  Send, Bell, Users, GitBranch, Map, Sparkles, Anchor, Lightbulb, AlertCircle,
  Clock, Heart, Globe, Calendar, FileText, Languages, Award, Eye, Target,
  Activity, Compass, Filter, ChevronDown, type LucideIcon,
} from 'lucide-react';

// ─── icon registry ─────────────────────────────────────────────────────────
const ICONS: Record<string, LucideIcon> = {
  CheckCircle2, TrendingUp, Calculator, Crown, Trophy, Zap, Layers, Image: ImageIcon,
  Send, Bell, Users, GitBranch, Map, Sparkles, Anchor, Lightbulb, AlertCircle,
  Clock, Heart, Globe, Calendar, FileText, Languages, Award, Eye, Target,
  Activity, Compass,
};

// ─── status taxonomy (derived from `tone`) ─────────────────────────────────
type Status = 'live' | 'building' | 'next' | 'watch' | 'future';

const STATUS: Record<Status, { label: string; pill: string; dot: string; ring: string }> = {
  live:     { label: 'Now',       pill: 'bg-green/15 text-greenDark border-green/40', dot: 'bg-green',   ring: 'ring-green/30' },
  building: { label: 'Building',  pill: 'bg-amber/15 text-amber border-amber/40',     dot: 'bg-amber',   ring: 'ring-amber/30' },
  next:     { label: 'Next',      pill: 'bg-navy/10 text-navy border-navy/30',        dot: 'bg-navy',    ring: 'ring-navy/20' },
  watch:    { label: 'Watch',     pill: 'bg-red-50 text-red-700 border-red-200',      dot: 'bg-red-500', ring: 'ring-red-200' },
  future:   { label: 'Planned',   pill: 'bg-bg text-label border-line',               dot: 'bg-mute',    ring: 'ring-line' },
};

const ALL_STATUSES: Status[] = ['live', 'building', 'next', 'future'];

function statusFromTone(tone: string | null): Status {
  switch ((tone ?? '').toLowerCase()) {
    case 'green': return 'live';
    case 'amber': return 'building';
    case 'navy':  return 'next';
    case 'red':   return 'watch';
    default:      return 'future';
  }
}

function firstSentence(s: string): string {
  if (!s) return '';
  const m = s.match(/^[^\n]*?[\.\!\?](?=\s|$)/);
  if (m) return m[0].trim();
  const line = s.split(/\n/, 1)[0]?.trim() ?? '';
  return line.length > 200 ? line.slice(0, 197).trim() + '…' : line;
}

function stripPhasePrefix(title: string): string {
  return title.replace(/^Phase\s+\d+\s*[—–\-:]?\s*/i, '').trim();
}

type Entry = {
  id: number;
  title: string;
  body: string;
  icon: string | null;
  tone: string | null;
  sort_order: number;
};

// ─── root view ─────────────────────────────────────────────────────────────
export function RoadmapView({ entries }: { entries: Entry[] }) {
  const phases    = useMemo(() => entries.filter(e =>  /^Phase\s+\d/i.test(e.title)), [entries]);
  const evolution = useMemo(() => entries.filter(e => !/^Phase\s+\d/i.test(e.title)), [entries]);

  return (
    <div className="space-y-10">
      <Brief phases={phases} />
      <PhasesSection phases={phases} />
      {evolution.length > 0 && <EvolutionSection items={evolution} />}
    </div>
  );
}

// ─── 1. Top brief: "Now / Next" + how to read this page ────────────────────
function Brief({ phases }: { phases: Entry[] }) {
  const live = phases.find(p => statusFromTone(p.tone) === 'live');
  const building = phases.find(p => statusFromTone(p.tone) === 'building');
  const next = phases.find(p => statusFromTone(p.tone) === 'next');

  return (
    <section className="rounded-2xl border border-line bg-greenSoft/30 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-green text-white grid place-items-center shrink-0 shadow-card">
          <Compass size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold text-ink">Pricing OS roadmap</div>
          <p className="text-sm text-label mt-1.5 leading-relaxed max-w-3xl">
            One timeline from today through 2027+. Each phase is a strategic unlock with a quarter
            attached. The methodology engine doesn&rsquo;t change between phases — only the data
            quality, deliverable types, and pricing models we layer on top.
          </p>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <NowNextCard tone="live"     label="Now"      phase={live} />
            <NowNextCard tone="building" label="Building" phase={building} />
            <NowNextCard tone="next"     label="Up next"  phase={next} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider text-label font-semibold mr-1">Status</span>
            {ALL_STATUSES.map(k => (
              <span key={k} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${STATUS[k].pill}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS[k].dot}`} />
                {STATUS[k].label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function NowNextCard({ tone, label, phase }: { tone: Status; label: string; phase?: Entry }) {
  const meta = STATUS[tone];
  if (!phase) {
    return (
      <div className={`rounded-xl border ${meta.pill} px-3.5 py-3 opacity-60`}>
        <div className="text-[10px] uppercase tracking-wider font-semibold">{label}</div>
        <div className="text-sm font-semibold mt-0.5">—</div>
      </div>
    );
  }
  const cleanTitle = stripPhasePrefix(phase.title);
  return (
    <a
      href={`#phase-${phase.id}`}
      className={`group block rounded-xl border ${meta.pill} px-3.5 py-3 transition hover:brightness-95`}
    >
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
        <span className="text-[10px] uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <div className="text-sm font-semibold mt-0.5 leading-snug group-hover:underline">{cleanTitle}</div>
    </a>
  );
}

// ─── 2. Phases — stepper + accordion cards ─────────────────────────────────
function PhasesSection({ phases }: { phases: Entry[] }) {
  if (phases.length === 0) {
    return (
      <SectionFrame
        icon={Map}
        title="Timeline"
        subtitle="Phases will appear here once the Pricing OS console is populated."
      >
        <div className="card card-p text-sm text-mute text-center">
          No phases yet — super admin can add them in the Pricing OS console.
        </div>
      </SectionFrame>
    );
  }

  return (
    <SectionFrame
      icon={Map}
      title="Timeline"
      subtitle="Today through 2027+. Click a node on the map to jump to its detail."
    >
      <PhaseStepper phases={phases} />
      <div className="mt-5 space-y-3">
        {phases.map((p, i) => (
          <PhaseAccordion key={p.id} entry={p} index={i} total={phases.length} />
        ))}
      </div>
    </SectionFrame>
  );
}

function PhaseStepper({ phases }: { phases: Entry[] }) {
  return (
    <div className="card p-5 overflow-x-auto">
      <ol className="flex items-start min-w-max">
        {phases.map((p, i) => {
          const s = statusFromTone(p.tone);
          const meta = STATUS[s];
          const isLast = i === phases.length - 1;
          const label = stripPhasePrefix(p.title) || `Phase ${i + 1}`;
          return (
            <li key={p.id} className="flex items-start shrink-0">
              <a
                href={`#phase-${p.id}`}
                className="flex flex-col items-center text-center px-3 sm:px-4 group focus:outline-none focus:ring-2 focus:ring-green/40 rounded-md"
              >
                <span
                  className={`relative w-10 h-10 rounded-full grid place-items-center ring-4 ${meta.ring} ${meta.dot} text-white text-sm font-bold shadow-card transition-transform group-hover:scale-105`}
                  aria-label={`Phase ${i + 1} — ${meta.label}`}
                >
                  {i + 1}
                </span>
                <span className="mt-2 text-[11px] uppercase tracking-wider font-semibold text-ink whitespace-nowrap group-hover:underline max-w-[11rem] truncate">
                  {label}
                </span>
                <span className={`mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${meta.pill}`}>
                  {meta.label}
                </span>
              </a>
              {!isLast && (
                <span aria-hidden className="self-start mt-5 w-6 sm:w-10 h-0.5 bg-line shrink-0" />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function PhaseAccordion({ entry, index, total }: { entry: Entry; index: number; total: number }) {
  const Icon = (entry.icon && ICONS[entry.icon]) || Map;
  const s = statusFromTone(entry.tone);
  const meta = STATUS[s];
  const defaultOpen = s === 'live' || s === 'building';
  const summary = firstSentence(entry.body);
  const cleanTitle = stripPhasePrefix(entry.title) || entry.title;

  return (
    <details
      id={`phase-${entry.id}`}
      open={defaultOpen}
      className="group card overflow-hidden scroll-mt-24 transition-shadow open:shadow-lift"
    >
      <summary className="list-none cursor-pointer select-none px-5 py-4 flex items-start gap-4 hover:bg-bg/50 [&::-webkit-details-marker]:hidden [&::marker]:hidden">
        <div className="flex flex-col items-center shrink-0">
          <span className={`w-10 h-10 rounded-lg grid place-items-center text-white shadow-card ${meta.dot}`}>
            <Icon size={18} />
          </span>
          {index < total - 1 && (
            <span aria-hidden className="w-px flex-1 bg-line mt-2 min-h-[1rem] group-open:bg-line/0" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] uppercase tracking-wider text-label font-semibold">
              Phase {index + 1}
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${meta.pill}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
              {meta.label}
            </span>
          </div>
          <div className="mt-0.5 text-base font-semibold text-ink leading-tight">
            {cleanTitle}
          </div>
          {summary && (
            <div className="text-sm text-label mt-1 line-clamp-2 group-open:hidden">
              {summary}
            </div>
          )}
        </div>
        <ChevronDown size={18} className="text-mute shrink-0 mt-1 transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-5 pb-5 pl-[4.25rem] text-sm text-label leading-relaxed whitespace-pre-wrap border-t border-line pt-4">
        {entry.body}
      </div>
    </details>
  );
}

// ─── 3. Evolution components — calm grid below the timeline ───────────────
function EvolutionSection({ items }: { items: Entry[] }) {
  const [filter, setFilter] = useState<Status | 'all'>('all');

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length, live: 0, building: 0, next: 0, watch: 0, future: 0 };
    items.forEach(e => { c[statusFromTone(e.tone)]++; });
    return c;
  }, [items]);

  const visible = filter === 'all'
    ? items
    : items.filter(e => statusFromTone(e.tone) === filter);

  return (
    <SectionFrame
      icon={Compass}
      title="Cross-cutting upgrades"
      subtitle="Smaller pieces that ship between phases without changing the engine."
    >
      <div className="card p-3 sm:p-4 mb-4 flex items-center gap-2 flex-wrap">
        <Filter size={14} className="text-label ml-1" />
        <span className="text-[11px] text-label font-semibold uppercase tracking-wider mr-1">Filter</span>

        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} count={counts.all}>
          All
        </FilterChip>

        {ALL_STATUSES.map(k => (
          <FilterChip
            key={k}
            active={filter === k}
            onClick={() => setFilter(k)}
            count={counts[k] ?? 0}
            tone={k}
          >
            {STATUS[k].label}
          </FilterChip>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="card card-p text-sm text-mute text-center">
          Nothing in this filter yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visible.map(e => <EvolutionCard key={e.id} entry={e} />)}
        </div>
      )}
    </SectionFrame>
  );
}

function FilterChip({
  active, onClick, count, tone, children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  tone?: Status;
  children: React.ReactNode;
}) {
  const meta = tone ? STATUS[tone] : null;
  const disabled = count === 0;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition',
        disabled ? 'opacity-30 cursor-not-allowed' : 'hover:brightness-95',
        active
          ? 'bg-navy text-white border-navy shadow-card'
          : meta
            ? meta.pill
            : 'bg-bg text-label border-line',
      ].join(' ')}
    >
      {meta && !active && <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />}
      {children}
      <span className={active ? 'text-white/70' : 'text-mute'}>{count}</span>
    </button>
  );
}

function EvolutionCard({ entry }: { entry: Entry }) {
  const Icon = (entry.icon && ICONS[entry.icon]) || Sparkles;
  const s = statusFromTone(entry.tone);
  const meta = STATUS[s];

  return (
    <details className="card group transition-shadow open:shadow-lift">
      <summary className="list-none cursor-pointer select-none p-4 flex items-start gap-3 hover:bg-bg/40 [&::-webkit-details-marker]:hidden [&::marker]:hidden">
        <div className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 ${meta.dot} text-white shadow-card`}>
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${meta.pill}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
              {meta.label}
            </span>
          </div>
          <div className="mt-1 text-sm font-semibold text-ink leading-tight">{entry.title}</div>
        </div>
        <ChevronDown size={16} className="text-mute shrink-0 mt-1 transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-4 pb-4 pl-[3.75rem] text-xs text-label leading-relaxed whitespace-pre-wrap border-t border-line pt-3">
        {entry.body}
      </div>
    </details>
  );
}

// ─── shared section frame ──────────────────────────────────────────────────
function SectionFrame({
  icon: Icon, title, subtitle, children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-greenSoft text-greenDark grid place-items-center mt-0.5">
          <Icon size={18} />
        </div>
        <div>
          <div className="text-base font-semibold text-ink leading-tight">{title}</div>
          <div className="text-xs text-label mt-1 max-w-2xl">{subtitle}</div>
        </div>
      </div>
      {children}
    </section>
  );
}
