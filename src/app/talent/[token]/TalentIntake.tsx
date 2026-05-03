'use client';
import { useMemo, useState } from 'react';
import { Trophy, ShieldCheck, Send, CheckCircle2, AlertCircle, Lock, Info, Instagram, Music2, Youtube, Twitch, Users } from 'lucide-react';

type Achievement = {
  title?: string; year?: string | number; placement?: string; tier?: string;
  prize_usd?: number | string;
  [k: string]: unknown;
};

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
  internal: number;     // current internal SAR rate
  band: Band;           // regional benchmark
  existing: number;     // previously submitted minimum (SAR)
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
  // ── Currency display toggle (SAR ↔ USD)
  // Talent picks either; we always STORE in SAR for the engine but display
  // and accept input in whichever currency the talent prefers.
  const SAR_PER_USD = 3.75;
  const [currency, setCurrency] = useState<'SAR' | 'USD'>('SAR');
  const fmtMoney = (sar: number) => {
    const n = currency === 'USD' ? Math.round(sar / SAR_PER_USD) : Math.round(sar);
    return `${currency} ${n.toLocaleString('en-US')}`;
  };
  // Convert a number typed by the talent (in their displayed currency) into SAR
  const toSar = (typed: number) => currency === 'USD' ? Math.round(typed * SAR_PER_USD) : Math.round(typed);
  // Convert a SAR amount → the input value the talent should see (their currency)
  const fromSar = (sar: number) => currency === 'USD' ? Math.round(sar / SAR_PER_USD) : Math.round(sar);

  // Per-deliverable input state. Always stored as SAR strings. Display layer
  // converts via fromSar/toSar.
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

  // Already submitted view
  if (done?.ok || (player.submitted_at && !done)) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border-2 border-greenDark/40 bg-greenSoft/40 p-8 text-center">
          <CheckCircle2 size={48} className="mx-auto text-greenDark mb-3" />
          <h1 className="text-2xl font-bold text-greenDark">Thank you, {player.nickname}.</h1>
          <p className="text-sm text-ink/80 mt-2 max-w-md mx-auto">
            Your minimums have been recorded. Your account manager will reach out
            before any quote goes below them. You can revise at any time —
            this same link stays active.
          </p>
        </div>
        <button
          onClick={() => setDone(null)}
          className="text-xs text-mute hover:text-ink underline mx-auto block"
        >
          Revise my minimums
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header card ────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-line bg-card overflow-hidden shadow-sm">
        <div className="bg-gradient-to-br from-greenDark to-greenDark/80 text-white p-6">
          <div className="flex items-center gap-4">
            {player.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={player.avatar_url} alt={player.nickname}
                className="w-20 h-20 rounded-full object-cover ring-2 ring-white/40" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
                {player.nickname.slice(0,2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wider opacity-80">Talent intake — minimum rates</div>
              <h1 className="text-2xl sm:text-3xl font-extrabold truncate">{player.nickname}</h1>
              <div className="text-sm opacity-90 mt-0.5">
                {[player.full_name, player.game, player.team].filter(Boolean).join(' · ')}
              </div>
              <div className="text-[11px] opacity-80 mt-1">
                {player.tier_code || 'Tier 3'} · {player.nationality || 'Region unspecified'} · benchmarks shown for {market}
              </div>
            </div>
            <div className="ml-auto self-start">
              <div className="inline-flex items-center rounded-lg border border-white/30 bg-white/10 overflow-hidden text-xs font-semibold">
                {(['SAR', 'USD'] as const).map((c, i) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCurrency(c)}
                    className={[
                      'px-3 py-1.5 transition',
                      i > 0 ? 'border-l border-white/30' : '',
                      currency === c ? 'bg-white text-greenDark' : 'text-white/90 hover:bg-white/10',
                    ].join(' ')}
                    title={`Show prices in ${c}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-white/70 mt-1 text-right">@ 3.75 SAR/USD</div>
            </div>
          </div>
        </div>

        <div className="p-5 grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Stat icon={<Instagram size={14}/>} label="IG"      value={fmt(player.followers_ig)} />
          <Stat icon={<Music2 size={14}/>}    label="TikTok"  value={fmt(player.followers_tiktok)} />
          <Stat icon={<Youtube size={14}/>}   label="YouTube" value={fmt(player.followers_yt)} />
          <Stat icon={<Twitch size={14}/>}    label="Twitch"  value={fmt(player.followers_twitch)} />
          <Stat icon={<Users size={14}/>}     label="Total"   value={fmt(totalReach)} accent />
        </div>
      </div>

      {/* ─── Achievements (Liquipedia) ─────────────────────────────────── */}
      {player.achievements.length > 0 && (
        <div className="rounded-2xl border border-line bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy size={16} className="text-greenDark" />
              <h2 className="text-sm font-semibold text-ink">Career achievements (we have on file)</h2>
            </div>
            {player.liquipedia_url && (
              <a href={player.liquipedia_url} target="_blank" rel="noopener noreferrer"
                 className="text-[11px] text-mute hover:text-greenDark underline">View Liquipedia →</a>
            )}
          </div>
          <ul className="space-y-1.5 text-xs max-h-44 overflow-auto pr-2">
            {player.achievements.slice(0, 18).map((a, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3 border-b border-line/60 pb-1">
                <span className="text-ink truncate">
                  {a.placement ? <span className="font-semibold text-greenDark mr-1.5">{a.placement}</span> : null}
                  {a.title || a.tier || 'Tournament'}
                </span>
                <span className="text-mute tabular-nums whitespace-nowrap">{a.year || ''}</span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-mute mt-2">
            If anything's missing or wrong, mention it in the notes box below — we'll update it.
          </p>
        </div>
      )}

      {/* ─── How this works ────────────────────────────────────────────── */}
      <div className="rounded-xl border border-greenDark/30 bg-greenSoft/30 p-4 text-xs text-ink leading-relaxed">
        <div className="flex items-center gap-2 mb-1.5 font-semibold text-greenDark">
          <Info size={14} /> How this works
        </div>
        For each deliverable below, set the <strong>minimum {currency} you'll accept</strong> per single posting.
        The benchmark column shows what {market} talent at your tier typically charges (Min / Median / Max).
        Sales will never quote a brand below your minimum without coming back to you first.
        Leave blank to skip a deliverable you don't want to do.
      </div>

      {/* ─── Deliverable rows ──────────────────────────────────────────── */}
      <div className="space-y-5">
        {groups.map(([groupName, items]) => (
          <div key={groupName} className="rounded-2xl border border-line bg-card overflow-hidden">
            <div className="bg-bg/60 border-b border-line px-4 py-2 text-[11px] uppercase tracking-wider font-bold text-label">
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
      <div className="rounded-2xl border border-line bg-card p-5 space-y-2">
        <label className="text-xs font-semibold text-ink">Notes for your account manager (optional)</label>
        <textarea
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="e.g. exclusivity-only on energy-drink category, can't post on stream days during EWC, prefer non-gambling brands…"
          className="w-full text-sm border border-line rounded-lg px-3 py-2 bg-bg focus:outline-none focus:ring-2 focus:ring-greenDark/30"
        />
      </div>

      {/* ─── Submit ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between bg-card rounded-2xl border border-line p-4">
        <div className="flex items-center gap-2 text-[11px] text-mute">
          <Lock size={12} /> Private to you and Falcons Talent. Audit-logged.
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="btn btn-primary inline-flex items-center gap-2 px-5 py-2.5 disabled:opacity-50"
        >
          <Send size={14} />
          {submitting ? 'Saving…' : (player.submitted_at ? 'Save revision' : 'Submit my minimums')}
        </button>
      </div>

      {done && !done.ok && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-700 flex items-start gap-2">
          <AlertCircle size={14} className="mt-0.5" />
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
  // Convert stored SAR string ↔ displayed currency for the input field
  const displayValue = value === '' ? '' : String(fromSar(Number(value) || 0));
  const handleInput = (raw: string) => {
    const cleaned = raw.replace(/[^\d]/g, '');
    if (cleaned === '') { onChange(''); return; }
    onChange(String(toSar(Number(cleaned))));
  };
  return (
    <div className="px-4 py-3.5 grid grid-cols-12 gap-3 items-center">
      <div className="col-span-12 sm:col-span-4">
        <div className="text-sm font-semibold text-ink">{d.label}</div>
        <div className="text-[11px] text-mute mt-0.5">{d.blurb}</div>
      </div>

      <div className="col-span-7 sm:col-span-5">
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

      <div className="col-span-5 sm:col-span-3">
        <label className="text-[10px] uppercase tracking-wider text-mute font-bold flex items-center gap-1 mb-1">
          <ShieldCheck size={11} /> Your minimum ({currency})
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={e => handleInput(e.target.value)}
          placeholder={currency === 'USD' ? 'e.g. 2000' : 'e.g. 8000'}
          className="w-full text-right text-sm font-semibold tabular-nums border border-line rounded-lg px-2.5 py-1.5 bg-card focus:outline-none focus:ring-2 focus:ring-greenDark/40"
        />
      </div>
    </div>
  );
}
