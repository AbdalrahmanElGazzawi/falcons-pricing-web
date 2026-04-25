'use client';
import {
  CheckCircle2, TrendingUp, Calculator, Crown, Trophy, Zap, Layers, Image,
  Send, Bell, Users, GitBranch, Map, Sparkles, Anchor, Lightbulb, AlertCircle,
  Clock, Heart, Globe, Calendar, FileText, Languages, Award, Eye, Target,
  Activity, Compass, type LucideIcon,
} from 'lucide-react';

// Lucide icon name → component map (only icons we actually use in roadmap entries)
const ICONS: Record<string, LucideIcon> = {
  CheckCircle2, TrendingUp, Calculator, Crown, Trophy, Zap, Layers, Image,
  Send, Bell, Users, GitBranch, Map, Sparkles, Anchor, Lightbulb, AlertCircle,
  Clock, Heart, Globe, Calendar, FileText, Languages, Award, Eye, Target,
  Activity, Compass,
};

type Entry = {
  id: number;
  title: string;
  body: string;
  icon: string | null;
  tone: string | null;
  sort_order: number;
};

export function RoadmapView({ entries }: { entries: Entry[] }) {
  // Phase entries (titles starting with 'Phase ') vs evolution entries (start with ⚙)
  const phases = entries.filter(e => /^Phase\s+\d/i.test(e.title));
  const evolution = entries.filter(e => !/^Phase\s+\d/i.test(e.title));

  return (
    <div className="space-y-8">
      {/* Phases — vertical timeline */}
      <section>
        <SectionTitle
          icon={Map}
          title="Phases"
          body="The big strategic moves. Each phase ships as a distinct unlock; assumptions are gated by which phase is live."
        />
        <div className="space-y-4">
          {phases.map((e, i) => (
            <PhaseCard key={e.id} entry={e} index={i} total={phases.length} />
          ))}
          {phases.length === 0 && (
            <div className="card card-p text-sm text-mute text-center">
              No phases yet — super admin can add them in the Pricing OS console.
            </div>
          )}
        </div>
      </section>

      {/* Evolution components — grid */}
      <section>
        <SectionTitle
          icon={Compass}
          title="Evolution components"
          body="Cross-cutting upgrades that unlock incrementally. Each one removes friction or expands what the engine can express."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {evolution.map(e => (
            <EvolutionCard key={e.id} entry={e} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="w-9 h-9 rounded-lg bg-greenSoft text-greenDark grid place-items-center mt-0.5">
        <Icon size={18} />
      </div>
      <div>
        <div className="text-base font-semibold text-ink leading-tight">{title}</div>
        <div className="text-xs text-label mt-1 max-w-2xl">{body}</div>
      </div>
    </div>
  );
}

function PhaseCard({ entry, index, total }: { entry: Entry; index: number; total: number }) {
  const Icon = (entry.icon && ICONS[entry.icon]) || Map;
  const tone = entry.tone ?? 'navy';
  const accent =
    tone === 'green' ? 'border-green/40 bg-greenSoft/40' :
    tone === 'amber' ? 'border-amber/40 bg-amber/5' :
    tone === 'red'   ? 'border-red-200 bg-red-50' :
                       'border-navy/20 bg-navy/[0.03]';
  const iconTone =
    tone === 'green' ? 'bg-green text-white' :
    tone === 'amber' ? 'bg-amber text-white' :
    tone === 'red'   ? 'bg-red-500 text-white' :
                       'bg-navy text-white';

  return (
    <div className="flex gap-4">
      {/* Timeline rail */}
      <div className="flex flex-col items-center pt-1 shrink-0">
        <div className={`w-9 h-9 rounded-lg grid place-items-center shadow-card ${iconTone}`}>
          <Icon size={18} />
        </div>
        {index < total - 1 && <div className="w-px flex-1 bg-line mt-1 mb-1" />}
      </div>

      {/* Content card */}
      <div className={`flex-1 rounded-xl border ${accent} p-5`}>
        <div className="text-base font-semibold text-ink leading-tight">{entry.title}</div>
        <div className="text-sm text-label mt-2 leading-relaxed whitespace-pre-wrap">{entry.body}</div>
      </div>
    </div>
  );
}

function EvolutionCard({ entry }: { entry: Entry }) {
  const Icon = (entry.icon && ICONS[entry.icon]) || Sparkles;
  const tone = entry.tone ?? 'navy';
  const iconTone =
    tone === 'green' ? 'bg-green/10 text-greenDark' :
    tone === 'amber' ? 'bg-amber/15 text-amber' :
    tone === 'red'   ? 'bg-red-50 text-red-700' :
                       'bg-navy/10 text-navy';
  return (
    <div className="card p-4">
      <div className="flex items-start gap-3 mb-2">
        <div className={`w-8 h-8 rounded-md grid place-items-center shrink-0 ${iconTone}`}>
          <Icon size={14} />
        </div>
        <div className="text-sm font-semibold text-ink leading-tight">{entry.title}</div>
      </div>
      <div className="text-xs text-label leading-relaxed whitespace-pre-wrap">{entry.body}</div>
    </div>
  );
}
