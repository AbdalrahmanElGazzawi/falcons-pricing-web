'use client';
import { useMemo, useState } from 'react';
import {
  Trophy, Users, Sparkles, Search, X as XIcon, ShieldCheck,
  Crown, Flame, MapPin, Zap, Eye, EyeOff, ArrowUpRight,
} from 'lucide-react';
import { Avatar } from '@/components/Avatar';

type Player = {
  id: number; nickname: string; full_name: string | null;
  role: string | null; game: string | null; team: string | null;
  nationality: string | null; tier_code: string | null;
  avatar_url: string | null;
  rate_ig_reel: number; rate_irl: number;
  authority_factor: number | null; measurement_confidence: string | null;
  followers_ig: number | null; followers_twitch: number | null; followers_yt: number | null;
  followers_tiktok: number | null; followers_x: number | null; followers_fb: number | null; followers_snap: number | null;
  instagram: string | null; twitch: string | null; youtube: string | null; tiktok: string | null; x_handle: string | null;
};
type Creator = { id: number; nickname: string; tier_code: string | null; rate_ig_reels: number; rate_yt_full: number };

// Hardcoded championship signals — until we have a proper achievements table,
// flag the names we know from public records so cards earn a "Champion" badge.
const M5_CHAMPIONS = new Set(['FlapTzy', 'Hadji', 'Owgwen', 'KyleTzy', 'Super Marco', 'Ferdz']);
const MAJOR_WINNERS = new Set([
  'NiKo', 'm0NESY',                           // CS2 Major MVPs
  'Vejrgang',                                  // EAFC eWorld Cup champ
  'Msdossary',                                 // FIFA eWorld Cup champ (KSA pride)
  'Clayster',                                  // Multi-time CDL champion
  'TGLTN',                                     // PUBG GLL Grand Slam
  'Hikaru Nakamura',                           // World #2 Chess
  'Alireza Firouzja',                          // World #5 Chess
]);

