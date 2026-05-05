'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Player } from '@/lib/types';
import { PLAYER_PLATFORMS } from '@/lib/types';
import { DATA_STATE_META, type DataCompleteness } from '@/lib/pricing';
import { Save, Trash2, Trophy, RefreshCw, ExternalLink, Info, ChevronDown, AlertCircle } from 'lucide-react';
import { tierBaseline, fmtBaseline } from '@/lib/floor-baselines';

const DATA_STATES: DataCompleteness[] = ['full', 'socials_only', 'tournament_only', 'minimal'];
const PEAK_TIERS = ['S', 'A', 'B', 'C', 'unrated'] as const;

const blank: any = {
  nickname: '', full_name: '', role: '', game: '', team: '', nationality: '', tier_code: '',
  avatar_url: '', date_of_birth: '', ingame_role: '',
  rate_ig_reel: 0, rate_ig_post: 0, rate_ig_story: 0, rate_tiktok_video: 0,
  rate_yt_short: 0, rate_x_post: 0, rate_fb_post: 0, rate_twitch_stream: 0,
  rate_twitch_integ: 0, rate_irl: 0,
  // Internal cost basis (commission/markup) intentionally left null —
  // forces a deliberate choice in the disclosure card. Pre-filled values
  // would screen-share commercial structure to anyone watching the form.
  commission: null, markup: null, floor_share: 0.5,
  authority_factor: 1.0, default_seasonality: 1.0, default_language: 1.0,
  // Data-state fields default to "minimal" — admin promotes as data lands.
  has_social_data: false, has_tournament_data: false, has_audience_demo: false,
  data_completeness: 'minimal',
  liquipedia_url: '', prize_money_24mo_usd: 0, peak_tournament_tier: null,
  current_ranking: '', last_major_finish_date: '', last_major_placement: '',
  achievement_decay_factor: 1.0,
};

/** Derive data_completeness from the booleans. Admin can manually override. */
function deriveCompleteness(v: any): DataCompleteness {
  if (v.has_social_data && v.has_tournament_data) return 'full';
  if (v.has_social_data && !v.has_tournament_data) return 'socials_only';
  if (!v.has_social_data && v.has_tournament_data) return 'tournament_only';
  return 'minimal';
}

