'use client';
import { useMemo } from 'react';
import {
  CheckCircle2, TrendingUp, Calculator, Crown, Trophy, Zap, Layers, Image as ImageIcon,
  Send, Bell, Users, GitBranch, Map, Sparkles, Anchor, Lightbulb, AlertCircle,
  Clock, Heart, Globe, Calendar, FileText, Languages, Award, Eye, Target,
  Activity, Compass, ChevronDown, type LucideIcon,
} from 'lucide-react';

// ─── icon registry ─────────────────────────────────────────────────────────
const ICONS: Record<string, LucideIcon> = {
  CheckCircle2, TrendingUp, Calculator, Crown, Trophy, Zap, Layers, Image: ImageIcon,
  Send, Bell, Users, GitBranch, Map, Sparkles, Anchor, Lightbulb, AlertCircle,
  Clock, Heart, Globe, Calendar, FileText, Languages, Award, Eye, Target,
  Activity, Compass,
};

// ─── status taxonomy (derived from `tone`) ─────────────────────────────────
type Status = 'live' | 'building' | 'next' | 'future';

const STATUS: Record<Status, { label: string; pill: string; dot: string; ring: string }> = {
  live:     { label: 'Now',      pill: 'bg-green/15 text-greenDark border-green/40', dot: 'bg-green', ring: 'ring-green/30' },
  building: { label: 'Building', pill: 'bg-amber/15 text-amber border-amber/40',     dot: 'bg-amber', ring: 'ring-amber/30' },
  next:     { label: 'Next',     pill: 'bg-navy/10 text-navy border-navy/30',        dot: 'bg-navy',  ring: 'ring-navy/20' },
  future:   { label: 'Planned',  pill: 'bg-bg text-label border-line',               dot: 'bg-mute',  ring: 'ring-line' },
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

function firstSentence(s: string): string {
  if (!s) return '';
  const m = s.match(/^[^\n]*?[\.\!\?](?=\s|$)/);
  if (m) return m[0].trim();
  const line = s.split(/\n/, 1)[0]?.trim() ?? '';
  return line.length > 200 ? line.slice(0, 197).trim() + '…' : line;
}

function stripPrefix(title: string): string {
  return title.replace(/^(?:State|Phase)\s+\d+\s*[—–\-:]?\s*/i, '').trim();
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
  const states = useMemo(() => entries.filter(e => /^State\s+\d/i.test(e.title)), [entries]);
  const phases = useMemo(() => entries.filter(e => /^Phase\s+\d/i.test(e.title)), [entries]);

  return (
    <div className="space-y-10">
      <Brief />
      <TrackSection
        kind="state"
        icon={Activity}
        title="Engine state"
        subtitle="Where the pricing engine is right now and how it ramps to steady state."
        entries={states}
      />
      <TrackSection
        kind="phase"
        icon={Map}
        title="Capability roadmap"
        subtitle="What we're adding to the engine through 2027+. Each phase is one strategic capability."
        entries={phases}
      />
    </div>
  );
}

// ─── Brief ─────────────────────────────────────────────────────────────────
function Brief() {
  return (
    <section className="rounded-2xl border border-line bg-greenSoft/30 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-green text-white grid place-items-center shrink-0 shadow-card">
          <Compass size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold text-ink">Pricing OS roadmap</div>
          <p className="text-sm text-label mt-1.5 leading-relaxed max-w-3xl">
            Two tracks. <strong className="text-ink">Engine state</strong> is how the existing
            pricing model rolls into steady operations through Q3 2026. <strong className="text-ink">Capability
            roadmap</strong> is what we add on top of that engine — quarter by quarter, through 2027+.
            The methodology formula stays constant; we keep stacking precision and new pricing models on top.
          </p>
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

// ─── Track section: stepper + accordion cards ──────────────────────────────
function TrackSection({
  kind, icon, title, subtitle, entries,
}: {
  kind: 'state' | 'phase';
  icon: LucideIcon;
  title: string;
  subtitle: string;
  entries: Entry[];
}) {
  if (entries.length === 0) {
    return (
      <SectionFrame icon={icon} title={title} subtitle={subtitle}>
        <div className="card card-p text-sm text-mute text-center">
          Nothing here yet — super admin can add entries in the Pricing OS console.
        </div>
      </SectionFrame>
    );
  }

  return (
    <SectionFrame icon={icon} title={title} subtitle={subtitle}>
      <Stepper entries={entries} kind={kind} />
      <div className="mt-5 space-y-3">
        {entries.map((e, i) => (
          <Accordion key={e.id} entry={e} index={i} total={entries.length} kind={kind} />
        ))}
      </div>
    </SectionFrame>
  );
}

function Stepper({ entries, kind }: { entries: Entry[]; kind: 'state' | 'phase' }) {
  return (
    <div className="card p-5 overflow-x-auto">
      <ol className="flex items-start min-w-max">
        {entries.map((e, i) => {
          const s = statusFromTone(e.tone);
          const meta = STATUS[s];
          const isLast = i === entries.length - 1;
          const label = stripPrefix(e.title) || `${kind === 'state' ? 'State' : 'Phase'} ${i + 1}`;
          return (
            <li key={e.id} className="flex items-start shrink-0">
              <a
                href={`#${kind}-${e.id}`}
                className="flex flex-col items-center text-center px-3 sm:px-4 group focus:outline-none focus:ring-2 focus:ring-green/40 rounded-md"
              >
                <span
                  className={`relative w-10 h-10 rounded-full grid place-items-center ring-4 ${meta.ring} ${meta.dot} text-white text-sm font-bold shadow-card transition-transform group-hover:scale-105`}
                  aria-label={`${kind} ${i + 1} — ${meta.label}`}
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

function Accordion({
  entry, index, total, kind,
}: { entry: Entry; index: number; total: number; kind: 'state' | 'phase' }) {
  const Icon = (entry.icon && ICONS[entry.icon]) || (kind === 'state' ? Activity : Map);
  const s = statusFromTone(entry.tone);
  const meta = STATUS[s];
  const defaultOpen = s === 'live' || s === 'building';
  const summary = firstSentence(entry.body);
  const cleanTitle = stripPrefix(entry.title) || entry.title;
  const ordinalLabel = `${kind === 'state' ? 'State' : 'Phase'} ${index + 1}`;

  return (
    <details
      id={`${kind}-${entry.id}`}
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
              {ordinalLabel}
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
