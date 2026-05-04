'use client';
import { useMemo, useState } from 'react';
import { Trophy, ShieldCheck, Send, CheckCircle2, AlertCircle, Lock, Info, Instagram, Music2, Youtube, Twitch, Users } from 'lucide-react';

type AchievementObj = {
  title?: string; year?: string | number; placement?: string; tier?: string;
  prize_usd?: number | string;
  [k: string]: unknown;
};
type Achievement = string | AchievementObj;

function splitYear(text: string): { rest: string; year: string | null } {
  const range = text.match(/\b(20\d{2}\s*[–\-]\s*20\d{2})\b/);
  if (range) return { year: range[1].replace(/\s+/g, ''), rest: text.replace(range[0], '').replace(/\s{2,}/g, ' ').trim() };
  const single = text.match(/\b(20\d{2})\b/);
  if (single) return { year: single[1], rest: text.replace(single[0], '').replace(/\s{2,}/g, ' ').trim() };
  return { year: null, rest: text };
}

function leadingPlacement(text: string): { lead: string | null; rest: string } {
  const m = text.match(/^(\d+(st|nd|rd|th)|top\s*\d+|champion|world\s+champion|gold|silver|bronze|\dx\s+\w+|\d+x\s+\w+)\b\s*[—\-:•]?\s*/i);
  if (!m) return { lead: null, rest: text };
  return { lead: m[1].trim(), rest: text.slice(m[0].length).trim() };
}

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
  achievements: Achievement[];
  liquipedia_url: string | null;
  submitted_at: string | null;
  status: string;
  notes: string;
};

type Band = { platform: string; min_sar: number; median_sar: number; max_sar: number; audience_market: string } | null;

type Deliverable = {
  key: string;
  label: string;
  blurb: string;
  group: string;
  internal: number;
  band: Band;
  existing: number;
};

const fmt = (n: number) => Number(n || 0).toLocaleString('en-US');

