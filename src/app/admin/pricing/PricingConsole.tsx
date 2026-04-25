'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import {
  TrendingUp, Users, Calendar, FileText, Languages, Award, Anchor,
  Lightbulb, AlertCircle, Calculator, Map, Plus, Trash2, Pencil, Check,
  X as XIcon, Save,
} from 'lucide-react';

type AxisOption = {
  id: number; axis_key: string; label: string; factor: number;
  rationale: string | null; sort_order: number; is_active: boolean;
};
type KB = {
  id: number; section: string; title: string; body: string;
  icon: string | null; tone: string | null; sort_order: number; is_active: boolean;
};
type Tier  = { id: number; code: string; label: string };
type Addon = { id: number; label: string; uplift_pct: number; is_active: boolean };

const AXIS_META: Record<string, { label: string; icon: any; description: string }> = {
  engagement:  { label: 'Engagement',     icon: TrendingUp, description: "Talent's last 90-day engagement rate. Best predictor of campaign ROI." },
  audience:    { label: 'Audience Quality', icon: Users,    description: "Audience composition and brand fit. MENA/Saudi commands a separate premium." },
  seasonality: { label: 'Seasonality',    icon: Calendar,   description: "Campaign window. Ramadan + Worlds = peak; off-season = discount." },
  content:     { label: 'Content Type',   icon: FileText,   description: 'Brand control level: Organic → Integrated → Sponsored.' },
  language:    { label: 'Language',       icon: Languages,  description: 'Bilingual = both audiences in one activation. Highest leverage.' },
  authority:   { label: 'Authority',      icon: Award,      description: 'Championship credentials. Multiplier scales with Objective Weight.' },
};

const SECTION_META: Record<string, { label: string; icon: any; description: string }> = {
  platform_logic: { label: 'Platform logic', icon: Anchor,        description: 'IG Reel is the price anchor. All other platform rates derive from a % of IG Reel using world best-practice ratios.' },
  best_practice:  { label: 'Best practice',  icon: Lightbulb,     description: 'Negotiation playbook drawn from the v1.5 methodology + industry benchmarks.' },
  guardrail:      { label: 'Guardrails',     icon: AlertCircle,   description: "Hard floors below which we don't go — and what to push to instead." },
  roadmap:        { label: 'Roadmap',        icon: Map,           description: "What's coming next — what we're building toward, what unlocks accuracy." },
  methodology:    { label: 'Methodology',    icon: Calculator,    description: 'Free-form internal notes on commercial principles.' },
};

const TONE_OPTIONS = ['green', 'amber', 'navy', 'red'];

