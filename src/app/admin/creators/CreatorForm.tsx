'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Creator } from '@/lib/types';
import { Save, Trash2 } from 'lucide-react';

const blank: Partial<Creator> = {
  nickname: '', full_name: '', nationality: '', tier_code: 'Tier 3', score: 30,
  link: '', notes: '',
  handle_ig: '', handle_x: '', handle_yt: '', handle_tiktok: '', handle_twitch: '',
  followers_ig: 0, followers_x: 0, followers_yt: 0, followers_tiktok: 0, followers_twitch: 0,
  rate_x_post_quote: 0, rate_x_repost: 0,
  rate_ig_post: 0, rate_ig_story: 0, rate_ig_reels: 0,
  rate_yt_full: 0, rate_yt_preroll: 0, rate_yt_shorts: 0,
  rate_snapchat: 0, rate_tiktok_ours: 0, rate_tiktok_client: 0,
  rate_event_snap: 0, rate_twitch_kick_live: 0, rate_kick_irl: 0,
  rate_telegram: 0, rate_usage_monthly: 0, rate_promo_monthly: 0,
};

export function CreatorForm({
  creator, tiers,
}: { creator: Creator | null; tiers: { code: string; label: string }[] }) {
  const router = useRouter();
  const [v, setV] = useState<any>(creator ?? blank);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof Creator>(k: K, val: any) {
    setV((s: any) => ({ ...s, [k]: val }));
  }

  async function save() {
    setErr(null); setSaving(true);
    try {
      const isEdit = !!creator;
      const res = await fetch(isEdit ? `/api/admin/creators/${creator!.id}` : `/api/admin/creators`, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(v),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Save failed');
      }
      router.push('/roster/creators');
      router.refresh();
    } catch (e: any) { setErr(e.message); setSaving(false); }
  }

  async function deactivate() {
    if (!creator) return;
    if (!confirm(`Deactivate ${creator.nickname}? Soft delete — historic quote lines preserved.`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/creators/${creator.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      router.push('/roster/creators');
      router.refresh();
    } catch (e: any) { setErr(e.message); setSaving(false); }
  }

  return (
    <div className="space-y-6">
      {/* IDENTITY */}
      <div className="card card-p">
        <h2 className="font-semibold mb-4">Identity</h2>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Nickname *" v={v.nickname} on={x => set('nickname', x)} />
          <Field label="Full name" v={v.full_name} on={x => set('full_name' as any, x)} />
          <Field label="Nationality" v={v.nationality} on={x => set('nationality' as any, x)} />
          <div>
            <label className="label">Tier</label>
            <select value={v.tier_code} onChange={e => set('tier_code', e.target.value)} className="input">
              {tiers.map(t => <option key={t.code} value={t.code}>{t.code} — {t.label}</option>)}
            </select>
          </div>
          <Num label="Score (0-100)" v={v.score} on={x => set('score' as any, x)} step={1} />
          <Field label="Link / Profile URL" v={v.link} on={x => set('link' as any, x)} />
        </div>
      </div>

      {/* SOCIAL HANDLES + FOLLOWERS */}
      <div className="card card-p">
        <h2 className="font-semibold mb-4">Social handles &amp; follower counts</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {[
            { handle: 'handle_yt',     followers: 'followers_yt',     label: 'YouTube' },
            { handle: 'handle_tiktok', followers: 'followers_tiktok', label: 'TikTok' },
            { handle: 'handle_ig',     followers: 'followers_ig',     label: 'Instagram' },
            { handle: 'handle_x',      followers: 'followers_x',      label: 'X / Twitter' },
            { handle: 'handle_twitch', followers: 'followers_twitch', label: 'Twitch' },
          ].map(p => (
            <div key={p.handle} className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="label">{p.label} URL</label>
                <input className="input" value={v[p.handle] ?? ''} onChange={e => set(p.handle as any, e.target.value)} placeholder="https://…" />
              </div>
              <div>
                <label className="label">Followers</label>
                <input type="number" min={0} step={100} className="input" value={v[p.followers] ?? 0} onChange={e => set(p.followers as any, parseInt(e.target.value) || 0)} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RATES — all platforms */}
      <div className="card card-p">
        <h2 className="font-semibold mb-1">Rate card (SAR)</h2>
        <p className="text-xs text-mute mb-4">Per-deliverable base rate. The Configurator's axes layer on top per-quote.</p>

        <h3 className="text-xs uppercase tracking-wider text-mute font-bold mb-2">Instagram</h3>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Num label="IG Reels" v={v.rate_ig_reels} on={x => set('rate_ig_reels', x)} step={500} />
          <Num label="IG Post"  v={v.rate_ig_post}  on={x => set('rate_ig_post',  x)} step={500} />
          <Num label="IG Story" v={v.rate_ig_story} on={x => set('rate_ig_story', x)} step={500} />
        </div>

        <h3 className="text-xs uppercase tracking-wider text-mute font-bold mb-2">TikTok</h3>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Num label="TikTok – Falcons account (Ours)" v={v.rate_tiktok_ours}   on={x => set('rate_tiktok_ours', x)}   step={500} />
          <Num label="TikTok – Client account (Theirs)" v={v.rate_tiktok_client} on={x => set('rate_tiktok_client', x)} step={500} />
        </div>

        <h3 className="text-xs uppercase tracking-wider text-mute font-bold mb-2">YouTube</h3>
        <div className="grid grid-cols-4 gap-3 mb-4">
          <Num label="YT Full Video" v={v.rate_yt_full}    on={x => set('rate_yt_full', x)}    step={1000} />
          <Num label="YT Pre-roll"   v={v.rate_yt_preroll} on={x => set('rate_yt_preroll', x)} step={500} />
          <Num label="YT Short"      v={v.rate_yt_shorts}  on={x => set('rate_yt_shorts', x)}  step={500} />
          <Num label="YT Short Repost" v={v.rate_yt_shorts_repost ?? 0} on={x => set('rate_yt_shorts_repost' as any, x)} step={500} />
        </div>

        <h3 className="text-xs uppercase tracking-wider text-mute font-bold mb-2">X / Snapchat / Telegram</h3>
        <div className="grid grid-cols-4 gap-3 mb-4">
          <Num label="X Post / Quote" v={v.rate_x_post_quote} on={x => set('rate_x_post_quote', x)} step={250} />
          <Num label="X Repost"       v={v.rate_x_repost}     on={x => set('rate_x_repost', x)}     step={250} />
          <Num label="Snapchat"       v={v.rate_snapchat}     on={x => set('rate_snapchat', x)}     step={500} />
          <Num label="Telegram"       v={v.rate_telegram}     on={x => set('rate_telegram', x)}     step={250} />
        </div>

        <h3 className="text-xs uppercase tracking-wider text-mute font-bold mb-2">Live &amp; events</h3>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Num label="Twitch / Kick Live Stream" v={v.rate_twitch_kick_live} on={x => set('rate_twitch_kick_live', x)} step={1000} />
          <Num label="Kick IRL / Event"          v={v.rate_kick_irl}         on={x => set('rate_kick_irl', x)}         step={1000} />
          <Num label="Event + Snap Coverage"     v={v.rate_event_snap}       on={x => set('rate_event_snap', x)}       step={1000} />
        </div>

        <h3 className="text-xs uppercase tracking-wider text-mute font-bold mb-2">Monthly rights</h3>
        <div className="grid grid-cols-2 gap-3">
          <Num label="Usage Rights / month" v={v.rate_usage_monthly} on={x => set('rate_usage_monthly', x)} step={500} />
          <Num label="Promo / month"        v={v.rate_promo_monthly} on={x => set('rate_promo_monthly', x)} step={500} />
        </div>
      </div>

      {/* NOTES */}
      <div className="card card-p">
        <label className="label">Notes</label>
        <textarea value={v.notes ?? ''} onChange={e => set('notes' as any, e.target.value)}
          rows={4} className="input resize-none"
          placeholder="Audience demos, achievements, vertical positioning, anything sales should know" />
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="flex items-center justify-between">
        <button onClick={save} disabled={saving} className="btn btn-primary">
          <Save size={14} /> {saving ? 'Saving…' : (creator ? 'Save changes' : 'Create creator')}
        </button>
        {creator && (
          <button onClick={deactivate} disabled={saving} className="btn btn-ghost text-red-600">
            <Trash2 size={14} /> Deactivate
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, v, on }: { label: string; v: any; on: (x: string) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" value={v ?? ''} onChange={e => on(e.target.value)} />
    </div>
  );
}
function Num({ label, v, on, step }: { label: string; v: any; on: (x: number) => void; step?: number }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type="number" className="input" value={v ?? 0} step={step ?? 1} onChange={e => on(parseFloat(e.target.value) || 0)} />
    </div>
  );
}
