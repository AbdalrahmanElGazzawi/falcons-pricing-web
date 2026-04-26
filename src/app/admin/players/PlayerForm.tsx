'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Player } from '@/lib/types';
import { PLAYER_PLATFORMS } from '@/lib/types';
import { Save, Trash2 } from 'lucide-react';

const CONFIDENCES = ['pending', 'estimated', 'rounded', 'exact'] as const;

const blank: Partial<Player> = {
  nickname: '', full_name: '', role: '', game: '', team: '', nationality: '', tier_code: 'Tier 3',
  avatar_url: '', date_of_birth: '', ingame_role: '',
  rate_ig_reel: 0, rate_ig_static: 0, rate_ig_story: 0, rate_tiktok_video: 0,
  rate_yt_short: 0, rate_x_post: 0, rate_fb_post: 0, rate_twitch_stream: 0,
  rate_twitch_integ: 0, rate_irl: 0,
  commission: 0.2, markup: 0.15, floor_share: 0.5,
  authority_factor: 1.0, default_seasonality: 1.0, default_language: 1.0,
  default_audience: 1.0, default_engagement: 1.0,
  measurement_confidence: 'estimated',
};

export function PlayerForm({
  player, tiers,
}: {
  player: Player | null;
  tiers: { code: string; label: string }[];
}) {
  const router = useRouter();
  const [v, setV] = useState<any>(player ?? blank);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof Player>(k: K, val: any) {
    setV((s: any) => ({ ...s, [k]: val }));
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
          <div>
            <label className="label">Measurement confidence</label>
            <select value={v.measurement_confidence}
              onChange={e => set('measurement_confidence', e.target.value)} className="input">
              {CONFIDENCES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
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
          <Num label="Default audience" v={v.default_audience ?? 1.0} on={x => set('default_audience' as any, x)} step={0.05} />
          <Num label="Default engagement" v={v.default_engagement ?? 1.0} on={x => set('default_engagement' as any, x)} step={0.05} />
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
