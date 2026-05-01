'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Player } from '@/lib/types';
import { PLAYER_PLATFORMS } from '@/lib/types';
import { DATA_STATE_META, type DataCompleteness } from '@/lib/pricing';
import { Save, Trash2, Trophy, RefreshCw, ExternalLink } from 'lucide-react';

const DATA_STATES: DataCompleteness[] = ['full', 'socials_only', 'tournament_only', 'minimal'];
const PEAK_TIERS = ['S', 'A', 'B', 'C', 'unrated'] as const;

const blank: any = {
  nickname: '', full_name: '', role: '', game: '', team: '', nationality: '', tier_code: 'Tier 3',
  avatar_url: '', date_of_birth: '', ingame_role: '',
  rate_ig_reel: 0, rate_ig_static: 0, rate_ig_story: 0, rate_tiktok_video: 0,
  rate_yt_short: 0, rate_x_post: 0, rate_fb_post: 0, rate_twitch_stream: 0,
  rate_twitch_integ: 0, rate_irl: 0,
  commission: 0.2, markup: 0.15, floor_share: 0.5,
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
    setErr(null); setSaving(true);
    try {
      const isEdit = !!player;
      const res = await fetch(isEdit ? `/api/admin/players/${player!.id}` : `/api/admin/players`, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(v),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
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
          <Field label="Nickname *" v={v.nickname} on={x => set('nickname', x)} />
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
          <Field label="Avatar URL or filename" v={v.avatar_url} on={x => set('avatar_url' as any, x)} />
          <div>
            <label className="label">Tier</label>
            <select value={v.tier_code} onChange={e => set('tier_code', e.target.value)} className="input">
              {tiers.map(t => <option key={t.code} value={t.code}>{t.code} — {t.label}</option>)}
            </select>
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
        <h2 className="font-semibold mb-4">Platform rates ({v.currency || 'SAR'})</h2>
        <div className="grid grid-cols-3 gap-4">
          {PLAYER_PLATFORMS.map(p => (
            <div key={p.key}>
              <label className="label">{p.label}</label>
              <input type="number" min={0} value={v[p.key] ?? 0}
                onChange={e => set(p.key as any, parseFloat(e.target.value) || 0)}
                className="input" />
            </div>
          ))}
        </div>
      </div>

      <div className="card card-p">
        <h2 className="font-semibold mb-4">Pricing factors</h2>
        <div className="grid grid-cols-4 gap-4">
          <Num label="Commission" v={v.commission} on={x => set('commission', x)} step={0.01} />
          <Num label="Markup" v={v.markup} on={x => set('markup', x)} step={0.01} />
          <Num label="Floor share" v={v.floor_share} on={x => set('floor_share', x)} step={0.05} />
          <Num label="Authority factor" v={v.authority_factor} on={x => set('authority_factor', x)} step={0.05} />
          <Num label="Default seasonality" v={v.default_seasonality} on={x => set('default_seasonality', x)} step={0.05} />
          <Num label="Default language" v={v.default_language} on={x => set('default_language', x)} step={0.05} />
        </div>
      </div>

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
          rows={3} className="input resize-none" />
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="flex items-center justify-between">
        <button onClick={save} disabled={saving} className="btn btn-primary">
          <Save size={14} /> {saving ? 'Saving…' : (player ? 'Save changes' : 'Create player')}
        </button>
        {player && (
          <button onClick={deactivate} disabled={saving} className="btn btn-ghost text-red-600">
            <Trash2 size={14} /> Deactivate
          </button>
        )}
      </div>
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
