'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  CheckCircle2, TrendingUp, Calculator, Crown, Trophy, Zap, Layers, Image as ImageIcon,
  Send, Bell, Users, GitBranch, Map, Sparkles, Anchor, Lightbulb, AlertCircle,
  Clock, Heart, Globe, Calendar, FileText, Languages, Award, Eye, Target,
  Activity, Compass, ChevronDown, MapPin, Pencil, type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  CheckCircle2, TrendingUp, Calculator, Crown, Trophy, Zap, Layers, Image: ImageIcon,
  Send, Bell, Users, GitBranch, Map, Sparkles, Anchor, Lightbulb, AlertCircle,
  Clock, Heart, Globe, Calendar, FileText, Languages, Award, Eye, Target,
  Activity, Compass,
};

type Status = 'shipped' | 'live' | 'building' | 'next' | 'future';

const STATUS: Record<Status, { label: string; chip: string; cellLabel: string; rowAccent: string }> = {
  shipped:  { label: 'Shipped',  chip: 'bg-greenSoft text-greenDark border border-greenDark/30',                cellLabel: 'text-greenDark', rowAccent: 'border-l-4 border-l-greenDark/40' },
  live:     { label: 'Now',      chip: 'bg-green text-white',                 cellLabel: 'text-greenDark', rowAccent: 'border-l-4 border-l-green' },
  building: { label: 'Building', chip: 'bg-amber text-white',                 cellLabel: 'text-amber',     rowAccent: 'border-l-4 border-l-amber' },
  next:     { label: 'Up next',  chip: 'bg-navy text-white',                  cellLabel: 'text-navy',      rowAccent: 'border-l-4 border-l-navy' },
  future:   { label: 'Planned',  chip: 'bg-bg text-label border border-line', cellLabel: 'text-mute',      rowAccent: 'border-l-4 border-l-line' },
};

function statusFromTone(tone: string | null): Status {
  switch ((tone ?? '').toLowerCase()) {
    case 'shipped':
    case 'done':   return 'shipped';
    case 'green':  return 'live';
    case 'amber':  return 'building';
    case 'navy':   return 'next';
    default:       return 'future';
  }
}

// Title format: "State 1 — Q2 2026 · Methodology Engine Live"
//   prefix:   "State 1"
//   quarter:  "Q2 2026"
//   subject:  "Methodology Engine Live"
function parseTitle(title: string): { prefix: string; quarter: string; subject: string } {
  const m = title.match(/^((?:State|Phase)\s+\d+)\s*[—–\-:]?\s*(.*)$/i);
  const prefix  = (m?.[1] ?? '').trim();
  const rest    = (m?.[2] ?? title).trim();
  // Match: Q1 2026 / Q2 2026 etc / 2027 / 2027+ / Feb 2026 / Feb 15 2026 / March 2026 / In flight
  const q = rest.match(/^(Q[1-4]\s+\d{4}|\d{4}\+?|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December)(?:\s+\d{1,2})?\s+\d{4}|In\s+flight)\s*[·•—–\-]\s*(.+)$/i);
  if (q) return { prefix, quarter: q[1].trim(), subject: q[2].trim() };
  return { prefix, quarter: '', subject: rest };
}

type Entry = {
  id: number;
  title: string;
  body: string;
  icon: string | null;
  tone: string | null;
  sort_order: number;
};

export function RoadmapContent({ entries, canEdit }: { entries: Entry[]; canEdit: boolean }) {
  const states = useMemo(() => entries.filter(e => /^State\s+\d/i.test(e.title)), [entries]);
  const phases = useMemo(() => entries.filter(e => /^Phase\s+\d/i.test(e.title)), [entries]);
  const all    = useMemo(() => [...states, ...phases], [states, phases]);

  const live     = all.find(e => statusFromTone(e.tone) === 'live');
  const building = all.find(e => statusFromTone(e.tone) === 'building');
  const next     = all.find(e => statusFromTone(e.tone) === 'next' && e.id !== building?.id);

  return (
    <div className="space-y-8">
      {/* ─── Now / Building / Up next — at-a-glance hero ───────────────────── */}
      <NowNextHero live={live} building={building} next={next} />

      {/* ─── Engine state table ────────────────────────────────────────────── */}
      <RoadmapTable
        title="Engine state"
        subtitle="How the existing pricing model rolls into steady operations."
        rows={states}
        canEdit={canEdit}
      />

      {/* ─── Capability roadmap table ──────────────────────────────────────── */}
      <RoadmapTable
        title="Capability roadmap"
        subtitle="What we add to the engine, quarter by quarter, through 2027+."
        rows={phases}
        canEdit={canEdit}
      />
    </div>
  );
}