export function TalentIntake({
  token, player, market, deliverables,
}: {
  token: string;
  player: PlayerInfo;
  market: 'KSA' | 'MENA' | 'Global';
  deliverables: Deliverable[];
}) {
  const SAR_PER_USD = 3.75;
  const [currency, setCurrency] = useState<'SAR' | 'USD'>('SAR');
  const fmtMoney = (sar: number) => {
    const n = currency === 'USD' ? Math.round(sar / SAR_PER_USD) : Math.round(sar);
    return `${currency} ${n.toLocaleString('en-US')}`;
  };
  const toSar = (typed: number) => currency === 'USD' ? Math.round(typed * SAR_PER_USD) : Math.round(typed);
  const fromSar = (sar: number) => currency === 'USD' ? Math.round(sar / SAR_PER_USD) : Math.round(sar);

  const [mins, setMins] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const d of deliverables) {
      m[d.key] = d.existing > 0 ? String(d.existing) : '';
    }
    return m;
  });
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
        body: JSON.stringify({ min_rates: payload, notes }),
      });
      if (!res.ok) {
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
        <button
          onClick={() => setDone(null)}
          className="text-xs text-mute hover:text-ink underline mx-auto block min-h-[44px] px-3"
        >
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
          {/* Avatar + name + meta + currency: stacks on mobile, side-by-side at sm+ */}
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
                  {player.tier_code || 'Tier 3'} · {player.nationality || 'Region unspecified'} · benchmarks shown for {market}
                </div>
              </div>
            </div>
            {/* Currency switcher: full row on mobile, top-right on desktop */}
            <div className="flex sm:flex-col sm:items-end justify-between gap-2 sm:gap-1 sm:ml-auto sm:flex-shrink-0">
              <div className="inline-flex items-center rounded-lg border border-white/30 bg-white/10 overflow-hidden text-xs font-semibold">
                {(['SAR', 'USD'] as const).map((c, i) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCurrency(c)}
                    className={[
                      'px-3 py-2 min-h-[44px] sm:min-h-0 sm:py-1.5 transition',
                      i > 0 ? 'border-l border-white/30' : '',
                      currency === c ? 'bg-white text-greenDark' : 'text-white/90 hover:bg-white/10',
                    ].join(' ')}
                    title={`Show prices in ${c}`}
                    aria-label={`Show prices in ${c}`}
                  >
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
                const { rest: noYear, year } = splitYear(text);
                const { lead, rest } = leadingPlacement(noYear);
                return (
                  <li key={i} className="flex items-baseline justify-between gap-2 sm:gap-3 border-b border-line/60 pb-1">
                    <span className="text-ink min-w-0">
                      {lead && <span className="font-semibold text-greenDark mr-1.5">{lead}</span>}
                      <span className="break-words">{rest || text}</span>
                    </span>
                    {year && <span className="text-mute tabular-nums whitespace-nowrap">{year}</span>}
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

      {/* ─── How this works ────────────────────────────────────────────── */}
      <div className="rounded-xl border border-greenDark/30 bg-greenSoft/30 p-4 text-xs sm:text-[13px] text-ink leading-relaxed">
        <div className="flex items-center gap-2 mb-1.5 font-semibold text-greenDark">
          <Info size={14} /> How this works
        </div>
        For each deliverable below, set the <strong>minimum {currency} you'll accept</strong> per single posting.
        The benchmark column shows what {market} talent at your tier typically charges (Min / Median / Max).
        Sales will never quote a brand below your minimum without coming back to you first.
        Leave blank to skip a deliverable you don't want to do.
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
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="btn btn-primary inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 min-h-[48px] sm:min-h-[44px] disabled:opacity-50 w-full sm:w-auto order-1 sm:order-2 text-base sm:text-sm font-semibold"
        >
          <Send size={14} />
          {submitting ? 'Saving…' : (player.submitted_at ? 'Save revision' : 'Submit my minimums')}
        </button>
      </div>

      {done && !done.ok && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-700 flex items-start gap-2">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
          <div>
            <strong>Couldn't save.</strong> {done.error}
          </div>
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
  return (
    /* MOBILE: pure stack — label, then benchmark, then input. SM+: 12-col grid. */
    <div className="px-3 sm:px-4 py-3 sm:py-3.5 space-y-3 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-3 sm:items-center">
      <div className="sm:col-span-4">
        <div className="text-sm font-semibold text-ink">{d.label}</div>
        <div className="text-[11px] text-mute mt-0.5">{d.blurb}</div>
      </div>

      <div className="sm:col-span-5">
        {d.band ? (
          <div className="rounded-lg border border-line bg-bg/50 px-3 py-2 text-[11px] tabular-nums">
            <div className="text-mute font-semibold uppercase tracking-wider text-[10px] mb-1">
              {d.band.audience_market} benchmark
            </div>
            <div className="grid grid-cols-3 gap-2 text-ink">
              <div><span className="text-mute">Min</span> <span className="font-semibold">{fmtMoney(Number(d.band.min_sar))}</span></div>
              <div><span className="text-mute">Med</span> <span className="font-semibold text-greenDark">{fmtMoney(Number(d.band.median_sar))}</span></div>
              <div><span className="text-mute">Max</span> <span className="font-semibold">{fmtMoney(Number(d.band.max_sar))}</span></div>
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-mute italic">No regional benchmark on file yet — use your judgement.</div>
        )}
      </div>

      <div className="sm:col-span-3">
        <label className="text-[10px] uppercase tracking-wider text-mute font-bold flex items-center gap-1 mb-1">
          <ShieldCheck size={11} /> Your minimum ({currency})
        </label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={displayValue}
          onChange={e => handleInput(e.target.value)}
          placeholder={currency === 'USD' ? 'e.g. 2000' : 'e.g. 8000'}
          className="w-full text-right text-base sm:text-sm font-semibold tabular-nums border border-line rounded-lg px-3 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 bg-card focus:outline-none focus:ring-2 focus:ring-greenDark/40"
        />
      </div>
    </div>
  );
}