export function PricingConsole({
  axisOptions: initialAxis, kb: initialKB, tiers, addons,
}: {
  axisOptions: AxisOption[]; kb: KB[]; tiers: Tier[]; addons: Addon[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [axisOptions, setAxisOptions] = useState<AxisOption[]>(initialAxis);
  const [kb, setKB] = useState<KB[]>(initialKB);

  // ── Group by axis_key / section
  const axisGroups = useMemo<Record<string, AxisOption[]>>(() => {
    const m: Record<string, AxisOption[]> = {};
    for (const o of axisOptions) {
      (m[o.axis_key] ||= []).push(o);
    }
    return m;
  }, [axisOptions]);

  const kbGroups = useMemo<Record<string, KB[]>>(() => {
    const m: Record<string, KB[]> = {};
    for (const k of kb) {
      (m[k.section] ||= []).push(k);
    }
    return m;
  }, [kb]);

  // ── CRUD helpers (axis options)
  async function patchAxisOption(id: number, body: Partial<AxisOption>) {
    const res = await fetch(`/api/admin/pricing/axis-options/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error('Save failed', j.error);
      return false;
    }
    setAxisOptions(xs => xs.map(o => o.id === id ? { ...o, ...body } as AxisOption : o));
    toast.success('Saved');
    return true;
  }
  async function deleteAxisOption(id: number) {
    if (!confirm('Delete this option? Its history stays in audit_log.')) return;
    const res = await fetch(`/api/admin/pricing/axis-options/${id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Delete failed'); return; }
    setAxisOptions(xs => xs.filter(o => o.id !== id));
    toast.success('Deleted');
  }
  async function addAxisOption(axis_key: string) {
    const list = axisGroups[axis_key] ?? [];
    const next = (list.length === 0 ? 1 : Math.max(...list.map(o => o.sort_order)) + 1);
    const body = { axis_key, label: 'New option', factor: 1.00, rationale: '', sort_order: next, is_active: true };
    const res = await fetch('/api/admin/pricing/axis-options', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) { toast.error('Create failed'); return; }
    const { id } = await res.json();
    setAxisOptions(xs => [...xs, { id, ...body } as AxisOption]);
    toast.success('Added — fill in label and factor');
  }

  // ── CRUD helpers (KB)
  async function patchKB(id: number, body: Partial<KB>) {
    const res = await fetch(`/api/admin/pricing/kb/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) { toast.error('Save failed'); return false; }
    setKB(xs => xs.map(k => k.id === id ? { ...k, ...body } as KB : k));
    toast.success('Saved');
    return true;
  }
  async function deleteKB(id: number) {
    if (!confirm('Delete this entry?')) return;
    const res = await fetch(`/api/admin/pricing/kb/${id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Delete failed'); return; }
    setKB(xs => xs.filter(k => k.id !== id));
    toast.success('Deleted');
  }
  async function addKB(section: string) {
    const list = kbGroups[section] ?? [];
    const next = (list.length === 0 ? 1 : Math.max(...list.map(k => k.sort_order)) + 1);
    const body = { section, title: 'New entry', body: 'Body…', tone: 'navy', icon: 'Lightbulb', sort_order: next, is_active: true };
    const res = await fetch('/api/admin/pricing/kb', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) { toast.error('Create failed'); return; }
    const { id } = await res.json();
    setKB(xs => [...xs, { id, ...body } as KB]);
    toast.success('Added — fill in title and body');
  }

  return (
    <div className="space-y-6">
      <CurrentlyLiveCard tiers={tiers} addons={addons} axisCount={axisOptions.length} kbCount={kb.length} />

      {/* AXES */}
      <div className="space-y-4">
        <SectionHeader
          icon={TrendingUp}
          title="Pricing axes — multipliers"
          body="The chips shown in step 4 of the wizard. Editing here changes the canonical source. (Engine still reads from MATRIX in PricingWizard.tsx today; live-wiring is on the roadmap below.)"
        />
        {Object.entries(AXIS_META).map(([key, meta]) => (
          <AxisCard
            key={key}
            axisKey={key}
            meta={meta}
            options={(axisGroups[key] ?? []).sort((a, b) => a.sort_order - b.sort_order)}
            onPatch={patchAxisOption}
            onDelete={deleteAxisOption}
            onAdd={() => addAxisOption(key)}
          />
        ))}
      </div>

      {/* KB sections */}
      {Object.entries(SECTION_META).map(([key, meta]) => (
        <KBSection
          key={key}
          sectionKey={key}
          meta={meta}
          entries={(kbGroups[key] ?? []).sort((a, b) => a.sort_order - b.sort_order)}
          onPatch={patchKB}
          onDelete={deleteKB}
          onAdd={() => addKB(key)}
        />
      ))}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
function CurrentlyLiveCard({ tiers, addons, axisCount, kbCount }: {
  tiers: Tier[]; addons: Addon[]; axisCount: number; kbCount: number;
}) {
  return (
    <div className="card card-p">
      <div className="text-base font-semibold text-ink mb-1">What's live right now</div>
      <div className="text-xs text-label mb-4">A snapshot of the data this console manages. Click each block to edit it.</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Tiers"          value={tiers.length}        sub="Roster classification"   href="/admin/tiers" />
        <Stat label="Add-ons"        value={addons.filter(a => a.is_active).length} sub={`${addons.length} total`} href="/admin/addons" />
        <Stat label="Axis options"   value={axisCount}           sub="Across 6 multiplier axes" />
        <Stat label="KB entries"     value={kbCount}             sub="Best practice, guardrails, roadmap" />
      </div>
    </div>
  );
}

function Stat({ label, value, sub, href }: { label: string; value: number | string; sub?: string; href?: string }) {
  const inner = (
    <div className="rounded-lg border border-line bg-bg/50 p-3 hover:border-mute transition">
      <div className="kpi-label">{label}</div>
      <div className="text-2xl font-bold text-ink mt-0.5 leading-none">{value}</div>
      {sub && <div className="text-[11px] text-mute mt-1">{sub}</div>}
    </div>
  );
  return href ? <a href={href} className="block">{inner}</a> : inner;
}

function SectionHeader({ icon: Icon, title, body }: { icon: any; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-greenSoft text-greenDark grid place-items-center mt-0.5"><Icon size={18} /></div>
      <div>
        <div className="text-base font-semibold text-ink leading-tight">{title}</div>
        <div className="text-xs text-label mt-1 max-w-2xl">{body}</div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
function AxisCard({ axisKey, meta, options, onPatch, onDelete, onAdd }: {
  axisKey: string;
  meta: { label: string; icon: any; description: string };
  options: AxisOption[];
  onPatch: (id: number, b: Partial<AxisOption>) => Promise<boolean>;
  onDelete: (id: number) => void;
  onAdd: () => void;
}) {
  const Icon = meta.icon;
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green/10 text-greenDark grid place-items-center"><Icon size={16} /></div>
          <div>
            <div className="text-sm font-semibold text-ink">{meta.label}</div>
            <div className="text-[11px] text-mute">{meta.description}</div>
          </div>
        </div>
        <button onClick={onAdd} className="btn btn-ghost text-xs"><Plus size={12} /> Add option</button>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table density-compact">
          <thead>
            <tr>
              <th>Label</th>
              <th className="w-28 text-right">Factor</th>
              <th>Rationale</th>
              <th className="w-20 text-right">Order</th>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody>
            {options.map(o => (
              <AxisRow key={o.id} option={o} onPatch={onPatch} onDelete={onDelete} />
            ))}
            {options.length === 0 && (
              <tr><td colSpan={5} className="text-center text-mute text-xs py-6">No options yet — click "Add option" above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AxisRow({ option, onPatch, onDelete }: {
  option: AxisOption;
  onPatch: (id: number, b: Partial<AxisOption>) => Promise<boolean>;
  onDelete: (id: number) => void;
}) {
  const [label, setLabel] = useState(option.label);
  const [factor, setFactor] = useState(option.factor);
  const [rationale, setRationale] = useState(option.rationale ?? '');
  const [sortOrder, setSortOrder] = useState(option.sort_order);

  const dirty = label !== option.label
    || factor !== option.factor
    || (rationale !== (option.rationale ?? ''))
    || sortOrder !== option.sort_order;

  async function save() {
    if (!dirty) return;
    await onPatch(option.id, { label, factor, rationale, sort_order: sortOrder });
  }

  return (
    <tr>
      <td>
        <input value={label} onChange={e => setLabel(e.target.value)} onBlur={save}
          className="input py-1 px-2 text-sm h-8 w-44" />
      </td>
      <td className="text-right">
        <input type="number" step="0.01" value={factor}
          onChange={e => setFactor(parseFloat(e.target.value) || 0)} onBlur={save}
          className="input py-1 px-2 text-sm h-8 w-24 text-right font-mono" />
      </td>
      <td>
        <input value={rationale} onChange={e => setRationale(e.target.value)} onBlur={save}
          placeholder="One-liner — why this option exists"
          className="input py-1 px-2 text-sm h-8 w-full" />
      </td>
      <td className="text-right">
        <input type="number" value={sortOrder}
          onChange={e => setSortOrder(parseInt(e.target.value) || 0)} onBlur={save}
          className="input py-1 px-2 text-sm h-8 w-16 text-right" />
      </td>
      <td className="text-right">
        <button onClick={() => onDelete(option.id)}
          className="text-mute hover:text-red-600 p-1.5"
          title="Delete"><Trash2 size={13} /></button>
      </td>
    </tr>
  );
}

// ───────────────────────────────────────────────────────────────────────────
function KBSection({ sectionKey, meta, entries, onPatch, onDelete, onAdd }: {
  sectionKey: string;
  meta: { label: string; icon: any; description: string };
  entries: KB[];
  onPatch: (id: number, b: Partial<KB>) => Promise<boolean>;
  onDelete: (id: number) => void;
  onAdd: () => void;
}) {
  const Icon = meta.icon;
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 grid place-items-center"><Icon size={16} /></div>
          <div>
            <div className="text-sm font-semibold text-ink">{meta.label}</div>
            <div className="text-[11px] text-mute">{meta.description}</div>
          </div>
        </div>
        <button onClick={onAdd} className="btn btn-ghost text-xs"><Plus size={12} /> Add entry</button>
      </div>

      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
        {entries.map(e => (
          <KBCard key={e.id} entry={e} onPatch={onPatch} onDelete={onDelete} />
        ))}
        {entries.length === 0 && (
          <div className="md:col-span-2 text-center text-mute text-xs py-8">No entries — click "Add entry".</div>
        )}
      </div>
    </div>
  );
}

function KBCard({ entry, onPatch, onDelete }: {
  entry: KB;
  onPatch: (id: number, b: Partial<KB>) => Promise<boolean>;
  onDelete: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(entry.title);
  const [body, setBody] = useState(entry.body);
  const [tone, setTone] = useState(entry.tone ?? 'navy');
  const [icon, setIcon] = useState(entry.icon ?? '');

  const toneClass =
    tone === 'green' ? 'border-green/30 bg-greenSoft/40' :
    tone === 'amber' ? 'border-amber/30 bg-amber/5' :
    tone === 'red'   ? 'border-red-200 bg-red-50' :
                       'border-navy/15 bg-navy/[0.03]';

  async function save() {
    const ok = await onPatch(entry.id, { title, body, tone, icon });
    if (ok) setEditing(false);
  }

  if (!editing) {
    return (
      <div className={`rounded-lg border ${toneClass} p-3.5 group relative`}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="text-sm font-semibold text-ink leading-tight">{entry.title}</div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
            <button onClick={() => setEditing(true)} className="text-mute hover:text-ink p-1" title="Edit"><Pencil size={12} /></button>
            <button onClick={() => onDelete(entry.id)} className="text-mute hover:text-red-600 p-1" title="Delete"><Trash2 size={12} /></button>
          </div>
        </div>
        <div className="text-xs text-label leading-relaxed whitespace-pre-wrap">{entry.body}</div>
        {(entry.tone || entry.icon) && (
          <div className="text-[10px] uppercase tracking-wider text-mute mt-2">
            {entry.icon && <span>{entry.icon}</span>}
            {entry.icon && entry.tone && <span> · </span>}
            {entry.tone && <span>{entry.tone}</span>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border-2 border-green bg-white p-3.5 space-y-2">
      <input value={title} onChange={e => setTitle(e.target.value)}
        placeholder="Title" className="input text-sm font-semibold" autoFocus />
      <textarea value={body} onChange={e => setBody(e.target.value)} rows={4}
        placeholder="Body" className="input text-xs resize-y" />
      <div className="flex items-center gap-2 flex-wrap">
        <input value={icon} onChange={e => setIcon(e.target.value)}
          placeholder="lucide icon name (e.g. Lightbulb)"
          className="input text-xs h-8 flex-1 min-w-[180px]" />
        <select value={tone} onChange={e => setTone(e.target.value)}
          className="input text-xs h-8 w-28">
          {TONE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={() => { setTitle(entry.title); setBody(entry.body); setTone(entry.tone ?? 'navy'); setIcon(entry.icon ?? ''); setEditing(false); }}
          className="btn btn-ghost text-xs"><XIcon size={12} /> Cancel</button>
        <button onClick={save} className="btn btn-primary text-xs"><Save size={12} /> Save</button>
      </div>
    </div>
  );
}