export function PlayerForm({
  player, tiers,
}: {
  player: Player | null;
  tiers: { code: string; label: string }[];
}) {
  const router = useRouter();
  const [v, setV] = useState<any>(player ?? blank);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function set<K extends keyof Player>(k: K, val: any) {
    setV((s: any) => {
      const next = { ...s, [k]: val };
      // Auto-derive data_completeness whenever a boolean flips,
      // unless the admin has set it manually (we treat any direct
      // edit on the data_completeness select as an override).
      if (k === 'has_social_data' || k === 'has_tournament_data') {
        next.data_completeness = deriveCompleteness(next);
      }
      return next;
    });
  }

  async function pullLiquipedia() {
    if (!player) { setErr('Save the player first, then pull Liquipedia data.'); return; }
    if (!v.liquipedia_url) { setErr('Set a Liquipedia URL first.'); return; }
    setErr(null); setSyncing(true);
    try {
      const res = await fetch(`/api/admin/players/${player.id}/sync-liquipedia`, { method: 'POST' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Sync failed');
      }
      const j = await res.json();
      // Refresh the form with what the scraper wrote.
      setV((s: any) => ({
        ...s,
        prize_money_24mo_usd: j.prize_money_24mo_usd ?? s.prize_money_24mo_usd,
        peak_tournament_tier: j.peak_tournament_tier ?? s.peak_tournament_tier,
        last_major_finish_date: j.last_major_finish_date ?? s.last_major_finish_date,
        last_major_placement: j.last_major_placement ?? s.last_major_placement,
        achievement_decay_factor: j.achievement_decay_factor ?? s.achievement_decay_factor,
        has_tournament_data: true,
        liquipedia_synced_at: j.liquipedia_synced_at,
        data_completeness: deriveCompleteness({ ...s, has_tournament_data: true }),
      }));
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSyncing(false);
    }
  }

  async function save() {
    setErr(null); setFieldErrors({}); setSaving(true);
    try {
      const isEdit = !!player;
      const res = await fetch(isEdit ? `/api/admin/players/${player!.id}` : `/api/admin/players`, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(v),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (j.fieldErrors && typeof j.fieldErrors === 'object') {
          setFieldErrors(j.fieldErrors);
        } else {
          // Best-effort: parse "field 'X' is invalid" patterns into field map.
          const m = (j.error || '').match(/['"](\w+)['"]/);
          if (m) setFieldErrors({ [m[1]]: j.error });
        }
        throw new Error(j.error || 'Save failed');
      }
      router.push('/roster/players');
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
      setSaving(false);
    }
  }

  async function deactivate() {
    if (!player) return;
    if (!confirm(`Deactivate ${player.nickname}? They will no longer appear in the roster.`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/players/${player.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Delete failed');
      }
      router.push('/roster/players');
      router.refresh();
    } catch (e: any) {
      setErr(e.message); setSaving(false);
    }
  }

  const computedState = deriveCompleteness(v);
  const meta = DATA_STATE_META[(v.data_completeness as DataCompleteness) ?? computedState];
  const toneClass = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50  text-amber-700  border-amber-200',
    navy:  'bg-sky-50    text-sky-700    border-sky-200',
    red:   'bg-rose-50   text-rose-700   border-rose-200',
  }[meta.tone];

  return (
    <div className="space-y-6">
      <div className="card card-p">
        <h2 className="font-semibold mb-4">Identity</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Nickname <span className="text-rose-600">*</span></label>
            <input value={v.nickname ?? ''} onChange={e => set('nickname', e.target.value)}
              className="input" required />
            {fieldErrors.nickname && <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1"><AlertCircle size={11}/>{fieldErrors.nickname}</p>}
          </div>
          <Field label="Full name" v={v.full_name} on={x => set('full_name', x)} />
          <Field label="Role" v={v.role} on={x => set('role', x)} />
          <Field label="In-game role" v={v.ingame_role} on={x => set('ingame_role' as any, x)} />
          <Field label="Game" v={v.game} on={x => set('game', x)} />
          <Field label="Team" v={v.team} on={x => set('team', x)} />
          <Field label="Nationality" v={v.nationality} on={x => set('nationality', x)} />
          <div>
            <label className="label">Date of birth</label>
            <input type="date" value={v.date_of_birth || ''}
              onChange={e => set('date_of_birth' as any, e.target.value)} className="input" />
          </div>
          <Field label="Avatar URL — small face crop" v={v.avatar_url} on={x => set('avatar_url' as any, x)} />
          <Field label="Portrait URL — full photo (modal hero)" v={v.portrait_url} on={x => set('portrait_url' as any, x)} />
          <div>
            <label className="label">Tier <span className="text-rose-600">*</span></label>
            <select value={v.tier_code ?? ''} onChange={e => set('tier_code', e.target.value)} className="input" required>
              <option value="" disabled>— Choose a tier —</option>
              {tiers.map(t => <option key={t.code} value={t.code}>{t.code} — {t.label}</option>)}
            </select>
            {fieldErrors.tier_code && <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1"><AlertCircle size={11}/>{fieldErrors.tier_code}</p>}
            <p className="text-[11px] text-mute mt-1">Drives the floor — tier × game × platform_ratio.</p>
          </div>
        </div>
      </div>

      {/* ── Data state ──────────────────────────────────────────────── */}
      <div className="card card-p">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Data state</h2>
          <span className={`chip border text-xs ${toneClass}`}>{meta.label}</span>
        </div>
        <p className="text-sm text-mute mb-4">{meta.hint}</p>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <Bool label="Socials data" v={v.has_social_data} on={x => set('has_social_data' as any, x)} />
          <Bool label="Tournament data" v={v.has_tournament_data} on={x => set('has_tournament_data' as any, x)} />
          <Bool label="Audience demo" v={v.has_audience_demo} on={x => set('has_audience_demo' as any, x)} />
        </div>
        <div>
          <label className="label">Data completeness (override)</label>
          <select value={v.data_completeness ?? computedState}
            onChange={e => set('data_completeness' as any, e.target.value)}
            className="input">
            {DATA_STATES.map(s => (
              <option key={s} value={s}>{DATA_STATE_META[s].label}</option>
            ))}
          </select>
          <p className="text-xs text-mute mt-1">
            Auto-derived from the booleans above unless you override here.
          </p>
        </div>
      </div>

      {/* ── Tournament & Achievements (Liquipedia) ───────────────────── */}
      <div className="card card-p">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Trophy size={16} /> Tournament & Achievements
          </h2>
          {player && v.liquipedia_url && (
            <button onClick={pullLiquipedia} disabled={syncing} className="btn btn-ghost text-xs">
              <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing…' : 'Pull from Liquipedia'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="col-span-2">
            <label className="label">Liquipedia URL</label>
            <div className="flex gap-2">
              <input value={v.liquipedia_url ?? ''}
                onChange={e => set('liquipedia_url' as any, e.target.value)}
                placeholder="https://liquipedia.net/counterstrike/M0NESY"
                className="input flex-1" />
              {v.liquipedia_url && (
                <a href={v.liquipedia_url} target="_blank" rel="noreferrer"
                   className="btn btn-ghost text-xs">
                  <ExternalLink size={12} /> Open
                </a>
              )}
            </div>
            <p className="text-xs text-mute mt-1">
              Per-game subdomains: counterstrike, dota2, leagueoflegends, valorant, rainbowsix, fortnite, etc.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Num label="Prize money (24mo, USD)" v={v.prize_money_24mo_usd ?? 0}
            on={x => set('prize_money_24mo_usd' as any, x)} step={500} />
          <div>
            <label className="label">Peak tournament tier</label>
            <select value={v.peak_tournament_tier ?? 'unrated'}
              onChange={e => set('peak_tournament_tier' as any, e.target.value)} className="input">
              {PEAK_TIERS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <Field label="Current ranking" v={v.current_ranking}
            on={x => set('current_ranking' as any, x)} />
          <div>
            <label className="label">Last major finish date</label>
            <input type="date" value={v.last_major_finish_date || ''}
              onChange={e => set('last_major_finish_date' as any, e.target.value)} className="input" />
          </div>
          <Field label="Last major placement (e.g. 1st, Top 4)"
            v={v.last_major_placement} on={x => set('last_major_placement' as any, x)} />
          <Num label="Achievement decay factor (0–1.5)" v={v.achievement_decay_factor ?? 1.0}
            on={x => set('achievement_decay_factor' as any, x)} step={0.05} />
        </div>
        {v.liquipedia_synced_at && (
          <p className="text-xs text-mute mt-3">
            Last synced: {new Date(v.liquipedia_synced_at).toLocaleString()}
          </p>
        )}
      </div>

      <div className="card card-p">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold">Platform rates ({v.currency || 'SAR'})</h2>
          {v.tier_code ? (
            <span className="text-[11px] text-mute">Baseline shown per row — tier × game × platform ratio (Floor v3)</span>
          ) : (
            <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded">Pick a tier above to see baseline hints</span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-4 mt-3">
          {PLAYER_PLATFORMS.map(p => {
            const baseline = tierBaseline(v.tier_code, v.game, p.key);
            const current = Number(v[p.key] ?? 0);
            const offBy = baseline && current > 0
              ? ((current - baseline) / baseline) * 100
              : null;
            const tone = offBy == null ? 'text-mute'
              : Math.abs(offBy) < 10 ? 'text-emerald-700'
              : Math.abs(offBy) < 30 ? 'text-amber-700'
              : 'text-rose-700';
            return (
              <div key={p.key}>
                <label className="label">{p.label}</label>
                <input type="number" min={0} value={v[p.key] ?? 0}
                  onChange={e => set(p.key as any, parseFloat(e.target.value) || 0)}
                  className="input" />
                {baseline ? (
                  <p className={`text-[11px] mt-1 ${tone}`}>
                    Baseline: SAR {fmtBaseline(baseline)}
                    {current > 0 && offBy != null && (
                      <span className="ml-1 opacity-80">({offBy >= 0 ? '+' : ''}{offBy.toFixed(0)}%)</span>
                    )}
                  </p>
                ) : null}
                {fieldErrors[p.key] && <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1"><AlertCircle size={11}/>{fieldErrors[p.key]}</p>}
              </div>
            );
          })}
        </div>
      </div>

      <details className="card card-p group">
        <summary className="font-semibold cursor-pointer flex items-center justify-between list-none">
          <span className="flex items-center gap-2">
            Internal cost basis &amp; pricing factors
            <span className="text-[10px] uppercase tracking-wider bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-bold">Internal · do not screen-share</span>
          </span>
          <ChevronDown size={16} className="transition-transform group-open:rotate-180 text-mute" />
        </summary>
        <p className="text-[11px] text-mute mt-2 leading-relaxed">
          Commission and markup are Falcons internal cost structure — never visible to brands. Floor share, authority factor, and default multipliers feed the SOT engine; multipliers can be overridden per-quote by sales.
        </p>
        <div className="grid grid-cols-4 gap-4 mt-4">
          <NumWithHint label="Commission" hint="Falcons take as fraction (0.30 = 30%). Talent cut = 1 − commission. Internal only." v={v.commission} on={x => set('commission', x)} step={0.01} placeholder="(blank)" />
          <NumWithHint label="Markup" hint="Falcons margin uplift on top of talent cost. Internal only." v={v.markup} on={x => set('markup', x)} step={0.01} placeholder="(blank)" />
          <NumWithHint label="Floor share" hint="Authority floor multiplier. IRL × floor_share = guaranteed pro-player line minimum. Range 0–1." v={v.floor_share} on={x => set('floor_share', x)} step={0.05} />
          <NumWithHint label="Authority factor" hint="Pro-player authority multiplier. 1.00 = none, 1.30 = elite contender, 1.50 = global star / major winner." v={v.authority_factor} on={x => set('authority_factor', x)} step={0.05} />
          <NumWithHint label="Default seasonality" hint="Default tournament-cycle multiplier. 1.00 = regular season, 1.20 = playoffs, 1.35 = finals/peak. Reps override per-quote." v={v.default_seasonality} on={x => set('default_seasonality', x)} step={0.05} />
          <NumWithHint label="Default language" hint="Default language multiplier. 1.00 = English, 1.10 = Arabic, 1.20 = Bilingual EN+AR. Reps override per-quote." v={v.default_language} on={x => set('default_language', x)} step={0.05} />
        </div>
      </details>

      <div className="card card-p">
        <h2 className="font-semibold mb-4">Socials & followers</h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <Field label="Instagram handle" v={v.instagram} on={x => set('instagram' as any, x)} />
          <Field label="X / Twitter handle" v={v.x_handle} on={x => set('x_handle' as any, x)} />
          <Field label="TikTok handle" v={v.tiktok} on={x => set('tiktok' as any, x)} />
          <Field label="YouTube handle" v={v.youtube} on={x => set('youtube' as any, x)} />
          <Field label="Twitch handle" v={v.twitch} on={x => set('twitch' as any, x)} />
          <Field label="Kick handle" v={v.kick} on={x => set('kick' as any, x)} />
        </div>
        <div className="grid grid-cols-4 gap-4">
          <Num label="IG followers" v={v.followers_ig ?? 0} on={x => set('followers_ig' as any, x)} step={1000} />
          <Num label="X followers" v={v.followers_x ?? 0} on={x => set('followers_x' as any, x)} step={1000} />
          <Num label="TikTok followers" v={v.followers_tiktok ?? 0} on={x => set('followers_tiktok' as any, x)} step={1000} />
          <Num label="YT subs" v={v.followers_yt ?? 0} on={x => set('followers_yt' as any, x)} step={1000} />
          <Num label="Twitch followers" v={v.followers_twitch ?? 0} on={x => set('followers_twitch' as any, x)} step={1000} />
          <Num label="FB followers" v={v.followers_fb ?? 0} on={x => set('followers_fb' as any, x)} step={1000} />
          <Num label="Snap followers" v={v.followers_snap ?? 0} on={x => set('followers_snap' as any, x)} step={1000} />
        </div>
      </div>

      <div className="card card-p">
        <label className="label">Notes</label>
        <textarea value={v.notes ?? ''} onChange={e => set('notes' as any, e.target.value)}
          rows={3} className="input resize-none"
          placeholder="Internal context — agency, contract dates, anything sales should know." />
        <p className="text-[11px] text-mute mt-1">Internal only — do not include sensitive agent negotiations or client-facing language.</p>
      </div>

      {/* Spacer so sticky footer doesn't overlap the last card on small viewports */}
      <div className="h-20"></div>

      <div className="sticky bottom-0 left-0 right-0 -mx-4 sm:-mx-6 lg:-mx-8 bg-card/95 backdrop-blur border-t border-line px-4 sm:px-6 lg:px-8 py-3 z-30 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
        {err && (
          <div className="text-sm text-rose-600 mb-2 flex items-center gap-2">
            <AlertCircle size={14} />
            {err}
            {Object.keys(fieldErrors).length > 0 && (
              <span className="text-mute">— scroll up: highlighted fields need attention.</span>
            )}
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <button onClick={save} disabled={saving || !v.nickname || !v.tier_code} className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed" title={!v.nickname || !v.tier_code ? 'Nickname and Tier are required' : ''}>
            <Save size={14} /> {saving ? 'Saving…' : (player ? 'Save changes' : 'Create player')}
          </button>
          {player && (
            <button onClick={deactivate} disabled={saving} className="btn btn-ghost text-rose-600">
              <Trash2 size={14} /> Deactivate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Number input with a tooltip-style hint. Used for SOT-internal terms. */
function NumWithHint({ label, hint, v, on, step = 1, placeholder }: {
  label: string; hint: string; v: number | null | undefined; on: (x: number) => void; step?: number; placeholder?: string;
}) {
  return (
    <div>
      <label className="label flex items-center gap-1">
        {label}
        <span title={hint} className="text-mute hover:text-ink cursor-help">
          <Info size={11} />
        </span>
      </label>
      <input type="number" step={step} value={v ?? ''}
        onChange={e => on(parseFloat(e.target.value) || 0)} className="input"
        placeholder={placeholder} />
    </div>
  );
}

function Field({ label, v, on }: { label: string; v?: string; on: (x: string) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input value={v ?? ''} onChange={e => on(e.target.value)} className="input" />
    </div>
  );
}

function Num({ label, v, on, step = 1 }: { label: string; v: number; on: (x: number) => void; step?: number }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type="number" step={step} value={v ?? 0}
        onChange={e => on(parseFloat(e.target.value) || 0)} className="input" />
    </div>
  );
}

function Bool({ label, v, on }: { label: string; v: boolean; on: (x: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={!!v} onChange={e => on(e.target.checked)} className="h-4 w-4" />
      <span className="text-sm">{label}</span>
    </label>
  );
}
