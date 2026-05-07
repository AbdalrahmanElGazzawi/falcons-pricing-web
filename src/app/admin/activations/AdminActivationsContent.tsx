'use client';
import { useMemo, useState } from 'react';
import {
  Sparkles, Layers, Filter, Search, X, Calendar, ExternalLink,
  Trophy, Star, Users, Mic, Tv, Globe, Building, Hotel, Gamepad2,
} from 'lucide-react';
import {
  type Activation, type ActivationPillar, type ActivationCohort, type ActivationComplexity,
  PILLAR_LABEL, COHORT_LABEL, COMPLEXITY_LABEL, FALCONS_IPS, fmtSar,
} from '@/lib/activations';

const PILLAR_ICON: Record<ActivationPillar, typeof Sparkles> = {
  broadcast: Tv, stream: Mic, content: Layers, digital: Globe,
  facility: Building, event: Trophy, talent: Users, hospitality: Hotel,
  publisher: Gamepad2,
};

const PILLAR_TONE: Record<ActivationPillar, string> = {
  broadcast:   'bg-navy/8 text-navy',
  stream:      'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
  content:     'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  digital:     'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200',
  facility:    'bg-amber/20 text-amber',
  event:       'bg-gold/15 text-gold',
  talent:      'bg-greenSoft text-greenDark',
  hospitality: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-200',
  publisher:   'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
};

