'use client';
import { useMemo } from 'react';
import {
  CheckCircle2, TrendingUp, Calculator, Crown, Trophy, Zap, Layers, Image as ImageIcon,
  Send, Bell, Users, GitBranch, Map, Sparkles, Anchor, Lightbulb, AlertCircle,
  Clock, Heart, Globe, Calendar, FileText, Languages, Award, Eye, Target,
  Activity, Compass, ChevronDown, ChevronRight, MapPin, Flag, type LucideIcon,
} from 'lucide-react';

// ─── icon registry ─────────────────────────────────────────────────────────
const ICONS: Record<string, LucideIcon> = {
  CheckCircle2, TrendingUp, Calculator, Crown, Trophy, Zap, Layers, Image: ImageIcon,
  Send, Bell, Users, GitBranch, Map, Sparkles, Anchor, Lightbulb, AlertCircle,
  Clock, Heart, Globe, Calendar, FileText, Languages, Award, Eye, Target,
  Activity, Compass,
};

// ─── status taxonomy ──────────────────────────────────────────────────────
type Status = 'live' | 'building' | 'next' | 'future';

const STATUS: Record<Status, {
  label: string; chip: string; dot: string; ring: string;
  cellBg: string; cellBorder: string; ordinal: number;
}> = {
  live:     { label: 'Now',      chip: 'bg-green text-white',                     dot: 'bg-green',   ring: 'ring-green/30',   cellBg: 'bg-green/10',   cellBorder: 'border-green/40',   ordinal: 0 },
  building: { label: 'Building', chip: 'bg-amber text-white',                     dot: 'bg-amber',   ring: 'ring-amber/30',   cellBg: 'bg-amber/10',   cellBorder: 'border-amber/40',   ordinal: 1 },
  next:     { label: 'Next',     chip: 'bg-navy text-white',                      dot: 'bg-navy',    ring: 'ring-navy/20',    cellBg: 'bg-navy/8',     cellBorder: 'border-navy/30',    ordinal: 2 },
  future:   { label: 'Planned',  chip: 'bg-bg text-label border border-line',     dot: 'bg-mute',    ring: 'ring-line',       cellBg: 'bg-bg/40',      cellBorder: 'border-line',       ordinal: 3 },
};

const ALL_STATUSES: Status[] = ['live', 'building', 'next', 'future'];

function statusFromTone(tone: string | null): Status {
  switch ((tone ?? '').toLowerCase()) {
    case 'green': return 'live';
    case 'amber': return 'building';
    case 'navy':  return 'next';
    default:      return 'future';
  }
}

function stripPrefix(title: string): string {
  return title.replace(/^(?:State|Phase)\s+\d+\s*[—–\-:]?\s*/i, '').trim();
}

// strip the "Q2 2026 · " bit from a label that already has its quarter shown above it
function stripQuarter(s: string): string {
  return s.replace(/^Q[1-4]\s+\d{4}\s*·\s*/i, '')
          .replace(/^\d{4}\+?\s*·\s*/i, '')
          .trim();
}

// ─── timeline columns (quarters) ──────────────────────────────────────────
type QuarterId = '2026Q2' | '2026Q3' | '2026Q4' | '2027Q1' | '2027Q2' | '2027H2';

const QUARTERS: { id: QuarterId; year: number; label: string }[] = [
  { id: '2026Q2', year: 2026, label: 'Q2 2026' },
  { id: '2026Q3', year: 2026, label: 'Q3 2026' },
  { id: '2026Q4', year: 2026, label: 'Q4 2026' },
  { id: '2027Q1', year: 2027, label: 'Q1 2027' },
  { id: '2027Q2', year: 2027, label: 'Q2 2027' },
  { id: '2027H2', year: 2027, label: '2027+' },
];

function quarterFromTitle(title: string): QuarterId {
  // "Q2 2026 · ..."
  const q = title.match(/Q([1-4])\s+(\d{4})/i);
  if (q) {
    const id = `${q[2]}Q${q[1]}` as QuarterId;
    if (QUARTERS.some(x => x.id === id)) return id;
  }
  // "2027 · ..." with no Q
  if (/2027\+/i.test(title)) return '2027H2';
  if (/^(?:State|Phase)\s+\d+\s*[—–\-:]?\s*2027\b/i.test(title)) return '2027H2';
  return '2026Q2';
}