// ─── Hero: simple 3-card "now / building / up next" ───────────────────────
function NowNextHero({ live, building, next }: { live?: Entry; building?: Entry; next?: Entry }) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <HeroCard tone="live"     label="Now"      entry={live} />
      <HeroCard tone="building" label="Building" entry={building} />
      <HeroCard tone="next"     label="Up next"  entry={next} />
    </section>
  );
}

function HeroCard({ tone, label, entry }: { tone: Status; label: string; entry?: Entry }) {
  const meta = STATUS[tone];
  if (!entry) {
    return (
      <div className="card card-p opacity-60">
        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${meta.chip}`}>{label.toUpperCase()}</div>
        <div className="text-sm text-mute mt-2">—</div>
      </div>
    );
  }
  const { quarter, subject } = parseTitle(entry.title);
  const Icon = (entry.icon && ICONS[entry.icon]) || MapPin;
  return (
    <a
      href={`#milestone-${entry.id}`}
      className={`card card-p hover:shadow-lift transition group ${meta.rowAccent}`}
    >
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${meta.chip}`}>
          {label.toUpperCase()}
        </span>
        {quarter && <span className="text-[11px] text-mute font-semibold">{quarter}</span>}
      </div>
      <div className="mt-2 flex items-start gap-2">
        <Icon size={16} className={`${meta.cellLabel} mt-0.5 shrink-0`} />
        <div className="text-sm font-semibold text-ink leading-snug group-hover:underline">{subject}</div>
      </div>
    </a>
  );
}

// ─── The actual table ────────────────────────────────────────────────────
function RoadmapTable({
  title, subtitle, rows, canEdit,
}: {
  title: string; subtitle: string; rows: Entry[]; canEdit: boolean;
}) {
  if (rows.length === 0) {
    return (
      <SectionFrame title={title} subtitle={subtitle}>
        <div className="card card-p text-sm text-mute text-center">
          No entries yet. {canEdit && <Link href="/admin/pricing#roadmap" className="text-greenDark underline">Add some →</Link>}
        </div>
      </SectionFrame>
    );
  }

  return (
    <SectionFrame title={title} subtitle={subtitle}>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-label bg-bg">
                <th className="text-left px-4 py-2.5 font-semibold w-12">#</th>
                <th className="text-left px-4 py-2.5 font-semibold">Phase</th>
                <th className="text-left px-4 py-2.5 font-semibold w-32">Quarter</th>
                <th className="text-left px-4 py-2.5 font-semibold w-28">Status</th>
                <th className="w-12 px-2 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((entry, i) => (
                <RoadmapRow key={entry.id} entry={entry} index={i} canEdit={canEdit} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SectionFrame>
  );
}

function RoadmapRow({ entry, index, canEdit }: { entry: Entry; index: number; canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  const s = statusFromTone(entry.tone);
  const meta = STATUS[s];
  const { quarter, subject } = parseTitle(entry.title);
  const Icon = (entry.icon && ICONS[entry.icon]) || MapPin;
  const ord = index + 1;

  return (
    <>
      <tr
        id={`milestone-${entry.id}`}
        onClick={() => setOpen(o => !o)}
        className={`border-t border-line hover:bg-bg/40 cursor-pointer ${meta.rowAccent} scroll-mt-24`}
      >
        <td className="px-4 py-3 text-mute font-semibold tabular-nums">{ord}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-md grid place-items-center shrink-0 ${meta.chip}`}>
              <Icon size={14} />
            </div>
            <div className="font-semibold text-ink leading-tight">{subject}</div>
          </div>
        </td>
        <td className="px-4 py-3 text-label font-medium tabular-nums whitespace-nowrap">{quarter || '—'}</td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${meta.chip}`}>
            {meta.label}
          </span>
        </td>
        <td className="px-2 py-3 text-mute">
          <ChevronDown
            size={16}
            className={`transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </td>
      </tr>
      {open && (
        <tr className="border-t border-line bg-bg/30">
          <td />
          <td colSpan={3} className="px-4 py-4">
            <div className="text-sm text-label leading-relaxed whitespace-pre-wrap max-w-3xl">
              {entry.body}
            </div>
            {canEdit && (
              <div className="mt-3">
                <Link
                  href="/admin/pricing#roadmap"
                  onClick={e => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 text-xs text-greenDark hover:underline font-semibold"
                >
                  <Pencil size={12} /> Edit this phase
                </Link>
              </div>
            )}
          </td>
          <td />
        </tr>
      )}
    </>
  );
}

// ─── shared section frame ────────────────────────────────────────────────
function SectionFrame({
  title, subtitle, children,
}: {
  title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3">
        <div className="text-[11px] uppercase tracking-wider text-label font-bold">{title}</div>
        <div className="text-xs text-label mt-0.5 max-w-2xl">{subtitle}</div>
      </div>
      {children}
    </section>
  );
}