export function AdminActivationsContent({ initial }: { initial: Activation[] }) {
  const [search, setSearch]   = useState('');
  const [pillar, setPillar]   = useState<ActivationPillar | null>(null);
  const [cohort, setCohort]   = useState<ActivationCohort | null>(null);
  const [complexity, setComplexity] = useState<ActivationComplexity | null>(null);
  const [ipFilter, setIpFilter]     = useState<string | null>(null);
  const [openId, setOpenId]   = useState<string | null>(null);

  const canonical = initial.filter(a => a.kind === 'canonical');
  const library   = initial.filter(a => a.kind === 'library');

  const filtered = useMemo(() => {
    return library.filter(a => {
      if (pillar     && a.pillar     !== pillar)     return false;
      if (cohort     && !a.cohorts.includes(cohort)) return false;
      if (complexity && a.complexity !== complexity) return false;
      if (ipFilter   && a.falcons_ip !== ipFilter)   return false;
      if (search) {
        const q = search.toLowerCase();
        if (!a.name.toLowerCase().includes(q) && !(a.positioning ?? '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [library, pillar, cohort, complexity, ipFilter, search]);

  const open = openId ? initial.find(a => a.id === openId) : null;
  const ipSkuCounts = useMemo(() => {
    const m: Record<string, number> = {};
    initial.forEach(a => { if (a.falcons_ip) m[a.falcons_ip] = (m[a.falcons_ip] ?? 0) + 1; });
    return m;
  }, [initial]);

  const reset = () => {
    setSearch(''); setPillar(null); setCohort(null); setComplexity(null); setIpFilter(null);
  };
  const anyFilter = !!(search || pillar || cohort || complexity || ipFilter);

  return (
    <div className="space-y-5">

      {/* ─── KPI strip ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi label="Total SKUs"       value={initial.length} accent="green" icon={Layers} />
        <Kpi label="Canonical bundles" value={canonical.length} icon={Star} />
        <Kpi label="Library SKUs"      value={library.length} icon={Sparkles} />
        <Kpi label="Falcons IPs · slots" value={Object.values(ipSkuCounts).reduce((s, n) => s + n, 0)} accent="gold" icon={Trophy} />
      </div>

      {/* ─── Canonical bundles ────────────────────────────────────────── */}
      <section className="card card-p">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-greenSoft text-greenDark flex items-center justify-center flex-shrink-0">
            <Star size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-ink">The five canonical bundles</h2>
            <p className="text-sm text-label mt-0.5">Marquee SKUs · featured Tier-S models carry gold accents.</p>
          </div>
          <span className="ml-auto chip chip-mint">{canonical.length} SKUs</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {canonical.map(c => (
            <CanonicalCard key={c.id} a={c} onOpen={setOpenId} />
          ))}
        </div>
      </section>

      {/* ─── Falcons IPs ──────────────────────────────────────────────── */}
      <section className="card card-p">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-gold/15 text-gold flex items-center justify-center flex-shrink-0">
            <Trophy size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-ink">Sponsor a Falcons IP</h2>
            <p className="text-sm text-label mt-0.5">Eleven ownable properties — Podcast (~600K views/episode), Academy, Vega women&apos;s esports, Force junior team, plus 7 more. Recurring annual slots, category-exclusive at the top.</p>
          </div>
          <span className="ml-auto chip chip-gold">{FALCONS_IPS.length} IPs</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
          {FALCONS_IPS.map(ip => {
            const skus = ipSkuCounts[ip.id] ?? 0;
            const isOn = ipFilter === ip.id;
            return (
              <button
                key={ip.id}
                onClick={() => setIpFilter(isOn ? null : ip.id)}
                className={[
                  'card card-p text-left transition !p-3 hover:shadow-lift',
                  isOn ? 'ring-2 ring-gold' : '',
                ].join(' ')}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-md bg-gold/15 text-gold grid place-items-center font-bold text-[11px] tracking-wide">{ip.mono}</div>
                  <div className="font-semibold text-ink text-sm truncate">{ip.name}</div>
                </div>
                <div className="text-[11px] text-label leading-snug min-h-[28px]">{ip.format}</div>
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-line">
                  <span className="text-[10px] uppercase tracking-wider text-mute font-semibold">Slots</span>
                  <span className="text-[12px] font-bold text-greenDark tabular-nums">{skus} SKU{skus === 1 ? '' : 's'}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ─── Filter rail ──────────────────────────────────────────────── */}
      <section className="card !p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or positioning…"
              className="input !pl-9 !py-1.5 text-sm"
            />
          </div>
          <FilterGroup label="Pillar"
            options={Object.entries(PILLAR_LABEL).map(([k, v]) => ({ value: k, label: v }))}
            current={pillar}
            onChange={v => setPillar(v as ActivationPillar | null)}
          />
          <FilterGroup label="Cohort"
            options={Object.entries(COHORT_LABEL).map(([k, v]) => ({ value: k, label: v }))}
            current={cohort}
            onChange={v => setCohort(v as ActivationCohort | null)}
          />
          <FilterGroup label="Lift"
            options={Object.entries(COMPLEXITY_LABEL).map(([k, v]) => ({ value: k, label: v }))}
            current={complexity}
            onChange={v => setComplexity(v as ActivationComplexity | null)}
          />
          {anyFilter && (
            <button onClick={reset} className="btn btn-ghost !py-1.5 !px-3 text-xs">
              <X size={13} /> Reset
            </button>
          )}
        </div>
        <div className="mt-2 text-xs text-label flex items-center gap-2">
          <Filter size={12} className="text-mute" />
          <span>Showing <b className="text-greenDark tabular-nums">{filtered.length}</b> of {library.length} library SKUs</span>
          {ipFilter && <span className="chip chip-gold ml-2">IP: {FALCONS_IPS.find(i => i.id === ipFilter)?.name} <X size={11} className="cursor-pointer" onClick={() => setIpFilter(null)} /></span>}
        </div>
      </section>

      {/* ─── Library grid ─────────────────────────────────────────────── */}
      <section>
        {filtered.length === 0 ? (
          <div className="card card-p text-center text-sm text-label italic py-10 border-dashed">
            No SKUs match those filters. Try removing a chip or hit Reset.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(a => (
              <SkuCard key={a.id} a={a} onOpen={setOpenId} />
            ))}
          </div>
        )}
      </section>

      {/* ─── Detail drawer ────────────────────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-50 bg-navyDark/40 flex justify-end" onClick={() => setOpenId(null)}>
          <div className="bg-bg w-full max-w-2xl h-full overflow-y-auto shadow-lift" onClick={e => e.stopPropagation()}>
            <DetailPanel a={open} onClose={() => setOpenId(null)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── sub-components ───────────────────────────────────────────────────────

function Kpi({ label, value, accent, icon: Icon }: { label: string; value: number | string; accent?: 'green' | 'gold'; icon?: typeof Sparkles }) {
  const tone = accent === 'gold' ? 'text-gold border-l-gold' : accent === 'green' ? 'text-greenDark border-l-green' : 'text-ink border-l-line';
  return (
    <div className={['card card-p border-l-4', tone].join(' ')}>
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon size={13} className="text-mute" />}
        <div className="text-[10px] font-semibold uppercase tracking-wider text-label">{label}</div>
      </div>
      <div className="text-2xl font-extrabold tabular-nums">{value}</div>
    </div>
  );
}

function CanonicalCard({ a, onOpen }: { a: Activation; onOpen: (id: string) => void }) {
  const featured = a.is_featured;
  return (
    <button
      onClick={() => onOpen(a.id)}
      className={[
        'card card-p text-left transition relative overflow-hidden hover:shadow-lift',
        featured ? 'ring-1 ring-gold/40 bg-gradient-to-b from-gold/5 to-transparent' : '',
      ].join(' ')}
    >
      {featured && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold to-amber" />}
      <div className="flex items-start justify-between mb-2">
        <span className="font-mono text-[11px] tracking-widest text-greenDark font-semibold">№ {String(a.position).padStart(2, '0')}</span>
        {featured && <span className="chip chip-gold">Tier S</span>}
      </div>
      <div className="font-bold text-base text-ink leading-tight mb-1">{a.name}</div>
      <div className="text-[11px] text-label italic mb-3 line-clamp-2 min-h-[28px]">{a.archetype_text}</div>
      <div className="pt-3 border-t border-line">
        <div className="text-base font-extrabold text-greenDark tabular-nums">
          <span className="text-[10px] font-semibold tracking-wider text-mute uppercase mr-1">SAR</span>
          {fmtSar(a.price_floor_sar)}{a.price_ceiling_sar && ` — ${fmtSar(a.price_ceiling_sar)}`}
        </div>
        <div className="text-[11px] text-mute mt-0.5">{a.pricing_term}</div>
      </div>
    </button>
  );
}

function SkuCard({ a, onOpen }: { a: Activation; onOpen: (id: string) => void }) {
  const Icon = PILLAR_ICON[a.pillar];
  const ipName = a.falcons_ip ? FALCONS_IPS.find(i => i.id === a.falcons_ip)?.name : null;
  return (
    <button
      onClick={() => onOpen(a.id)}
      className="card card-p text-left transition hover:shadow-lift relative"
    >
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <span className={['chip text-[10px]', PILLAR_TONE[a.pillar]].join(' ')}>
          <Icon size={10} /> {PILLAR_LABEL[a.pillar]}
        </span>
        {a.cohorts.map(c => (
          <span key={c} className="chip chip-mint text-[10px]">{COHORT_LABEL[c]}</span>
        ))}
        <span className="chip chip-gold text-[10px]">{COMPLEXITY_LABEL[a.complexity]}</span>
        {ipName && <span className="chip text-[10px] bg-navy/8 text-navy border border-navy/15">{ipName}</span>}
      </div>
      <div className="font-semibold text-sm text-ink leading-snug mb-1">{a.name}</div>
      <div className="text-[12px] text-label leading-relaxed line-clamp-3 mb-3 min-h-[54px]">{a.positioning}</div>
      <div className="pt-3 border-t border-line flex items-end justify-between gap-2">
        <div>
          <div className="text-base font-extrabold text-greenDark tabular-nums leading-none">
            <span className="text-[9px] font-semibold tracking-wider text-mute uppercase mr-1">SAR</span>
            {fmtSar(a.price_floor_sar)}
          </div>
          <div className="text-[11px] text-mute mt-1">{a.pricing_term}</div>
        </div>
        <span className="text-[11px] font-semibold text-navy inline-flex items-center gap-1">
          View <ExternalLink size={11} />
        </span>
      </div>
    </button>
  );
}

function FilterGroup<T extends string>({
  label, options, current, onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  current: T | null;
  onChange: (v: T | null) => void;
}) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-[10px] uppercase tracking-wider text-label font-semibold mr-1">{label}</span>
      {options.map(o => {
        const isOn = current === o.value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(isOn ? null : o.value)}
            className={[
              'chip text-[11px] cursor-pointer transition border',
              isOn ? 'bg-navy text-white border-navy' : 'bg-white border-line text-ink hover:border-navy/40',
            ].join(' ')}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function DetailPanel({ a, onClose }: { a: Activation; onClose: () => void }) {
  const Icon = PILLAR_ICON[a.pillar];
  const ipName = a.falcons_ip ? FALCONS_IPS.find(i => i.id === a.falcons_ip)?.name : null;

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[11px] tracking-widest text-greenDark font-semibold">
              № {String(a.position).padStart(2, '0')} · {a.kind.toUpperCase()}
            </span>
            {a.is_featured && <span className="chip chip-gold">Featured · Tier S</span>}
          </div>
          <h3 className="text-2xl font-extrabold text-ink leading-tight">{a.name}</h3>
          {a.archetype_text && <p className="text-sm text-label italic mt-1">{a.archetype_text}</p>}
        </div>
        <button onClick={onClose} className="btn btn-ghost !p-2"><X size={16} /></button>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={['chip text-[11px]', PILLAR_TONE[a.pillar]].join(' ')}>
          <Icon size={11} /> {PILLAR_LABEL[a.pillar]}
        </span>
        {a.cohorts.map(c => (
          <span key={c} className="chip chip-mint">{COHORT_LABEL[c]}</span>
        ))}
        <span className="chip chip-gold">{COMPLEXITY_LABEL[a.complexity]}</span>
        {ipName && <span className="chip bg-navy/8 text-navy border border-navy/15">{ipName}</span>}
        {a.event_anchor.map(e => (
          <span key={e} className="chip chip-grey text-[11px]"><Calendar size={10} /> {e}</span>
        ))}
      </div>

      <div className="card card-p bg-gradient-to-br from-greenSoft/40 to-transparent border-l-4 border-l-green">
        <div className="text-[10px] uppercase tracking-wider text-greenDark font-semibold mb-1">Pricing</div>
        <div className="text-3xl font-extrabold text-greenDark tabular-nums">
          <span className="text-base font-semibold tracking-wider text-mute uppercase mr-2">SAR</span>
          {fmtSar(a.price_floor_sar)}{a.price_ceiling_sar && ` — ${fmtSar(a.price_ceiling_sar)}`}
        </div>
        <div className="text-sm text-label mt-1">{a.pricing_term}</div>
      </div>

      {a.positioning && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-label font-semibold mb-2">Positioning</div>
          <p className="text-sm text-ink leading-relaxed">{a.positioning}</p>
        </div>
      )}

      {a.includes.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-greenDark font-semibold mb-2">What&apos;s included</div>
          <ul className="space-y-2">
            {a.includes.map((it, i) => (
              <li key={i} className="text-sm text-ink leading-relaxed flex gap-2">
                <span className="text-green flex-shrink-0">✓</span>
                <span>{it.body}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {a.roi_projections.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-greenDark font-semibold mb-2">Projected ROI</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {a.roi_projections.map((r, i) => (
              <div key={i} className="card card-p !p-3">
                <div className="text-[10px] uppercase tracking-wider text-mute font-semibold">{r.label}</div>
                <div className="text-lg font-extrabold text-ink tabular-nums mt-0.5">
                  {r.value}{r.unit && <span className="text-xs text-label font-semibold ml-1">{r.unit}</span>}
                </div>
                {r.desc && <div className="text-[11px] text-label leading-snug mt-1">{r.desc}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {a.plug_and_play_assets.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-gold font-semibold mb-2">What you provide</div>
          <ul className="space-y-2">
            {a.plug_and_play_assets.map((p, i) => (
              <li key={i} className="card card-p !p-3 border-l-4 border-l-gold">
                <div className="text-sm font-semibold text-ink">{p.asset}</div>
                <div className="text-[11px] text-label mt-0.5">{p.spec}</div>
              </li>
            ))}
          </ul>
          {a.pnp_footer && (
            <div className="mt-3 text-[12px] text-label italic">{a.pnp_footer}</div>
          )}
        </div>
      )}

      <div className="pt-4 border-t border-line text-[11px] text-mute space-y-1">
        <div>Slug: <code className="font-mono text-[11px] bg-bg px-1.5 py-0.5 rounded">{a.slug}</code></div>
        <div>Status: <span className={['chip text-[10px]', a.status === 'active' ? 'chip-mint' : 'chip-grey'].join(' ')}>{a.status}</span></div>
        <div className="text-[11px] text-label italic mt-3">Editing UI lands in the next push — for now, all fields are editable via Supabase Studio or `/admin/activations/{a.slug}` (coming soon).</div>
      </div>
    </div>
  );
}