type Entry = {
  id: number;
  title: string;
  body: string;
  icon: string | null;
  tone: string | null;
  sort_order: number;
};

type Track = 'state' | 'phase';

// ─── root view ────────────────────────────────────────────────────────────
export function RoadmapView({ entries }: { entries: Entry[] }) {
  const states = useMemo(() => entries.filter(e => /^State\s+\d/i.test(e.title)), [entries]);
  const phases = useMemo(() => entries.filter(e => /^Phase\s+\d/i.test(e.title)), [entries]);
  const all = useMemo(() => [...states, ...phases], [states, phases]);

  // The "active" milestone — first one with status 'live' (falls back to 'building').
  const active =
    all.find(e => statusFromTone(e.tone) === 'live') ??
    all.find(e => statusFromTone(e.tone) === 'building') ??
    all[0];

  const upNext =
    all.find(e => statusFromTone(e.tone) === 'building' && e.id !== active?.id) ??
    all.find(e => statusFromTone(e.tone) === 'next');

  return (
    <div className="space-y-10">
      <Hero active={active} upNext={upNext} total={all.length} index={active ? all.indexOf(active) : 0} />
      <TimelineMatrix states={states} phases={phases} />
      <DetailList states={states} phases={phases} />
    </div>
  );
}

// ─── 1. Hero — "You are here" ─────────────────────────────────────────────
function Hero({ active, upNext, total, index }: {
  active?: Entry; upNext?: Entry; total: number; index: number;
}) {
  if (!active) {
    return (
      <section className="rounded-2xl border border-line bg-bg/40 p-6 text-sm text-mute text-center">
        Roadmap loading…
      </section>
    );
  }
  const pct = total > 0 ? Math.round(((index + 1) / total) * 100) : 0;
  const progressLabel = `${index + 1} of ${total} milestones`;
  const ActiveIcon = (active.icon && ICONS[active.icon]) || Activity;
  const UpIcon = upNext ? ((upNext.icon && ICONS[upNext.icon]) || ChevronRight) : ChevronRight;

  return (
    <section className="relative overflow-hidden rounded-2xl bg-navy text-white shadow-lift">
      {/* gradient blobs */}
      <div aria-hidden
        className="absolute -top-20 -right-16 w-72 h-72 rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle, #2ED06E 0%, transparent 70%)' }} />
      <div aria-hidden
        className="absolute -bottom-24 -left-12 w-72 h-72 rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #D4A514 0%, transparent 70%)' }} />

      <div className="relative grid grid-cols-1 lg:grid-cols-[1.4fr,1fr] gap-6 p-6 sm:p-8">
        {/* Left: where we are */}
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur text-[10px] uppercase tracking-widest font-semibold">
            <MapPin size={12} /> You are here
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green/20 ring-2 ring-green/40 grid place-items-center shrink-0">
              <ActiveIcon size={22} className="text-green" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wider text-white/60 font-semibold">Currently</div>
              <h2 className="text-xl sm:text-2xl font-extrabold leading-tight tracking-tight">
                {stripPrefix(active.title)}
              </h2>
            </div>
          </div>

          {/* Progress meter */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-[11px] text-white/70 font-semibold uppercase tracking-wider">
              <span>Q2 2026</span>
              <span>{progressLabel}</span>
              <span>2027+</span>
            </div>
            <div className="mt-2 relative h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-green to-greenDark"
                style={{ width: `${pct}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white ring-4 ring-green/40 shadow-card"
                style={{ left: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right: up next preview */}
        {upNext && (
          <a
            href={`#milestone-${upNext.id}`}
            className="group relative block rounded-xl border border-white/15 bg-white/5 backdrop-blur-sm p-4 hover:bg-white/10 transition"
          >
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/70 font-semibold">
              <Flag size={12} /> Up next
            </div>
            <div className="mt-2 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/10 grid place-items-center shrink-0">
                <UpIcon size={16} className="text-white/80" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-snug group-hover:underline">
                  {stripPrefix(upNext.title)}
                </div>
                <div className="text-[11px] text-white/60 mt-1">
                  {STATUS[statusFromTone(upNext.tone)].label}
                </div>
              </div>
            </div>
          </a>
        )}
      </div>
    </section>
  );
}

// ─── 2. Timeline matrix — Gantt-style quarter columns ────────────────────
function TimelineMatrix({ states, phases }: { states: Entry[]; phases: Entry[] }) {
  // Bucket entries by quarter
  const stateByQ = useMemo(() => bucketByQuarter(states), [states]);
  const phaseByQ = useMemo(() => bucketByQuarter(phases), [phases]);

  // Active quarter for the highlight column (first quarter that contains a 'live' entry; fallback to first 'building')
  const activeQuarter = useMemo<QuarterId | null>(() => {
    for (const q of QUARTERS) {
      const all = [...(stateByQ[q.id] ?? []), ...(phaseByQ[q.id] ?? [])];
      if (all.some(e => statusFromTone(e.tone) === 'live')) return q.id;
    }
    for (const q of QUARTERS) {
      const all = [...(stateByQ[q.id] ?? []), ...(phaseByQ[q.id] ?? [])];
      if (all.some(e => statusFromTone(e.tone) === 'building')) return q.id;
    }
    return null;
  }, [stateByQ, phaseByQ]);

  return (
    <SectionFrame
      icon={Calendar}
      title="Quarterly timeline"
      subtitle="Where each milestone lands across the next 18 months. Click a card to jump to its detail."
    >
      <div className="card overflow-x-auto">
        <div className="min-w-[860px]">
          {/* Year header */}
          <div className="grid grid-cols-[10rem_repeat(6,1fr)] border-b border-line bg-bg/30">
            <div />
            {QUARTERS.map((q, i) => {
              const yearStart = i === 0 || QUARTERS[i - 1].year !== q.year;
              return (
                <div key={q.id} className={`px-3 py-2 text-[10px] uppercase tracking-widest font-bold text-label ${yearStart ? 'border-l-2 border-line' : ''}`}>
                  {yearStart ? q.year : ''}
                </div>
              );
            })}
          </div>

          {/* Quarter header */}
          <div className="grid grid-cols-[10rem_repeat(6,1fr)] border-b border-line">
            <div />
            {QUARTERS.map(q => {
              const isActive = q.id === activeQuarter;
              return (
                <div
                  key={q.id}
                  className={`relative px-3 py-2.5 text-xs font-semibold text-center ${
                    isActive ? 'text-greenDark bg-green/8' : 'text-ink'
                  }`}
                >
                  {q.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 rounded-full bg-green ring-2 ring-white shadow-card" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Track 1: Engine state */}
          <TimelineRow label="Engine state" sublabel="Operational rollout" buckets={stateByQ} kind="state" activeQuarter={activeQuarter} />
          {/* Track 2: Capability roadmap */}
          <TimelineRow label="Capability roadmap" sublabel="What we add next" buckets={phaseByQ} kind="phase" activeQuarter={activeQuarter} />
        </div>
      </div>

      {/* Status legend */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-wider text-label font-semibold mr-1">Status</span>
        {ALL_STATUSES.map(k => (
          <span key={k} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${STATUS[k].chip}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${k === 'future' ? 'bg-mute' : 'bg-white'}`} />
            {STATUS[k].label}
          </span>
        ))}
      </div>
    </SectionFrame>
  );
}

function bucketByQuarter(entries: Entry[]): Record<QuarterId, Entry[]> {
  const out: Record<string, Entry[]> = {};
  for (const e of entries) {
    const q = quarterFromTitle(e.title);
    (out[q] ||= []).push(e);
  }
  return out as Record<QuarterId, Entry[]>;
}

function TimelineRow({
  label, sublabel, buckets, kind, activeQuarter,
}: {
  label: string; sublabel: string;
  buckets: Record<QuarterId, Entry[]>;
  kind: Track;
  activeQuarter: QuarterId | null;
}) {
  return (
    <div className="grid grid-cols-[10rem_repeat(6,1fr)] border-b border-line last:border-b-0">
      <div className="px-3 py-3 border-r border-line bg-bg/20">
        <div className="text-sm font-semibold text-ink">{label}</div>
        <div className="text-[11px] text-mute mt-0.5">{sublabel}</div>
      </div>
      {QUARTERS.map(q => {
        const cell = buckets[q.id] ?? [];
        const isActiveCol = q.id === activeQuarter;
        return (
          <div
            key={q.id}
            className={`p-1.5 sm:p-2 space-y-1.5 align-top ${isActiveCol ? 'bg-green/[0.03]' : ''}`}
            style={{ minHeight: '5.5rem' }}
          >
            {cell.map(e => <TimelineCell key={e.id} entry={e} kind={kind} />)}
          </div>
        );
      })}
    </div>
  );
}

function TimelineCell({ entry, kind }: { entry: Entry; kind: Track }) {
  const Icon = (entry.icon && ICONS[entry.icon]) || (kind === 'state' ? Activity : Map);
  const s = statusFromTone(entry.tone);
  const meta = STATUS[s];
  const cleanLabel = stripQuarter(stripPrefix(entry.title));

  return (
    <a
      href={`#milestone-${entry.id}`}
      className={`block rounded-lg border ${meta.cellBorder} ${meta.cellBg} px-2.5 py-2 hover:brightness-95 transition`}
    >
      <div className="flex items-start gap-1.5">
        <div className={`w-6 h-6 rounded-md grid place-items-center shrink-0 ${meta.dot} text-white`}>
          <Icon size={12} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] sm:text-xs font-semibold text-ink leading-tight line-clamp-2">
            {cleanLabel}
          </div>
          {s !== 'future' && (
            <div className={`mt-1 inline-flex items-center gap-1 px-1.5 py-px rounded-full text-[9px] font-bold ${meta.chip}`}>
              {meta.label}
            </div>
          )}
        </div>
      </div>
    </a>
  );
}

// ─── 3. Detail list — accordion cards under the timeline ─────────────────
function DetailList({ states, phases }: { states: Entry[]; phases: Entry[] }) {
  return (
    <SectionFrame
      icon={FileText}
      title="The detail"
      subtitle="Every milestone with the full plan, formula, and priority."
    >
      <div className="space-y-6">
        <DetailGroup title="Engine state — operational rollout" entries={states} kind="state" />
        <DetailGroup title="Capability roadmap — what we add next" entries={phases} kind="phase" />
      </div>
    </SectionFrame>
  );
}

function DetailGroup({ title, entries, kind }: { title: string; entries: Entry[]; kind: Track }) {
  if (entries.length === 0) return null;
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-label font-bold mb-2">{title}</div>
      <div className="space-y-2">
        {entries.map((e, i) => <DetailCard key={e.id} entry={e} index={i} kind={kind} />)}
      </div>
    </div>
  );
}

function DetailCard({ entry, index, kind }: { entry: Entry; index: number; kind: Track }) {
  const Icon = (entry.icon && ICONS[entry.icon]) || (kind === 'state' ? Activity : Map);
  const s = statusFromTone(entry.tone);
  const meta = STATUS[s];
  const defaultOpen = s === 'live' || s === 'building';
  const cleanTitle = stripPrefix(entry.title) || entry.title;
  const ordinal = `${kind === 'state' ? 'State' : 'Phase'} ${index + 1}`;

  return (
    <details
      id={`milestone-${entry.id}`}
      open={defaultOpen}
      className="group card overflow-hidden scroll-mt-24 transition-shadow open:shadow-lift"
    >
      <summary className="list-none cursor-pointer select-none px-5 py-4 flex items-start gap-4 hover:bg-bg/50 [&::-webkit-details-marker]:hidden [&::marker]:hidden">
        <div className={`w-10 h-10 rounded-lg ${meta.dot} text-white grid place-items-center shrink-0 shadow-card`}>
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] uppercase tracking-wider text-label font-semibold">{ordinal}</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${meta.chip}`}>
              {meta.label}
            </span>
          </div>
          <div className="mt-0.5 text-base font-semibold text-ink leading-tight">{cleanTitle}</div>
        </div>
        <ChevronDown size={18} className="text-mute shrink-0 mt-1 transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-5 pb-5 pl-[4.25rem] text-sm text-label leading-relaxed whitespace-pre-wrap border-t border-line pt-4">
        {entry.body}
      </div>
    </details>
  );
}

// ─── shared section frame ────────────────────────────────────────────────
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
