'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Sparkles, Filter, X, ArrowRight, Star, Trophy, Users, Mic, Tv, Globe,
  Building, Hotel, Gamepad2, Layers, Calendar, ExternalLink, Mail,
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
  stream:      'bg-purple-100 text-purple-800',
  content:     'bg-blue-100 text-blue-800',
  digital:     'bg-slate-100 text-slate-700',
  facility:    'bg-amber/20 text-amber',
  event:       'bg-gold/15 text-gold',
  talent:      'bg-greenSoft text-greenDark',
  hospitality: 'bg-pink-100 text-pink-700',
  publisher:   'bg-rose-100 text-rose-700',
};

export function PublicActivationsContent({ activations }: { activations: Activation[] }) {
  const [pillar, setPillar]     = useState<ActivationPillar | null>(null);
  const [cohort, setCohort]     = useState<ActivationCohort | null>(null);
  const [complexity, setComplexity] = useState<ActivationComplexity | null>(null);
  const [ipFilter, setIpFilter] = useState<string | null>(null);

  const canonical = activations.filter(a => a.kind === 'canonical');
  const library   = activations.filter(a => a.kind === 'library');

  const filtered = useMemo(() => {
    return library.filter(a => {
      if (pillar     && a.pillar     !== pillar)     return false;
      if (cohort     && !a.cohorts.includes(cohort)) return false;
      if (complexity && a.complexity !== complexity) return false;
      if (ipFilter   && a.falcons_ip !== ipFilter)   return false;
      return true;
    });
  }, [library, pillar, cohort, complexity, ipFilter]);

  const ipSkuCounts = useMemo(() => {
    const m: Record<string, number> = {};
    activations.forEach(a => { if (a.falcons_ip) m[a.falcons_ip] = (m[a.falcons_ip] ?? 0) + 1; });
    return m;
  }, [activations]);

  const reset = () => { setPillar(null); setCohort(null); setComplexity(null); setIpFilter(null); };
  const anyFilter = !!(pillar || cohort || complexity || ipFilter);

  return (
    <div className="min-h-screen bg-bg">

      {/* ─── Top nav (minimal) ─────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-bg/85 backdrop-blur border-b border-line">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 h-16 flex items-center gap-6">
          <Link href="/activations" className="flex items-center gap-2.5 text-ink font-bold tracking-wide">
            <div className="w-8 h-8 rounded-md bg-gradient-to-b from-amber to-gold grid place-items-center text-navy text-sm">F</div>
            <span className="text-[13px] uppercase tracking-[0.14em]">Falcons<span className="text-gold ml-1 font-medium normal-case">Activations</span></span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Link href="#library" className="hidden sm:inline-flex btn btn-ghost !py-1.5 !px-3 text-xs">Browse library</Link>
            <Link href="mailto:abdghazzawi1@gmail.com?subject=Brand%20brief%20%E2%80%94%20Falcons%20Activations"
              className="btn btn-primary !py-1.5 !px-4 text-xs">
              Submit a brief <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-navy text-white">
        <div aria-hidden className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, #2ED06E 0%, transparent 70%)' }} />
        <div aria-hidden className="absolute -bottom-32 -left-32 w-[380px] h-[380px] rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #D4A514 0%, transparent 70%)' }} />
        <div aria-hidden className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        <div className="relative max-w-7xl mx-auto px-6 sm:px-8 py-16 sm:py-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur text-[11px] uppercase tracking-[0.18em] font-medium">
            <Sparkles size={13} /> Activations Catalogue · 2026
          </div>
          <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.04] tracking-tight max-w-4xl">
            Brand brings the brief. <span className="text-green">Falcons</span> brings the <span className="text-gold">machinery.</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-white/85 leading-relaxed max-w-2xl">
            Sixty-five productized brand activations across nine pillars. From a single Reel to a 12-month embedded partnership. Filter by who you want to reach, how hands-on you want to be, and which moment you&apos;re buying.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="mailto:abdghazzawi1@gmail.com?subject=Brand%20brief%20%E2%80%94%20Falcons%20Activations" className="btn btn-primary !py-2.5 !px-5">
              Submit a brief <ArrowRight size={16} className="-mr-1" />
            </Link>
            <Link href="#library" className="btn !py-2.5 !px-5 bg-white/10 hover:bg-white/15 text-white border border-white/20">
              Browse 65 SKUs
            </Link>
            <Link href="#ips" className="btn !py-2.5 !px-5 bg-gold hover:bg-gold/85 text-navy font-semibold">
              Sponsor a Falcons IP
            </Link>
          </div>

          {/* Hero stats */}
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl">
            <HeroStat value="9"   label="pillars" />
            <HeroStat value={String(activations.length)} label="activations" accent="green" />
            <HeroStat value="11"  label="Falcons IPs" accent="gold" />
            <HeroStat value="4×"  label="complexity tiers" />
          </div>
        </div>
      </section>

      {/* ─── Canonical bundles strip ───────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 py-12">
        <SectionHeader
          eyebrow="The five canonical models"
          title="Editorial centerpieces. Marquee weight."
          subtitle="Five fully-built activation models that anchor the catalogue. Each is the headline answer for a specific brand archetype."
          tone="green"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-6">
          {canonical.map(c => (
            <CanonicalCard key={c.id} a={c} />
          ))}
        </div>
      </section>

      {/* ─── Falcons IPs ──────────────────────────────────────────────── */}
      <section id="ips" className="max-w-7xl mx-auto px-6 sm:px-8 py-8">
        <SectionHeader
          eyebrow="Sponsor a Falcons IP"
          title="Eleven ownable properties."
          subtitle="From the Podcast (~600K views/episode) to Vega women's esports — every IP is a recurring annual slot, category-exclusive, defensible at renewal."
          tone="gold"
        />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 mt-6">
          {FALCONS_IPS.map(ip => {
            const skus = ipSkuCounts[ip.id] ?? 0;
            const isOn = ipFilter === ip.id;
            return (
              <button
                key={ip.id}
                onClick={() => setIpFilter(isOn ? null : ip.id)}
                className={[
                  'card card-p text-left transition !p-3 hover:shadow-lift cursor-pointer',
                  isOn ? 'ring-2 ring-gold' : '',
                ].join(' ')}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-md bg-gold/15 text-gold grid place-items-center font-bold text-[11px] tracking-wide">{ip.mono}</div>
                  <div className="font-semibold text-ink text-[13px] truncate">{ip.name}</div>
                </div>
                <div className="text-[11px] text-label leading-snug min-h-[28px]">{ip.format}</div>
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-line">
                  <span className="text-[10px] uppercase tracking-wider text-mute font-semibold">Slots</span>
                  <span className="text-[12px] font-bold text-greenDark tabular-nums">{skus}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ─── Filter rail (sticky-ish above library) ────────────────────── */}
      <section id="library" className="max-w-7xl mx-auto px-6 sm:px-8 pt-8 pb-6">
        <SectionHeader
          eyebrow="The full library"
          title="Sixty-five activations. Filter to your fit."
          subtitle="Slice by cohort, complexity tier, or pillar. Click any SKU to see what's included, who delivers it, and what we charge."
          tone="navy"
        />
        <div className="card !p-3 mt-5">
          <div className="flex items-center gap-2 flex-wrap">
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
              gold
            />
            {anyFilter && (
              <button onClick={reset} className="btn btn-ghost !py-1.5 !px-3 text-xs ml-1">
                <X size={13} /> Reset
              </button>
            )}
          </div>
          <div className="mt-2 text-xs text-label flex items-center gap-2">
            <Filter size={12} className="text-mute" />
            <span>Showing <b className="text-greenDark tabular-nums">{filtered.length}</b> of {library.length} library SKUs</span>
            {ipFilter && (
              <span className="chip chip-gold ml-2">
                IP: {FALCONS_IPS.find(i => i.id === ipFilter)?.name}
                <X size={11} className="cursor-pointer" onClick={() => setIpFilter(null)} />
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ─── Library grid ─────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 pb-12">
        {filtered.length === 0 ? (
          <div className="card card-p text-center text-sm text-label italic py-10 border-dashed">
            No SKUs match those filters. Try removing a chip or hit Reset.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(a => (
              <SkuCard key={a.id} a={a} />
            ))}
          </div>
        )}
      </section>

      {/* ─── Methodology / footer CTA ──────────────────────────────────── */}
      <section className="bg-navy text-white relative overflow-hidden">
        <div aria-hidden className="absolute -top-24 right-1/4 w-72 h-72 rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(circle, #D4A514 0%, transparent 70%)' }} />
        <div className="relative max-w-7xl mx-auto px-6 sm:px-8 py-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur text-[11px] uppercase tracking-[0.18em] font-medium text-gold">
            <Sparkles size={13} /> The methodology
          </div>
          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight max-w-3xl">
            The lower the lift, the higher the <span className="text-gold">margin</span>.
          </h2>
          <p className="mt-4 text-white/80 leading-relaxed max-w-2xl">
            The catalogue is ranked not by price but by how much each activation runs without us. Embedded Partnerships and IP slots are the highest margin because once setup ships, the marginal cost of a 14th brand showing up in B-roll or a podcast read is effectively zero. Plug & Play SKUs are the entry door — high frequency, low friction, predictable. Brands who understand this scale spend with us next year.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="mailto:abdghazzawi1@gmail.com?subject=Brand%20brief%20%E2%80%94%20Falcons%20Activations" className="btn !py-2.5 !px-5 bg-gold hover:bg-gold/85 text-navy font-semibold">
              <Mail size={15} /> Submit a brief
            </Link>
            <Link href="/about" className="btn !py-2.5 !px-5 bg-white/10 hover:bg-white/15 text-white border border-white/20">
              How we price talent
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-navyDark text-white/55 text-[12px] py-6">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-b from-amber to-gold grid place-items-center text-navy text-[10px] font-bold">F</div>
            <span className="font-semibold tracking-[0.14em] text-[11px] uppercase text-white">Team Falcons · Activations</span>
          </div>
          <div>Confidential — 2026 catalogue · numbers re-derive from DB at session start</div>
        </div>
      </footer>
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────

function HeroStat({ value, label, accent }: { value: string; label: string; accent?: 'green' | 'gold' }) {
  const v = accent === 'green' ? 'text-green' : accent === 'gold' ? 'text-gold' : 'text-white';
  return (
    <div className="rounded-xl border border-white/15 bg-white/5 backdrop-blur px-4 py-3">
      <div className={['text-2xl sm:text-3xl font-extrabold tabular-nums leading-none', v].join(' ')}>{value}</div>
      <div className="text-[11px] uppercase tracking-[0.14em] text-white/65 mt-1.5">{label}</div>
    </div>
  );
}

function SectionHeader({
  eyebrow, title, subtitle, tone,
}: { eyebrow: string; title: string; subtitle?: string; tone: 'green' | 'gold' | 'navy' }) {
  const ic = tone === 'gold' ? 'bg-gold/15 text-gold' : tone === 'navy' ? 'bg-navy/8 text-navy' : 'bg-greenSoft text-greenDark';
  return (
    <div className="flex items-start gap-3">
      <div className={['w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', ic].join(' ')}>
        <Sparkles size={19} />
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-label font-semibold">{eyebrow}</div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-ink leading-tight tracking-tight mt-1">{title}</h2>
        {subtitle && <p className="text-sm text-label mt-2 max-w-2xl leading-relaxed">{subtitle}</p>}
      </div>
    </div>
  );
}

function CanonicalCard({ a }: { a: Activation }) {
  return (
    <Link href={`#sku-${a.slug}`} className={[
      'card card-p block transition relative overflow-hidden hover:shadow-lift',
      a.is_featured ? 'ring-1 ring-gold/40 bg-gradient-to-b from-gold/5 to-transparent' : '',
    ].join(' ')}>
      {a.is_featured && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold to-amber" />}
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[11px] tracking-widest text-greenDark font-semibold">№ {String(a.position).padStart(2, '0')}</span>
        {a.is_featured && <span className="chip chip-gold">Tier S</span>}
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
    </Link>
  );
}

function SkuCard({ a }: { a: Activation }) {
  const Icon = PILLAR_ICON[a.pillar];
  const ipName = a.falcons_ip ? FALCONS_IPS.find(i => i.id === a.falcons_ip)?.name : null;
  return (
    <div id={`sku-${a.slug}`} className="card card-p hover:shadow-lift transition relative">
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <span className={['chip text-[10px]', PILLAR_TONE[a.pillar]].join(' ')}>
          <Icon size={10} /> {PILLAR_LABEL[a.pillar]}
        </span>
        {a.cohorts.map(c => (
          <span key={c} className="chip chip-mint text-[10px]">{COHORT_LABEL[c]}</span>
        ))}
        <span className="chip chip-gold text-[10px]">{COMPLEXITY_LABEL[a.complexity]}</span>
        {ipName && <span className="chip text-[10px] bg-navy/8 text-navy border border-navy/15 font-semibold">{ipName}</span>}
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
        <Link href="mailto:abdghazzawi1@gmail.com?subject=Brand%20brief%20%E2%80%94%20Falcons%20Activations" className="btn btn-ghost !py-1.5 !px-3 text-[11px]">
          Brief us <ExternalLink size={11} />
        </Link>
      </div>
    </div>
  );
}

function FilterGroup<T extends string>({
  label, options, current, onChange, gold,
}: {
  label: string;
  options: { value: T; label: string }[];
  current: T | null;
  onChange: (v: T | null) => void;
  gold?: boolean;
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
              isOn
                ? gold ? 'bg-gold text-navy border-gold' : 'bg-navy text-white border-navy'
                : 'bg-white border-line text-ink hover:border-navy/40',
            ].join(' ')}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
