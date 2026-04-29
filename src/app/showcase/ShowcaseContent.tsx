'use client';
import { useMemo, useState } from 'react';
import {
  Trophy, Users, Sparkles, Search, X as XIcon, ShieldCheck,
  Crown, Flame, MapPin, Zap, Eye, EyeOff, ArrowUpRight,
  Radio, Clock, TrendingUp,
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
type Creator = {
  id: number; nickname: string;
  full_name: string | null; nationality: string | null;
  tier_code: string | null; score: number | null;
  rate_ig_reels: number; rate_yt_full: number; rate_yt_shorts: number;
  rate_tiktok_ours: number; rate_twitch_kick_live: number;
  handle_ig: string | null; handle_x: string | null;
  handle_yt: string | null; handle_tiktok: string | null; handle_twitch: string | null;
  followers_ig: number | null; followers_x: number | null;
  followers_yt: number | null; followers_tiktok: number | null; followers_twitch: number | null;
  notes: string | null; link: string | null;
};

// Hardcoded championship signals — until we have a proper achievements table,
// flag the names we know from public records so cards earn a "Champion" badge.
const M5_CHAMPIONS = new Set(['FlapTzy', 'Hadji', 'Owgwen', 'KyleTzy', 'Super Marco', 'Ferdz']);
const MAJOR_WINNERS = new Set([
  'NiKo', 'm0NESY',                           // CS2 Major MVPs
  'Vejrgang',                                  // EAFC eWorld Cup champ
  'Msdossary',                                 // FIFA eWorld Cup champ (KSA pride)
  'Clayster',                                  // Multi-time CDL champion
  'TGLTN',                                     // PUBG GLL Grand Slam
]);

// Twitch live-streaming stats (90d window, sourced from Falcons_Talent_Stream_Stats Apr 2026).
// 51 talents tracked. Used to enrich Showcase cards with peak-viewer / hours-watched signals
// — the single biggest credibility lever for live-stream sponsorship pitches.
const STREAM_STATS: Record<string, { peak90: number; avg90: number; streamed: number; watched: number; active: number }> = {
  'm0NESY': { peak90: 24821, avg90: 16577, streamed: 6.6, watched: 108857, active: 2 },
  'Peterbot': { peak90: 21211, avg90: 7374, streamed: 80.5, watched: 593357, active: 28 },
  'kyousuke': { peak90: 17189, avg90: 9651, streamed: 3.2, watched: 30723, active: 2 },
  'ImperialHal': { peak90: 16789, avg90: 5325, streamed: 616.0, watched: 3281422, active: 81 },
  'NiKo': { peak90: 8076, avg90: 6229, streamed: 5.4, watched: 33636, active: 2 },
  'TGLTN': { peak90: 4047, avg90: 1893, streamed: 203.0, watched: 384785, active: 60 },
  'Abo Najd': { peak90: 2869, avg90: 616, streamed: 388.0, watched: 239173, active: 78 },
  'Wxltzy': { peak90: 2806, avg90: 282, streamed: 378.0, watched: 106583, active: 63 },
  'Kiileerrz': { peak90: 2725, avg90: 2244, streamed: 1.3, watched: 2805, active: 1 },
  'Spammiej': { peak90: 2615, avg90: 801, streamed: 370.0, watched: 296904, active: 72 },
  'Hikaru Nakamura': { peak90: 2584, avg90: 1277, streamed: 9.1, watched: 11624, active: 3 },
  'Soka': { peak90: 2489, avg90: 889, streamed: 620.0, watched: 551822, active: 78 },
  'Malr1ne': { peak90: 2196, avg90: 1835, streamed: 4.2, watched: 7676, active: 1 },
  'Pollo': { peak90: 2122, avg90: 1026, streamed: 43.0, watched: 44062, active: 16 },
  'Draugr': { peak90: 1954, avg90: 98, streamed: 84.6, watched: 8259, active: 21 },
  'Pred': { peak90: 1913, avg90: 851, streamed: 72.4, watched: 61588, active: 22 },
  'dralii': { peak90: 1712, avg90: 707, streamed: 19.2, watched: 13572, active: 7 },
  'CarlJr': { peak90: 1327, avg90: 832, streamed: 96.0, watched: 79911, active: 20 },
  'Swooty': { peak90: 1281, avg90: 221, streamed: 203.0, watched: 44966, active: 44 },
  'Dongy': { peak90: 1242, avg90: 257, streamed: 571.0, watched: 146683, active: 81 },
  'Kickstart': { peak90: 1234, avg90: 267, streamed: 122.0, watched: 32718, active: 37 },
  'Exnid': { peak90: 1143, avg90: 584, streamed: 140.0, watched: 81936, active: 39 },
  'Privacy': { peak90: 1033, avg90: 343, streamed: 81.0, watched: 27823, active: 19 },
  'ChiYo': { peak90: 868, avg90: 486, streamed: 1.7, watched: 834, active: 1 },
  'madv': { peak90: 825, avg90: 458, streamed: 16.1, watched: 7355, active: 7 },
  'Gild': { peak90: 787, avg90: 148, streamed: 384.0, watched: 56945, active: 78 },
  'Cellium': { peak90: 681, avg90: 570, streamed: 2.1, watched: 1226, active: 1 },
  'KiSMET': { peak90: 648, avg90: 239, streamed: 137.0, watched: 32755, active: 27 },
  'Bijw': { peak90: 596, avg90: 187, streamed: 84.8, watched: 15834, active: 28 },
  'Paulehx': { peak90: 589, avg90: 42, streamed: 221.0, watched: 9324, active: 58 },
  'Abo Ghazi': { peak90: 427, avg90: 104, streamed: 67.2, watched: 6986, active: 23 },
  'Gntl': { peak90: 406, avg90: 188, streamed: 10.7, watched: 2015, active: 3 },
  'Newbz': { peak90: 369, avg90: 93, streamed: 546.0, watched: 50714, active: 85 },
  'Shrimzy': { peak90: 318, avg90: 98, streamed: 53.4, watched: 5231, active: 19 },
  'Arcitys': { peak90: 263, avg90: 47, streamed: 103.0, watched: 4796, active: 45 },
  'Clayster': { peak90: 257, avg90: 102, streamed: 15.3, watched: 1566, active: 4 },
  'jume': { peak90: 241, avg90: 133, streamed: 7.2, watched: 958, active: 2 },
  'Jose Serrano': { peak90: 221, avg90: 102, streamed: 107.0, watched: 10949, active: 40 },
  'Kusanagi': { peak90: 183, avg90: 120, streamed: 8.0, watched: 964, active: 3 },
  'hmoodx': { peak90: 177, avg90: 81, streamed: 138.0, watched: 11240, active: 38 },
  'Spy': { peak90: 174, avg90: 72, streamed: 5.0, watched: 359, active: 3 },
  'xizx7': { peak90: 126, avg90: 46, streamed: 77.3, watched: 3562, active: 15 },
  'Frenchi': { peak90: 112, avg90: 41, streamed: 25.4, watched: 1033, active: 9 },
  'FMG': { peak90: 109, avg90: 60, streamed: 8.9, watched: 532, active: 4 },
  'Tapewaare': { peak90: 72, avg90: 18, streamed: 41.6, watched: 729, active: 12 },
  'Xyzzy': { peak90: 62, avg90: 16, streamed: 129.0, watched: 2064, active: 27 },
  'Kindevu': { peak90: 56, avg90: 38, streamed: 4.0, watched: 150, active: 1 },
  'Aqeel9': { peak90: 54, avg90: 25, streamed: 54.5, watched: 1360, active: 18 },
  'Gunner': { peak90: 35, avg90: 14, streamed: 26.7, watched: 383, active: 10 },
  'VENO': { peak90: 14, avg90: 8, streamed: 12.8, watched: 103, active: 7 },
};

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

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
  const [streamerOnly, setStreamerOnly] = useState(false);
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
      if (streamerOnly) {
        const s = STREAM_STATS[p.nickname];
        if (!s || s.active < 20) return false;  // active = streamed >=20 of last 90 days
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
  }, [players, q, tier, game, region, championOnly, streamerOnly, sort]);

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
            // Twitch live coverage gives non-endemic brands a measurable exposure number
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
              <button
                onClick={() => setStreamerOnly(v => !v)}
                aria-pressed={streamerOnly}
                className={[
                  'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold transition',
                  streamerOnly
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-label border-line hover:border-purple-500 hover:text-purple-600',
                ].join(' ')}
                title="Show only active live-streamers (20+ active days last 90)"
              >
                <Radio size={12} /> Active streamers
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

                        {STREAM_STATS[p.nickname] && (
                          <div className="pt-3 border-t border-dashed border-line">
                            <div className="flex items-center gap-1.5 mb-2">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0 rounded-full text-[9px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                                <Radio size={9} /> Live · 90d
                              </span>
                              <span className="text-[10px] text-mute">Twitch · last 90 days</span>
                            </div>
                            {(() => { const s = STREAM_STATS[p.nickname]; return (
                              <div className="grid grid-cols-3 gap-1.5">
                                <div className="rounded bg-bg/60 px-2 py-1.5">
                                  <div className="text-[9px] uppercase tracking-wider text-mute font-bold">Peak</div>
                                  <div className="text-sm font-bold text-ink tabular-nums">{fmtCount(s.peak90)}</div>
                                  <div className="text-[9px] text-mute">live viewers</div>
                                </div>
                                <div className="rounded bg-bg/60 px-2 py-1.5">
                                  <div className="text-[9px] uppercase tracking-wider text-mute font-bold">Watched</div>
                                  <div className="text-sm font-bold text-ink tabular-nums">{fmtCount(s.watched)}h</div>
                                  <div className="text-[9px] text-mute">brand exposure</div>
                                </div>
                                <div className="rounded bg-bg/60 px-2 py-1.5">
                                  <div className="text-[9px] uppercase tracking-wider text-mute font-bold">Active</div>
                                  <div className="text-sm font-bold text-ink tabular-nums">{s.active}/90</div>
                                  <div className="text-[9px] text-mute">days streamed</div>
                                </div>
                              </div>
                            ); })()}
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
              const reachItems = [
                { label: 'YT',    value: c.followers_yt,     handle: c.handle_yt    },
                { label: 'TT',    value: c.followers_tiktok, handle: c.handle_tiktok},
                { label: 'IG',    value: c.followers_ig,     handle: c.handle_ig    },
                { label: 'X',     value: c.followers_x,      handle: c.handle_x     },
                { label: 'TWCH',  value: c.followers_twitch, handle: c.handle_twitch},
              ].filter(r => r.value && r.value > 0);
              const totalReach = reachItems.reduce((s, r) => s + (r.value || 0), 0);
              const dataPending = totalReach === 0;
              // Auto-generate brand-impact pitch from data
              const impact = (() => {
                if (dataPending) return 'Data pending — handles + follower counts being verified.';
                if (totalReach >= 10_000_000) return 'Anchor creator. Top-tier brand association vehicle for nationwide MENA campaigns.';
                if (totalReach >= 3_000_000) return 'Premium voice. Drives brand authority + conversion across the Saudi gaming demographic.';
                if (totalReach >= 1_000_000) return 'Established creator. Strong fit for cultural-fit briefs + product launches.';
                if (totalReach >= 250_000) return 'Mid-tier creator. Best for vertical/niche briefs and community-led product seeding.';
                return 'Emerging voice. Micro-community engagement; strong CPM-to-trust ratio.';
              })();
              return (
                <div key={c.id} className={`rounded-xl border border-line bg-white p-5 flex flex-col ${tierStyle.ring}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-ink text-lg truncate">{c.nickname}</h3>
                      {c.full_name && <div className="text-xs text-mute truncate">{c.full_name}</div>}
                    </div>
                    {c.tier_code && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap ${tierStyle.chip}`}>
                        {c.tier_code}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-label mt-1">
                    {c.nationality && <span className="flex items-center gap-1"><MapPin size={11} /> {c.nationality}</span>}
                    <span>· {tierStyle.label} creator</span>
                  </div>

                  {!dataPending && (
                    <div className="mt-3 grid grid-cols-5 gap-1">
                      {reachItems.map(r => (
                        <a
                          key={r.label}
                          href={r.handle || '#'}
                          target="_blank" rel="noreferrer"
                          className={`px-1.5 py-1 rounded border text-center transition ${r.handle ? 'border-line hover:border-greenDark hover:bg-greenSoft' : 'border-line opacity-70 cursor-default pointer-events-none'}`}
                        >
                          <div className="text-[8px] uppercase tracking-wider text-mute font-bold">{r.label}</div>
                          <div className="text-[10px] font-bold text-ink tabular-nums">{fmtCount(r.value || 0)}</div>
                        </a>
                      ))}
                    </div>
                  )}

                  {!dataPending && (
                    <div className="mt-2 text-[10px] text-mute uppercase tracking-wider font-semibold">
                      Total reach: <span className="text-greenDark text-xs ml-0.5 tabular-nums">{fmtCount(totalReach)}</span>
                    </div>
                  )}

                  <div className={`mt-3 pt-3 border-t border-line flex-1 text-xs leading-relaxed ${dataPending ? 'text-amber-700 italic' : 'text-label'}`}>
                    {impact}
                  </div>

                  {c.notes && (
                    <div className="mt-2 text-[10px] text-mute leading-relaxed line-clamp-3">{c.notes}</div>
                  )}

                  {showRates && c.rate_ig_reels > 0 && (
                    <div className="mt-3 pt-3 border-t border-line flex items-center justify-between">
                      <div className="text-[10px] uppercase tracking-wider text-mute font-bold">Starts at (IG Reel)</div>
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