function maxReach(p: Player): number {
  return Math.max(
    p.followers_ig || 0, p.followers_twitch || 0, p.followers_yt || 0,
    p.followers_tiktok || 0, p.followers_x || 0, p.followers_fb || 0, p.followers_snap || 0,
  );
}
function totalReach(p: Player): number {
  return (p.followers_ig || 0) + (p.followers_twitch || 0) + (p.followers_yt || 0) +
         (p.followers_tiktok || 0) + (p.followers_x || 0) + (p.followers_fb || 0) + (p.followers_snap || 0);
}
function fmtReach(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

const TIER_STYLES: Record<string, { ring: string; chip: string; gradient: string; label: string }> = {
  'Tier S': {
    ring: 'ring-2 ring-gold/60 shadow-[0_0_24px_-8px_rgba(212,165,20,0.5)]',
    chip: 'bg-gold/15 text-gold border-gold/40',
    gradient: 'from-gold/20 via-gold/5 to-transparent',
    label: 'Global Anchor',
  },
  'Tier 1': {
    ring: 'ring-1 ring-greenDark/40',
    chip: 'bg-greenSoft text-greenDark border-greenDark/40',
    gradient: 'from-green/15 via-green/5 to-transparent',
    label: 'Premium Pro',
  },
  'Tier 2': {
    ring: 'ring-1 ring-navy/30',
    chip: 'bg-navy/10 text-navy border-navy/30',
    gradient: 'from-navy/10 via-navy/5 to-transparent',
    label: 'Active Pro',
  },
  'Tier 3': {
    ring: 'ring-1 ring-line',
    chip: 'bg-bg text-label border-line',
    gradient: 'from-bg via-bg to-transparent',
    label: 'Rising',
  },
  'Tier 4': {
    ring: 'ring-1 ring-line',
    chip: 'bg-bg text-label border-line',
    gradient: 'from-bg via-bg to-transparent',
    label: 'Entry / Staff',
  },
};

export function ShowcaseContent({ players, creators }: { players: Player[]; creators: Creator[] }) {
  const [tab, setTab] = useState<'players' | 'creators'>('players');
  const [q, setQ] = useState('');
  const [tier, setTier] = useState('');
  const [game, setGame] = useState('');
  const [region, setRegion] = useState('');
  const [championOnly, setChampionOnly] = useState(false);
  const [showRates, setShowRates] = useState(false);
  const [sort, setSort] = useState<'reach' | 'tier'>('reach');

  const games = useMemo(() => Array.from(new Set(players.map(p => p.game).filter(Boolean))).sort() as string[], [players]);

  const regionOf = (nat: string | null | undefined): string => {
    const n = (nat ?? '').toLowerCase().trim();
    if (n.startsWith('saudi')) return 'KSA';
    if (['emirati','bahraini','kuwaiti','qatari','omani'].includes(n)) return 'GCC';
    if (['filipino','indonesian','vietnamese','thai','malaysian','singaporean'].includes(n)) return 'SEA';
    if (['egyptian','jordanian','lebanese','tunisian','moroccan','algerian','iraqi','syrian'].includes(n)) return 'MENA';
    if (['american','canadian','british','french','german','danish','swedish','norwegian','dutch','spanish','italian','finnish','irish','polish'].includes(n)) return 'NA / EU';
    if (['korean','chinese','japanese','taiwanese'].includes(n)) return 'East Asia';
    return 'Other';
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    let list = players.filter(p => {
      if (tier && p.tier_code !== tier) return false;
      if (game && p.game !== game) return false;
      if (region && regionOf(p.nationality) !== region) return false;
      if (championOnly) {
        const isChamp = M5_CHAMPIONS.has(p.nickname) || MAJOR_WINNERS.has(p.nickname) || p.tier_code === 'Tier S';
        if (!isChamp) return false;
      }
      if (s) {
        const fields = [p.nickname, p.full_name, p.team, p.game, p.nationality, p.role];
        if (!fields.filter(Boolean).some(v => v!.toLowerCase().includes(s))) return false;
      }
      return true;
    });

    if (sort === 'reach') {
      list = list.sort((a, b) => maxReach(b) - maxReach(a));
    } else {
      const order: Record<string, number> = { 'Tier S': 0, 'Tier 1': 1, 'Tier 2': 2, 'Tier 3': 3, 'Tier 4': 4 };
      list = list.sort((a, b) => (order[a.tier_code || ''] ?? 9) - (order[b.tier_code || ''] ?? 9) || maxReach(b) - maxReach(a));
    }
    return list;
  }, [players, q, tier, game, region, championOnly, sort]);

  // Org-level stats for the hero
  const stats = useMemo(() => {
    const totalCombined = players.reduce((s, p) => s + totalReach(p), 0);
    const ts = players.filter(p => p.tier_code === 'Tier S').length;
    const champs = players.filter(p => M5_CHAMPIONS.has(p.nickname) || MAJOR_WINNERS.has(p.nickname)).length;
    return { totalCombined, talentCount: players.length, tierS: ts, champions: champs, gamesCount: games.length };
  }, [players, games]);

  const distinctTiers = useMemo(
    () => Array.from(new Set(players.map(p => p.tier_code).filter(Boolean)))
            .sort((a, b) => {
              const order: Record<string, number> = { 'Tier S': 0, 'Tier 1': 1, 'Tier 2': 2, 'Tier 3': 3, 'Tier 4': 4 };
              return (order[a as string] ?? 9) - (order[b as string] ?? 9);
            }) as string[],
    [players],
  );

  return (
    <div className="space-y-8 -mx-4 sm:-mx-6 lg:-mx-8 -mt-2 pb-12">
      {/* ─── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy via-navy to-greenDark text-white px-6 sm:px-10 py-12 sm:py-16">
        <div aria-hidden className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, #2ED06E 0%, transparent 70%)' }} />
        <div aria-hidden className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(circle, #D4A514 0%, transparent 70%)' }} />

        <div className="relative max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur text-xs uppercase tracking-wider font-bold">
            <Trophy size={14} /> Team Falcons Roster
          </div>
          <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight">
            One roster.<br/>
            Every game that matters.<br/>
            <span className="text-gold">Championships across the board.</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-white/80 max-w-2xl">
            From Saudi homegrown stars to global anchors — Falcons fields top-tier talent across {stats.gamesCount}+ disciplines.
            Filter by game, region, tier, or championship credentials. Every rate is data-driven and engine-locked.
          </p>
        </div>

        {/* Big stats strip */}
        <div className="relative mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl">
          {[
            { label: 'Active talent',         value: stats.talentCount.toString(),                                        sub: 'Players + influencers + staff' },
            { label: 'Combined reach',        value: fmtReach(stats.totalCombined),                                       sub: 'Across IG · TikTok · YT · Twitch · X · FB' },
            { label: 'Global anchors',        value: stats.tierS.toString(),                                              sub: 'Tier S · 1M+ reach' },
            { label: 'Championship-decorated',value: stats.champions.toString(),                                          sub: 'M5 · EWC · CS Major · CDL · World #2' },
          ].map(s => (
            <div key={s.label} className="rounded-xl bg-white/10 backdrop-blur border border-white/20 px-4 py-4">
              <div className="text-[10px] uppercase tracking-wider font-bold text-white/70">{s.label}</div>
              <div className="text-3xl sm:text-4xl font-extrabold mt-1 tabular-nums">{s.value}</div>
              <div className="text-[11px] text-white/70 mt-1">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Tab strip ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-line overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        {(['players','creators'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={[
              'relative px-5 py-3 text-sm font-semibold transition flex items-center gap-2',
              tab === t ? 'text-ink' : 'text-mute hover:text-ink',
            ].join(' ')}>
            {t === 'players' ? <Users size={16} /> : <Sparkles size={16} />}
            <span className="capitalize">{t}</span>
            <span className={['px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums',
              tab === t ? 'bg-green text-white' : 'bg-bg text-mute'].join(' ')}>
              {t === 'players' ? players.length : creators.length}
            </span>
            {tab === t && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-gradient-to-r from-green via-greenDark to-green rounded-full" />}
          </button>
        ))}
      </div>

      {tab === 'players' && (
        <>
          {/* ─── Filter bar ─────────────────────────────────────────────── */}
          <div className="card card-p sticky top-0 z-10 -mx-1 sm:mx-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[180px] max-w-[280px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute pointer-events-none" />
                <input
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Search talent, game, team…"
                  className="input pl-9 text-sm"
                />
                {q && (
                  <button onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-mute hover:text-ink">
                    <XIcon size={14} />
                  </button>
                )}
              </div>
              <select value={tier} onChange={e => setTier(e.target.value)} className="input text-sm max-w-[140px]">
                <option value="">All tiers</option>
                {distinctTiers.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={game} onChange={e => setGame(e.target.value)} className="input text-sm max-w-[200px]">
                <option value="">All games</option>
                {games.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <select value={region} onChange={e => setRegion(e.target.value)} className="input text-sm max-w-[160px]">
                <option value="">All regions</option>
                <option value="KSA">KSA</option>
                <option value="GCC">GCC</option>
                <option value="MENA">MENA broader</option>
                <option value="SEA">SEA</option>
                <option value="NA / EU">NA / EU</option>
                <option value="East Asia">East Asia</option>
              </select>
              <button
                onClick={() => setChampionOnly(v => !v)}
                aria-pressed={championOnly}
                className={[
                  'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold transition',
                  championOnly
                    ? 'bg-gold text-white border-gold'
                    : 'bg-white text-label border-line hover:border-gold hover:text-gold',
                ].join(' ')}
                title="Show only championship-decorated talent"
              >
                <Crown size={12} /> Champions only
              </button>
              <select value={sort} onChange={e => setSort(e.target.value as any)} className="input text-sm max-w-[140px]">
                <option value="reach">Sort: Reach</option>
                <option value="tier">Sort: Tier</option>
              </select>

              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => setShowRates(v => !v)}
                  className={[
                    'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition',
                    showRates ? 'bg-greenSoft text-greenDark border-green/40' : 'bg-white text-mute border-line hover:text-ink',
                  ].join(' ')}
                  title={showRates ? 'Hide rates (pitch mode)' : 'Show rates (internal)'}
                >
                  {showRates ? <Eye size={12} /> : <EyeOff size={12} />}
                  {showRates ? 'Rates ON' : 'Pitch mode'}
                </button>
                <span className="text-xs text-label tabular-nums whitespace-nowrap">
                  {filtered.length} of {players.length}
                </span>
              </div>
            </div>
          </div>

          {/* ─── Talent grid ────────────────────────────────────────────── */}
          {filtered.length === 0 ? (
            <div className="card card-p text-center py-16">
              <div className="text-mute mb-2"><Users size={40} className="mx-auto opacity-50" /></div>
              <div className="text-lg font-semibold text-ink">No talent matches</div>
              <div className="text-sm text-mute mt-1">Try clearing filters or broadening the search.</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(p => {
                const peak = maxReach(p);
                const total = totalReach(p);
                const tierStyle = TIER_STYLES[p.tier_code || ''] ?? TIER_STYLES['Tier 3'];
                const isChamp = M5_CHAMPIONS.has(p.nickname) || MAJOR_WINNERS.has(p.nickname);
                const isLocked = p.measurement_confidence === 'exact';
                const isSaudi = (p.nationality || '').toLowerCase().startsWith('saudi');
                return (
                  <div
                    key={p.id}
                    className={[
                      'group relative rounded-2xl bg-white border border-line overflow-hidden transition-all hover:shadow-lift hover:-translate-y-0.5',
                      tierStyle.ring,
                    ].join(' ')}
                  >
                    {/* Tier-tinted gradient accent at the top */}
                    <div className={`h-20 bg-gradient-to-br ${tierStyle.gradient} relative`}>
                      <div className="absolute inset-x-0 bottom-0 h-px bg-line" />
                      {/* Tier label at top-right */}
                      {p.tier_code && (
                        <div className="absolute top-3 right-3 flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${tierStyle.chip}`}>
                            {p.tier_code}
                          </span>
                          {isLocked && (
                            <span title="Verified data" className="px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-green/15 text-greenDark border border-green/30 inline-flex items-center gap-1">
                              <ShieldCheck size={9} /> Verified
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="px-5 pb-5 -mt-10 relative">
                      <Avatar src={p.avatar_url} name={p.nickname} size="lg" />

                      <div className="mt-3 flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-bold text-ink text-lg truncate">{p.nickname}</h3>
                            {isChamp && (
                              <span title="Championship-decorated" className="inline-flex items-center gap-1 px-1.5 py-0 rounded-full text-[9px] font-bold uppercase tracking-wider bg-gold/15 text-gold border border-gold/40">
                                <Crown size={9} /> Champion
                              </span>
                            )}
                            {isSaudi && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0 rounded-full text-[9px] font-bold uppercase tracking-wider bg-green/10 text-greenDark border border-green/30">
                                KSA
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-mute mt-0.5 truncate">{p.full_name}</div>
                          <div className="text-xs text-label mt-1.5 flex items-center gap-1.5 flex-wrap">
                            {p.role && <span className="font-medium">{p.role}</span>}
                            {p.game && <><span className="text-mute">·</span><span className="truncate">{p.game}</span></>}
                          </div>
                          {p.team && (
                            <div className="text-[11px] text-mute mt-0.5 truncate">{p.team}</div>
                          )}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="mt-4 pt-4 border-t border-line space-y-2.5">
                        {peak > 0 ? (
                          <div className="flex items-end justify-between gap-2">
                            <div>
                              <div className="text-[10px] uppercase tracking-wider text-mute font-bold">Peak reach</div>
                              <div className="text-2xl font-extrabold text-ink tabular-nums leading-none">
                                {fmtReach(peak)}
                              </div>
                            </div>
                            {total > peak * 1.2 && (
                              <div className="text-right">
                                <div className="text-[10px] uppercase tracking-wider text-mute font-bold">Combined</div>
                                <div className="text-sm font-bold text-greenDark tabular-nums">
                                  {fmtReach(total)}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <div className="text-[10px] uppercase tracking-wider text-mute font-bold">Tier baseline</div>
                            <div className="text-base font-bold text-label">{tierStyle.label}</div>
                          </div>
                        )}

                        {showRates && p.rate_ig_reel > 0 && (
                          <div className="flex items-center justify-between pt-2 border-t border-dashed border-line">
                            <div className="text-[10px] uppercase tracking-wider text-mute font-bold">Starts from</div>
                            <div className="text-sm font-bold text-greenDark tabular-nums">
                              SAR {p.rate_ig_reel.toLocaleString('en-US')}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'creators' && (
        <div className="card card-p">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-gold/15 text-gold flex items-center justify-center flex-shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-ink">Lifestyle &amp; gaming creators</h2>
              <p className="text-sm text-label mt-0.5">
                Premium-only roster — all Tier 1 / Tier S. Different deal shapes than players: campaign archetypes,
                lifestyle content series, brand ambassador packages.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {creators.map(c => {
              const tierStyle = TIER_STYLES[c.tier_code || ''] ?? TIER_STYLES['Tier 1'];
              return (
                <div key={c.id} className={`rounded-xl border border-line bg-white p-5 ${tierStyle.ring}`}>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-ink text-lg truncate">{c.nickname}</h3>
                    {c.tier_code && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${tierStyle.chip}`}>
                        {c.tier_code}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-label mt-1">{tierStyle.label} creator</div>
                  {showRates && c.rate_ig_reels > 0 && (
                    <div className="mt-3 pt-3 border-t border-line flex items-center justify-between">
                      <div className="text-[10px] uppercase tracking-wider text-mute font-bold">IG Reel from</div>
                      <div className="text-sm font-bold text-greenDark tabular-nums">SAR {c.rate_ig_reels.toLocaleString('en-US')}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Footer note ──────────────────────────────────────────────── */}
      <div className="text-center text-xs text-mute leading-relaxed px-4">
        <strong className="text-ink">Pitch mode</strong> hides rates by default — toggle <em>Rates ON</em> in the filter bar for internal review.
        Every rate is engine-locked, methodology-defensible, and refreshes live from the database.
      </div>
    </div>
  );
}
