'use client';
import { useMemo, useState } from 'react';
import {
  Trophy, ShieldCheck, Send, CheckCircle2, AlertCircle, Lock, Info,
  Instagram, Music2, Youtube, Twitch, Users, Target, Zap, TrendingDown, Globe2, Building2,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────
type AchievementObj = {
  title?: string; year?: string | number; placement?: string; tier?: string;
  prize_usd?: number | string;
  [k: string]: unknown;
};
type Achievement = string | AchievementObj;

type IntakeRegion = 'KSA' | 'MENA' | 'EU' | 'NA' | 'APAC' | 'GLOBAL';

const REGION_LABEL: Record<IntakeRegion, string> = {
  KSA: 'Saudi Arabia (KSA)',
  MENA: 'MENA',
  EU: 'Europe',
  NA: 'North America',
  APAC: 'Asia-Pacific',
  GLOBAL: 'Global',
};

type SocialLink = { handle?: string | null; url?: string | null; followers?: number | null };

type PlayerInfo = {
  id: number;
  nickname: string;
  full_name: string | null;
  avatar_url: string | null;
  tier_code: string | null;
  game: string | null;
  team: string | null;
  nationality: string | null;
  followers_ig: number;
  followers_tiktok: number;
  followers_yt: number;
  followers_x: number;
  followers_twitch: number;
  // URLs / handles for the editable-social block
  instagram?: string | null;
  tiktok?: string | null;
  youtube?: string | null;
  x_handle?: string | null;
  twitch?: string | null;
  achievements: Achievement[];
  liquipedia_url: string | null;
  submitted_at: string | null;
  status: string;
  notes: string;
  agency_status: string | null;
  agency_name: string | null;
  agency_fee_pct: number | null;
  // Migration 058 — revision lockout
  revision_count: number;
  locked_until: string | null;
};

type PeerOrg = {
  org_name: string;
  region: string;
  primary_game: string | null;
  hq_country: string | null;
  followers_total: number | null;
  source_url: string | null;
  notes: string | null;
};

type Band = { platform: string; min_sar: number; median_sar: number; max_sar: number; audience_market: string } | null;

type Deliverable = {
  key: string;
  label: string;
  blurb: string;
  group: string;
  internal: number;
  band: Band;       // regional band (talent's home market)
  worldBand: Band;  // GLOBAL "world-class" band
  existing: number;
};

const fmt = (n: number) => Number(n || 0).toLocaleString('en-US');
function toIntOrNull(v: string): number | null {
  const cleaned = String(v ?? '').replace(/[^\d]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

// ─── Utility: classify a submitted value into a price zone ─────────────────
type Zone = 'below' | 'floor' | 'median' | 'premium' | 'above' | 'none';
function zoneFor(submittedSar: number, band: Band): Zone {
  if (!band || submittedSar <= 0) return 'none';
  const min = Number(band.min_sar);
  const med = Number(band.median_sar);
  const max = Number(band.max_sar);
  if (submittedSar < min) return 'below';
  if (submittedSar > max) return 'above';
  // 3 zones inside the band: floor (min..mid-low), median (mid), premium (mid-high..max)
  const lowMid  = min + (med - min) * 0.6;
  const highMid = med + (max - med) * 0.4;
  if (submittedSar <= lowMid)  return 'floor';
  if (submittedSar <= highMid) return 'median';
  return 'premium';
}

const ZONE_META: Record<Zone, { label: string; tone: string; sub: string; Icon: any }> = {
  below:   { label: 'Below benchmark',   tone: 'amber',   sub: 'Highest deal-flow — but you may be underselling.',   Icon: TrendingDown },
  floor:   { label: 'Floor zone',        tone: 'green',   sub: 'High inbound. Brands close fastest in this band.',     Icon: Zap },
  median:  { label: 'Median zone',       tone: 'blue',    sub: 'Balanced. Good close-rate, fair compensation.',         Icon: Target },
  premium: { label: 'Premium zone',      tone: 'purple',  sub: 'Lower inbound. Brands push back harder, fewer closed.',Icon: TrendingDown },
  above:   { label: 'Above world max',   tone: 'red',     sub: 'Almost no inbound at this level. Reserved for top global names.', Icon: AlertCircle },
  none:    { label: '',                  tone: 'mute',    sub: '',                                                       Icon: Info },
};

const TONE_CLASSES: Record<string, { ring: string; bg: string; text: string; chipBg: string; chipText: string }> = {
  green:  { ring: 'ring-emerald-300',  bg: 'bg-emerald-50', text: 'text-emerald-800',  chipBg: 'bg-emerald-100',  chipText: 'text-emerald-900' },
  blue:   { ring: 'ring-blue-300',     bg: 'bg-blue-50',    text: 'text-blue-800',     chipBg: 'bg-blue-100',     chipText: 'text-blue-900' },
  purple: { ring: 'ring-purple-300',   bg: 'bg-purple-50',  text: 'text-purple-800',   chipBg: 'bg-purple-100',   chipText: 'text-purple-900' },
  amber:  { ring: 'ring-amber-300',    bg: 'bg-amber-50',   text: 'text-amber-800',    chipBg: 'bg-amber-100',    chipText: 'text-amber-900' },
  red:    { ring: 'ring-red-300',      bg: 'bg-red-50',     text: 'text-red-800',      chipBg: 'bg-red-100',      chipText: 'text-red-900' },
  mute:   { ring: 'ring-line',         bg: 'bg-bg/50',      text: 'text-mute',         chipBg: 'bg-bg',           chipText: 'text-mute' },
};

// ─── Main component ────────────────────────────────────────────────────────
export function TalentIntake({
  token, player, market, deliverables, peerOrgs,
}: {
  token: string;
  player: PlayerInfo;
  market: IntakeRegion;
  deliverables: Deliverable[];
  peerOrgs: PeerOrg[];
}) {
  const SAR_PER_USD = 3.75;
  const [currency, setCurrency] = useState<'SAR' | 'USD'>('SAR');

  // Migration 058 — derived lock state
  const lockedUntilMs = player.locked_until ? new Date(player.locked_until).getTime() : null;
  const isLocked = lockedUntilMs !== null && lockedUntilMs > Date.now();
  const unlockDateLabel = lockedUntilMs ? new Date(lockedUntilMs).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
  const isFirstSubmit = !player.submitted_at;
  const remainingRevisions = isLocked ? 0 : (isFirstSubmit ? 1 : Math.max(0, 1 - player.revision_count));
  const fmtMoney = (sar: number) => {
    const n = currency === 'USD' ? Math.round(sar / SAR_PER_USD) : Math.round(sar);
    return `${currency} ${n.toLocaleString('en-US')}`;
  };
  const toSar = (typed: number) => currency === 'USD' ? Math.round(typed * SAR_PER_USD) : Math.round(typed);
  const fromSar = (sar: number) => currency === 'USD' ? Math.round(sar / SAR_PER_USD) : Math.round(sar);

  const [mins, setMins] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const d of deliverables) m[d.key] = d.existing > 0 ? String(d.existing) : '';
    return m;
  });

  // Agency state
  const [hasAgency, setHasAgency] = useState<boolean>(player.agency_status === 'agency');
  const [agencyName, setAgencyName] = useState<string>(player.agency_name ?? '');
  const [agencyFeePct, setAgencyFeePct] = useState<string>(
    player.agency_fee_pct != null ? String(player.agency_fee_pct) : ''
  );

  // Editable socials state (Migration 057). Talent can correct/fill missing
  // handles + follower counts directly from the intake form.
  const [socials, setSocials] = useState({
    instagram:        player.instagram        ?? '',
    tiktok:           player.tiktok           ?? '',
    youtube:          player.youtube          ?? '',
    x_handle:        player.x_handle        ?? '',
    twitch:           player.twitch           ?? '',
    followers_ig:     String(player.followers_ig     || ''),
    followers_tiktok: String(player.followers_tiktok || ''),
    followers_yt:     String(player.followers_yt     || ''),
    followers_x:      String(player.followers_x      || ''),
    followers_twitch: String(player.followers_twitch || ''),
  });
  const [editingSocials, setEditingSocials] = useState(false);

  const [notes, setNotes] = useState(player.notes ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<null | { ok: true } | { ok: false; error: string }>(null);

  const groups = useMemo(() => {
    const m = new Map<string, Deliverable[]>();
    for (const d of deliverables) {
      const arr = m.get(d.group) ?? [];
      arr.push(d); m.set(d.group, arr);
    }
    return Array.from(m.entries());
  }, [deliverables]);

  const totalReach = player.followers_ig + player.followers_tiktok + player.followers_yt + player.followers_x + player.followers_twitch;

  async function submit() {
    // Validate agency state
    if (hasAgency) {
      const n = Number(String(agencyFeePct).replace(',', '.'));
      if (!Number.isFinite(n) || n < 0 || n > 50) {
        setDone({ ok: false, error: 'Agency fee % must be between 0 and 50.' });
        return;
      }
      if (!agencyName.trim()) {
        setDone({ ok: false, error: 'Please enter your agency name (or untoggle "I have an agency").' });
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload: Record<string, number> = {};
      for (const [k, v] of Object.entries(mins)) {
        const n = Number(String(v).replace(/[, ]/g, ''));
        if (Number.isFinite(n) && n > 0) payload[k] = Math.round(n);
      }
      const res = await fetch(`/api/talent/${token}/submit`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          min_rates: payload,
          notes,
          agency: {
            has_agency: hasAgency,
            name: hasAgency ? agencyName.trim() : null,
            fee_pct: hasAgency ? Number(String(agencyFeePct).replace(',', '.')) : null,
          },
          socials: {
            instagram:        socials.instagram.trim() || null,
            tiktok:           socials.tiktok.trim()    || null,
            youtube:          socials.youtube.trim()   || null,
            x_handle:        socials.x_handle.trim() || null,
            twitch:           socials.twitch.trim()    || null,
            followers_ig:     toIntOrNull(socials.followers_ig),
            followers_tiktok: toIntOrNull(socials.followers_tiktok),
            followers_yt:     toIntOrNull(socials.followers_yt),
            followers_x:      toIntOrNull(socials.followers_x),
            followers_twitch: toIntOrNull(socials.followers_twitch),
          },
        }),
      });
      if (res.status === 423) {
        const j = await res.json().catch(() => ({} as Record<string, unknown>));
        setDone({ ok: false, error: typeof j.detail === 'string' ? j.detail : 'Revision locked. Email afg@falcons.sa to request an early unlock.' });
      } else if (!res.ok) {
        const t = await res.text().catch(() => '');
        setDone({ ok: false, error: t || `HTTP ${res.status}` });
      } else {
        setDone({ ok: true });
      }
    } catch (e: any) {
      setDone({ ok: false, error: e?.message ?? 'Network error' });
    } finally {
      setSubmitting(false);
    }
  }

  if (done?.ok || (player.submitted_at && !done)) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border-2 border-greenDark/40 bg-greenSoft/40 p-6 sm:p-8 text-center">
          <CheckCircle2 size={48} className="mx-auto text-greenDark mb-3" />
          <h1 className="text-xl sm:text-2xl font-bold text-greenDark">Thank you, {player.nickname}.</h1>
          <p className="text-sm text-ink/80 mt-2 max-w-md mx-auto">
            Your minimums have been recorded. Your account manager will reach out
            before any quote goes below them. You can revise at any time —
            this same link stays active.
          </p>
        </div>
        <button onClick={() => setDone(null)} className="text-xs text-mute hover:text-ink underline mx-auto block min-h-[44px] px-3">
          Revise my minimums
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ─── Header card ────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-line bg-card overflow-hidden shadow-sm">
        <div className="bg-gradient-to-br from-greenDark to-greenDark/80 text-white p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              {player.avatar_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={player.avatar_url} alt={player.nickname}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover ring-2 ring-white/40 flex-shrink-0" />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/20 flex items-center justify-center text-xl sm:text-2xl font-bold flex-shrink-0">
                  {player.nickname.slice(0,2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-[10px] sm:text-[11px] uppercase tracking-wider opacity-80">Talent intake — minimum rates</div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold leading-tight break-words">{player.nickname}</h1>
                <div className="text-xs sm:text-sm opacity-90 mt-0.5 break-words">
                  {[player.full_name, player.game, player.team].filter(Boolean).join(' · ')}
                </div>
                <div className="text-[10px] sm:text-[11px] opacity-80 mt-1">
                  {player.tier_code || 'Tier 3'} · {player.nationality || 'Region unspecified'} · benchmarks for {REGION_LABEL[market]} + World
                </div>
              </div>
            </div>
            <div className="flex sm:flex-col sm:items-end justify-between gap-2 sm:gap-1 sm:ml-auto sm:flex-shrink-0">
              <div className="inline-flex items-center rounded-lg border border-white/30 bg-white/10 overflow-hidden text-xs font-semibold">
                {(['SAR', 'USD'] as const).map((c, i) => (
                  <button key={c} type="button" onClick={() => setCurrency(c)}
                    className={[
                      'px-3 py-2 min-h-[44px] sm:min-h-0 sm:py-1.5 transition',
                      i > 0 ? 'border-l border-white/30' : '',
                      currency === c ? 'bg-white text-greenDark' : 'text-white/90 hover:bg-white/10',
                    ].join(' ')}
                    title={`Show prices in ${c}`}
                    aria-label={`Show prices in ${c}`}>
                    {c}
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-white/70 self-center sm:self-end">@ 3.75 SAR/USD</div>
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-5 grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
          <Stat icon={<Instagram size={14}/>} label="IG"      value={fmt(player.followers_ig)} />
          <Stat icon={<Music2 size={14}/>}    label="TikTok"  value={fmt(player.followers_tiktok)} />
          <Stat icon={<Youtube size={14}/>}   label="YouTube" value={fmt(player.followers_yt)} />
          <Stat icon={<Twitch size={14}/>}    label="Twitch"  value={fmt(player.followers_twitch)} />
          <Stat icon={<Users size={14}/>}     label="Total"   value={fmt(totalReach)} accent />
        </div>
      </div>

      {/* ─── Lock banner (Migration 058) ──────────────────────────────── */}
      {isLocked && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-xs sm:text-sm text-amber-900">
          <div className="flex items-start gap-3">
            <Lock size={18} className="mt-0.5 flex-shrink-0 text-amber-700" />
            <div className="space-y-1">
              <div className="font-bold">Revision locked until {unlockDateLabel}</div>
              <div>
                You\'ve already used your one free revision in this 3-month window. The next revision opens automatically on <strong>{unlockDateLabel}</strong>.
                {' '}To request an earlier change, email <a href="mailto:afg@falcons.sa" className="underline font-semibold">afg@falcons.sa</a>.
              </div>
            </div>
          </div>
        </div>
      )}
      {!isLocked && player.submitted_at && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 flex items-center gap-2">
          <Info size={14} className="flex-shrink-0 text-blue-700" />
          <div>You have <strong>{remainingRevisions}</strong> free revision{remainingRevisions === 1 ? '' : 's'} this quarter. After that, the form locks for 3 months unless you email afg@falcons.sa.</div>
        </div>
      )}

      {/* ─── Achievements (Liquipedia) ─────────────────────────────────── */}
      {player.achievements.length > 0 && (
        <div className="rounded-2xl border border-line bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Trophy size={16} className="text-greenDark" />
              <h2 className="text-sm font-semibold text-ink">Career achievements (we have on file)</h2>
            </div>
            {player.liquipedia_url && (
              <a href={player.liquipedia_url} target="_blank" rel="noopener noreferrer"
                 className="text-[11px] text-mute hover:text-greenDark underline min-h-[44px] sm:min-h-0 inline-flex items-center">
                View Liquipedia →
              </a>
            )}
          </div>
          <ul className="space-y-1.5 text-xs max-h-72 overflow-auto pr-1 sm:pr-2">
            {player.achievements.slice(0, 18).map((raw, i) => {
              const isStr = typeof raw === 'string';
              if (isStr) {
                const text = raw as string;
                return (
                  <li key={i} className="flex items-baseline justify-between gap-2 sm:gap-3 border-b border-line/60 pb-1">
                    <span className="text-ink min-w-0 break-words">{text}</span>
                  </li>
                );
              }
              const a = raw as AchievementObj;
              const label = a.title || a.tier || (typeof a.placement === 'string' ? a.placement : '') || 'Achievement';
              return (
                <li key={i} className="flex items-baseline justify-between gap-2 sm:gap-3 border-b border-line/60 pb-1">
                  <span className="text-ink min-w-0">
                    {a.placement && <span className="font-semibold text-greenDark mr-1.5">{a.placement}</span>}
                    <span className="break-words">{label}</span>
                    {typeof a.prize_usd === 'number' && a.prize_usd > 0 && (
                      <span className="text-[11px] text-mute ml-1.5">· ${a.prize_usd.toLocaleString('en-US')}</span>
                    )}
                  </span>
                  <span className="text-mute tabular-nums whitespace-nowrap">{a.year ?? ''}</span>
                </li>
              );
            })}
          </ul>
          <p className="text-[11px] text-mute mt-2">
            If anything's missing or wrong, mention it in the notes box below — we'll update it.
          </p>
        </div>
      )}

      {/* ─── Editable socials (Migration 057) ─────────────────────────── */}
      <div className="rounded-2xl border border-line bg-card overflow-hidden">
        <div className="px-4 sm:px-5 py-3 flex items-center justify-between gap-2 border-b border-line">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-greenDark" />
            <h2 className="text-sm font-semibold text-ink">Your socials</h2>
          </div>
          <button
            type="button"
            onClick={() => setEditingSocials(v => !v)}
            className="text-[11px] font-semibold text-greenDark hover:underline min-h-[44px] sm:min-h-0 px-2"
          >
            {editingSocials ? 'Done editing' : 'Edit / fill missing'}
          </button>
        </div>
        <div className="divide-y divide-line">
          {[
            { key: 'instagram', label: 'Instagram',         fkey: 'followers_ig',     prefix: 'https://www.instagram.com/' },
            { key: 'tiktok',    label: 'TikTok',            fkey: 'followers_tiktok', prefix: 'https://www.tiktok.com/@' },
            { key: 'youtube',   label: 'YouTube',           fkey: 'followers_yt',     prefix: 'https://www.youtube.com/' },
            { key: 'x_handle', label: 'X (Twitter)',       fkey: 'followers_x',      prefix: 'https://x.com/' },
            { key: 'twitch',    label: 'Twitch',            fkey: 'followers_twitch', prefix: 'https://www.twitch.tv/' },
          ].map(({ key, label, fkey, prefix }) => {
            const handleVal = (socials as any)[key] as string;
            const followerVal = (socials as any)[fkey] as string;
            const isLink = handleVal && (handleVal.startsWith('http://') || handleVal.startsWith('https://'));
            return (
              <div key={key} className="px-4 sm:px-5 py-3 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 items-start sm:items-center">
                <div className="sm:col-span-3 text-xs font-semibold text-label">{label}</div>
                <div className="sm:col-span-6 min-w-0">
                  {editingSocials ? (
                    <input
                      type="url"
                      value={handleVal}
                      onChange={e => setSocials(s => ({ ...s, [key]: e.target.value }))}
                      placeholder={prefix + 'yourhandle'}
                      className="w-full text-sm border border-line rounded-lg px-3 py-2 min-h-[44px] sm:min-h-0 bg-bg focus:outline-none focus:ring-2 focus:ring-greenDark/30"
                    />
                  ) : handleVal ? (
                    isLink ? (
                      <a href={handleVal} target="_blank" rel="noopener noreferrer"
                         className="text-greenDark hover:underline break-all text-xs">
                        {handleVal}
                      </a>
                    ) : (
                      <span className="text-ink break-all text-xs">{handleVal}</span>
                    )
                  ) : (
                    <span className="text-mute italic text-xs">— not on file —</span>
                  )}
                </div>
                <div className="sm:col-span-3">
                  {editingSocials ? (
                    <input
                      type="text"
                      inputMode="numeric"
                      value={followerVal}
                      onChange={e => setSocials(s => ({ ...s, [fkey]: e.target.value.replace(/[^\d]/g, '') }))}
                      placeholder="Followers"
                      className="w-full text-right text-sm tabular-nums border border-line rounded-lg px-3 py-2 min-h-[44px] sm:min-h-0 bg-bg focus:outline-none focus:ring-2 focus:ring-greenDark/30"
                    />
                  ) : followerVal ? (
                    <span className="text-xs text-ink tabular-nums">{Number(followerVal).toLocaleString('en-US')} followers</span>
                  ) : (
                    <span className="text-mute italic text-xs">unknown</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-4 sm:px-5 py-2 bg-bg/40 text-[11px] text-mute">
          Click <strong className="text-greenDark">Edit / fill missing</strong> to correct handles or follower counts. Audit-logged.
        </div>
      </div>

      {/* ─── Peer-orgs in your region (Migration 057) ──────────────────── */}
      {peerOrgs.length > 0 && (
        <div className="rounded-2xl border border-line bg-card overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-line">
            <div className="flex items-center gap-2">
              <Globe2 size={14} className="text-greenDark" />
              <h2 className="text-sm font-semibold text-ink">Other esports orgs in {REGION_LABEL[market]}</h2>
            </div>
            <p className="text-[11px] text-mute mt-0.5">
              For reference. Public follower counts only — your tier band above is the actual rate anchor.
            </p>
          </div>
          <ul className="divide-y divide-line max-h-64 overflow-auto">
            {peerOrgs.map(p => (
              <li key={p.org_name} className="px-4 sm:px-5 py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <div className="font-semibold text-ink truncate">{p.org_name}</div>
                  <div className="text-mute text-[11px]">
                    {[p.primary_game, p.hq_country].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <div className="text-right tabular-nums whitespace-nowrap">
                  <div className="text-ink font-semibold">{Number(p.followers_total ?? 0).toLocaleString('en-US')}</div>
                  <div className="text-[10px] text-mute uppercase tracking-wider">followers</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ─── How this works (with explicit deal-flow trade-off) ─────────── */}
      <div className="rounded-xl border border-greenDark/30 bg-greenSoft/30 p-4 text-xs sm:text-[13px] text-ink leading-relaxed space-y-2">
        <div className="flex items-center gap-2 font-semibold text-greenDark">
          <Info size={14} /> How to set your floor
        </div>
        <p>
          For each deliverable, set the <strong>minimum {currency} you'll accept per single posting</strong>.
          We show you two anchors: <strong className="text-greenDark">your regional band ({REGION_LABEL[market]})</strong> and
          the <strong className="text-greenDark">world-class band</strong> for your tier.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
          <ZoneHint zone="floor"   title="Floor"   />
          <ZoneHint zone="median"  title="Median" />
          <ZoneHint zone="premium" title="Premium" />
        </div>
        <p className="text-[11px] text-mute pt-1">
          You'll never be quoted below your floor without us calling you first. Leave blank to skip a deliverable you don't want to do.
        </p>
      </div>

      {/* ─── Deliverable rows ──────────────────────────────────────────── */}
      <div className="space-y-4 sm:space-y-5">
        {groups.map(([groupName, items]) => (
          <div key={groupName} className="rounded-2xl border border-line bg-card overflow-hidden">
            <div className="bg-bg/60 border-b border-line px-3 sm:px-4 py-2 text-[11px] uppercase tracking-wider font-bold text-label">
              {groupName}
            </div>
            <div className="divide-y divide-line">
              {items.map(d => (
                <DeliverableRow
                  key={d.key}
                  d={d}
                  value={mins[d.key] ?? ''}
                  currency={currency}
                  fmtMoney={fmtMoney}
                  toSar={toSar}
                  fromSar={fromSar}
                  onChange={v => setMins(s => ({ ...s, [d.key]: v }))}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ─── Agency representation ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-line bg-card p-4 sm:p-5 space-y-3">
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Building2 size={16} className="text-greenDark" />
            Are you represented by an agency?
          </span>
          <span className={[
            'relative inline-flex h-6 w-11 items-center rounded-full transition',
            hasAgency ? 'bg-greenDark' : 'bg-line',
          ].join(' ')}>
            <input type="checkbox" className="sr-only" checked={hasAgency}
              onChange={e => setHasAgency(e.target.checked)} />
            <span className={[
              'inline-block h-5 w-5 transform rounded-full bg-white shadow transition',
              hasAgency ? 'translate-x-5' : 'translate-x-0.5',
            ].join(' ')}/>
          </span>
        </label>
        {hasAgency && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-mute font-bold">Agency name</label>
              <input
                type="text"
                value={agencyName}
                onChange={e => setAgencyName(e.target.value)}
                placeholder="e.g. CAA Sports, Loaded, CodeRed…"
                className="mt-1 w-full text-sm border border-line rounded-lg px-3 py-2 min-h-[44px] sm:min-h-0 bg-bg focus:outline-none focus:ring-2 focus:ring-greenDark/30"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-mute font-bold">Agency fee % (off the top)</label>
              <div className="relative mt-1">
                <input
                  type="text"
                  inputMode="decimal"
                  value={agencyFeePct}
                  onChange={e => setAgencyFeePct(e.target.value.replace(/[^\d.,]/g, '').slice(0, 5))}
                  placeholder="e.g. 15"
                  className="w-full text-sm border border-line rounded-lg px-3 py-2 pr-8 min-h-[44px] sm:min-h-0 bg-bg focus:outline-none focus:ring-2 focus:ring-greenDark/30 tabular-nums"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-mute text-sm">%</span>
              </div>
              <p className="text-[10px] text-mute mt-1">
                Used to gross up your floor before we show internal pricing. Range 0–50.
              </p>
            </div>
          </div>
        )}
        {!hasAgency && (
          <p className="text-[11px] text-mute">
            We'll book you directly. You can change this any time.
          </p>
        )}
      </div>

      {/* ─── Notes ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-line bg-card p-4 sm:p-5 space-y-2">
        <label className="text-xs font-semibold text-ink">Notes for your account manager (optional)</label>
        <textarea
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="e.g. exclusivity-only on energy-drink category, can't post on stream days during EWC, prefer non-gambling brands…"
          className="w-full text-base sm:text-sm border border-line rounded-lg px-3 py-2.5 sm:py-2 bg-bg focus:outline-none focus:ring-2 focus:ring-greenDark/30"
        />
      </div>

      {/* ─── Submit ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between bg-card rounded-2xl border border-line p-4 sticky bottom-0 sm:static z-10 -mx-4 sm:mx-0 rounded-none sm:rounded-2xl border-x-0 sm:border-x shadow-lg sm:shadow-none">
        <div className="flex items-center gap-2 text-[11px] text-mute order-2 sm:order-1">
          <Lock size={12} /> Private to you and Falcons Talent. Audit-logged.
        </div>
        <button type="button" onClick={submit} disabled={submitting || isLocked}
          className="btn btn-primary inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 min-h-[48px] sm:min-h-[44px] disabled:opacity-50 w-full sm:w-auto order-1 sm:order-2 text-base sm:text-sm font-semibold">
          <Send size={14} />
          {submitting ? 'Saving…'
            : isLocked ? `Locked until ${unlockDateLabel}`
            : (player.submitted_at
                ? `Save revision (${remainingRevisions} left)`
                : 'Submit my minimums')}
        </button>
      </div>

      {done && !done.ok && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-700 flex items-start gap-2">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
          <div><strong>Couldn't save.</strong> {done.error}</div>
        </div>
      )}
    </div>
  );
}

// ─── sub-components ─────────────────────────────────────────────────────────
function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg border p-2 ${accent ? 'border-greenDark/40 bg-greenSoft/30' : 'border-line bg-bg'}`}>
      <div className="text-[10px] uppercase tracking-wider text-mute font-bold flex items-center gap-1">
        {icon}{label}
      </div>
      <div className={`text-sm font-bold tabular-nums ${accent ? 'text-greenDark' : 'text-ink'}`}>{value}</div>
    </div>
  );
}

function ZoneHint({ zone, title }: { zone: 'floor' | 'median' | 'premium'; title: string }) {
  const meta = ZONE_META[zone];
  const tone = TONE_CLASSES[meta.tone];
  const Icon = meta.Icon;
  return (
    <div className={`rounded-lg p-2.5 ${tone.bg} ring-1 ${tone.ring}`}>
      <div className={`text-[11px] font-bold flex items-center gap-1.5 ${tone.text}`}>
        <Icon size={12} /> {title}
      </div>
      <div className={`text-[11px] mt-0.5 ${tone.text}`}>{meta.sub}</div>
    </div>
  );
}

function DeliverableRow({
  d, value, currency, fmtMoney, toSar, fromSar, onChange,
}: {
  d: Deliverable; value: string;
  currency: 'SAR' | 'USD';
  fmtMoney: (sar: number) => string;
  toSar: (typed: number) => number;
  fromSar: (sar: number) => number;
  onChange: (v: string) => void;
}) {
  const displayValue = value === '' ? '' : String(fromSar(Number(value) || 0));
  const handleInput = (raw: string) => {
    const cleaned = raw.replace(/[^\d]/g, '');
    if (cleaned === '') { onChange(''); return; }
    onChange(String(toSar(Number(cleaned))));
  };

  // Use REGIONAL band as the primary "what zone are you in?" anchor.
  const submittedSar = Number(value) || 0;
  const zone = zoneFor(submittedSar, d.band);
  const zoneMeta = ZONE_META[zone];
  const tone = TONE_CLASSES[zoneMeta.tone];
  const ZoneIcon = zoneMeta.Icon;

  return (
    <div className="px-3 sm:px-4 py-3.5 space-y-3 sm:space-y-3">
      {/* Title row */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-ink">{d.label}</div>
          <div className="text-[11px] text-mute mt-0.5">{d.blurb}</div>
        </div>
      </div>

      {/* Benchmark row: Regional + World, side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <BenchmarkChip
          band={d.band}
          marketLabel={d.band ? d.band.audience_market : 'Region'}
          icon={<Target size={11} />}
          fmtMoney={fmtMoney}
          accent="green"
        />
        <BenchmarkChip
          band={d.worldBand}
          marketLabel="World"
          icon={<Globe2 size={11} />}
          fmtMoney={fmtMoney}
          accent="purple"
        />
      </div>

      {/* Visual zone bar (regional), with the talent's submitted floor positioned on it */}
      {d.band && (
        <ZoneBar
          band={d.band}
          submittedSar={submittedSar}
          fmtMoney={fmtMoney}
        />
      )}

      {/* Input + live zone callout */}
      <div className="flex flex-col sm:flex-row sm:items-stretch gap-2">
        <div className="flex-1 sm:max-w-xs">
          <label className="text-[10px] uppercase tracking-wider text-mute font-bold flex items-center gap-1 mb-1">
            <ShieldCheck size={11} /> Your floor ({currency})
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={displayValue}
            onChange={e => handleInput(e.target.value)}
            placeholder={currency === 'USD' ? 'e.g. 2,000' : 'e.g. 8,000'}
            className="w-full text-right text-base sm:text-sm font-semibold tabular-nums border border-line rounded-lg px-3 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 bg-card focus:outline-none focus:ring-2 focus:ring-greenDark/40"
          />
        </div>
        {zone !== 'none' && (
          <div className={`flex-1 rounded-lg ${tone.bg} ring-1 ${tone.ring} px-3 py-2 text-[11px] flex items-start gap-2`}>
            <ZoneIcon size={14} className={`${tone.text} mt-0.5 flex-shrink-0`} />
            <div className={tone.text}>
              <div className="font-bold">{zoneMeta.label}</div>
              <div>{zoneMeta.sub}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BenchmarkChip({
  band, marketLabel, icon, fmtMoney, accent,
}: {
  band: Band; marketLabel: string;
  icon: React.ReactNode;
  fmtMoney: (sar: number) => string;
  accent: 'green' | 'purple';
}) {
  if (!band) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-bg/30 px-3 py-2 text-[11px] text-mute italic">
        {marketLabel}: not seeded yet
      </div>
    );
  }
  const accentText = accent === 'green' ? 'text-greenDark' : 'text-purple-700';
  return (
    <div className="rounded-lg border border-line bg-bg/50 px-3 py-2 text-[11px] tabular-nums">
      <div className={`font-semibold uppercase tracking-wider text-[10px] mb-1 flex items-center gap-1 ${accentText}`}>
        {icon} {marketLabel} benchmark
      </div>
      <div className="grid grid-cols-3 gap-2 text-ink">
        <div><span className="text-mute">Floor</span><div className="font-semibold">{fmtMoney(Number(band.min_sar))}</div></div>
        <div><span className="text-mute">Median</span><div className={`font-semibold ${accentText}`}>{fmtMoney(Number(band.median_sar))}</div></div>
        <div><span className="text-mute">Premium</span><div className="font-semibold">{fmtMoney(Number(band.max_sar))}</div></div>
      </div>
    </div>
  );
}

function ZoneBar({ band, submittedSar, fmtMoney }: { band: NonNullable<Band>; submittedSar: number; fmtMoney: (sar: number) => string }) {
  const min = Number(band.min_sar);
  const med = Number(band.median_sar);
  const max = Number(band.max_sar);
  const span = max - min;
  // Position the marker on a [0..1] axis. Clamp.
  let pct: number | null = null;
  if (submittedSar > 0 && span > 0) {
    pct = Math.max(0, Math.min(1, (submittedSar - min) / span));
  }
  return (
    <div className="space-y-1">
      <div className="relative h-2 rounded-full overflow-hidden bg-line/40">
        {/* Three colored zones: emerald (floor), blue (median), purple (premium) */}
        <div className="absolute inset-y-0 left-0 w-1/3 bg-emerald-300/70"></div>
        <div className="absolute inset-y-0 left-1/3 w-1/3 bg-blue-300/70"></div>
        <div className="absolute inset-y-0 left-2/3 w-1/3 bg-purple-300/70"></div>
        {pct != null && (
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-ink ring-2 ring-card shadow"
               style={{ left: `${(pct * 100).toFixed(1)}%` }}
               title={`Your floor: ${fmtMoney(submittedSar)}`}/>
        )}
      </div>
      <div className="flex justify-between text-[10px] text-mute tabular-nums">
        <span>{fmtMoney(min)}</span>
        <span>{fmtMoney(med)}</span>
        <span>{fmtMoney(max)}</span>
      </div>
    </div>
  );
}
