'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Creator } from '@/lib/types';
import { Save, Trash2 } from 'lucide-react';

const blank: Partial<Creator> = {
  nickname: '', full_name: '', nationality: '', tier_code: 'Tier 3', score: 30,
  link: '', notes: '', avatar_url: '',
  brand_loyalty_default_pct: 0, exclusivity_premium_pct: 0,
  cross_vertical_multiplier: 1.0, engagement_quality_modifier: 1.0,
  production_style_default: 'standard',
  past_campaigns: [], delivered_kpis: [],
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

      {/* AVATAR */}
      <div className="card card-p">
        <h2 className="font-semibold mb-4">Photo</h2>
        <div className="flex items-start gap-4">
          {v.avatar_url && (
            <img
              src={v.avatar_url}
              alt={v.nickname || 'Avatar preview'}
              className="w-24 h-24 rounded-xl object-cover border border-line"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <div className="flex-1">
            <label className="label">Avatar URL</label>
            <input
              className="input"
              value={v.avatar_url ?? ''}
              onChange={e => set('avatar_url' as any, e.target.value)}
              placeholder="/avatars/creators/<slug>.png  or  https://..."
            />
            <p className="text-[11px] text-mute mt-1 leading-relaxed">
              Use a root-relative path like <code>/avatars/creators/banderitax.png</code> for files in the repo,
              or paste a Drive thumbnail / CDN URL. Image previews above when valid.
            </p>
          </div>
        </div>
      </div>

      {/* ADVANCED MULTIPLIERS — world best practice for creator pricing */}
      <div className="card card-p">
        <h2 className="font-semibold">Pricing multipliers</h2>
        <p className="text-xs text-mute mb-4">Defaults applied per-quote when this creator is added to a deal. Rep can override at quote time.</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Brand Loyalty Default</label>
            <select className="input" value={String(v.brand_loyalty_default_pct ?? 0)} onChange={e => set('brand_loyalty_default_pct' as any, parseFloat(e.target.value))}>
              <option value="0">0% (new brand)</option>
              <option value="0.10">−10% (2nd deal)</option>
              <option value="0.20">−20% (3+ deals)</option>
              <option value="0.30">−30% (annual contract)</option>
            </select>
            <p className="text-[10px] text-mute mt-1">Discount for recurring brand partnerships.</p>
          </div>
          <div>
            <label className="label">Exclusivity Premium Default</label>
            <select className="input" value={String(v.exclusivity_premium_pct ?? 0)} onChange={e => set('exclusivity_premium_pct' as any, parseFloat(e.target.value))}>
              <option value="0">0% (no exclusivity)</option>
              <option value="0.25">+25% (1 month)</option>
              <option value="0.50">+50% (1 quarter)</option>
              <option value="1.00">+100% (1 year)</option>
            </select>
            <p className="text-[10px] text-mute mt-1">Premium for category exclusivity period.</p>
          </div>
          <div>
            <label className="label">Cross-Vertical Multiplier</label>
            <select className="input" value={String(v.cross_vertical_multiplier ?? 1.0)} onChange={e => set('cross_vertical_multiplier' as any, parseFloat(e.target.value))}>
              <option value="1.0">×1.00 (gaming brand)</option>
              <option value="1.15">×1.15 (consumer brand)</option>
              <option value="1.30">×1.30 (mainstream non-endemic)</option>
            </select>
            <p className="text-[10px] text-mute mt-1">Bigger multiplier = creator's content/audience cuts across verticals.</p>
          </div>
          <div>
            <label className="label">Engagement Quality Modifier</label>
            <select className="input" value={String(v.engagement_quality_modifier ?? 1.0)} onChange={e => set('engagement_quality_modifier' as any, parseFloat(e.target.value))}>
              <option value="0.85">×0.85 (low ER &lt;2%)</option>
              <option value="1.0">×1.00 (avg 2-4%)</option>
              <option value="1.15">×1.15 (high 4-7%)</option>
              <option value="1.25">×1.25 (elite &gt;7%)</option>
            </select>
            <p className="text-[10px] text-mute mt-1">Based on measured engagement rate.</p>
          </div>
          <div>
            <label className="label">Production Style Default</label>
            <select className="input" value={v.production_style_default ?? 'standard'} onChange={e => set('production_style_default' as any, e.target.value)}>
              <option value="raw">Raw / UGC (×0.90)</option>
              <option value="standard">Standard edit (×1.00)</option>
              <option value="scripted">Scripted / branded (×1.20)</option>
              <option value="full_studio">Full studio production (×1.40)</option>
            </select>
            <p className="text-[10px] text-mute mt-1">Default content production style for this creator.</p>
          </div>
        </div>
      </div>

      {/* PAST CAMPAIGNS */}
      <div className="card card-p">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold">Past campaigns</h2>
            <p className="text-xs text-mute">Brand history — surfaces on the showcase as proof of partnership.</p>
          </div>
          <button type="button" onClick={() => set('past_campaigns' as any, [...(v.past_campaigns ?? []), { brand: '', year: new Date().getFullYear(), deliverable: '', reach: 0, engagement_rate: 0, conversion_signal: '', link: '', notes: '' }])}
            className="btn btn-secondary text-xs">+ Add campaign</button>
        </div>
        {(v.past_campaigns ?? []).length === 0 && <p className="text-xs text-mute italic">No campaigns logged yet.</p>}
        {(v.past_campaigns ?? []).map((c: any, i: number) => (
          <div key={i} className="border border-line rounded-lg p-3 mb-3 grid grid-cols-6 gap-2">
            <div className="col-span-2"><label className="label">Brand</label>
              <input className="input" value={c.brand ?? ''} onChange={e => { const arr = [...v.past_campaigns]; arr[i] = { ...arr[i], brand: e.target.value }; set('past_campaigns' as any, arr); }} placeholder="NVIDIA, KUDU, Saudia…" />
            </div>
            <div><label className="label">Year</label>
              <input type="number" className="input" value={c.year ?? ''} onChange={e => { const arr = [...v.past_campaigns]; arr[i] = { ...arr[i], year: parseInt(e.target.value) || null }; set('past_campaigns' as any, arr); }} />
            </div>
            <div className="col-span-2"><label className="label">Deliverable</label>
              <input className="input" value={c.deliverable ?? ''} onChange={e => { const arr = [...v.past_campaigns]; arr[i] = { ...arr[i], deliverable: e.target.value }; set('past_campaigns' as any, arr); }} placeholder="YT Full · IG Reel × 3 · etc." />
            </div>
            <div><button type="button" onClick={() => { const arr = v.past_campaigns.filter((_: any, j: number) => j !== i); set('past_campaigns' as any, arr); }} className="btn btn-ghost text-red-600 text-xs mt-5"><Trash2 size={12} /></button></div>
            <div className="col-span-2"><label className="label">Reach (impressions)</label>
              <input type="number" className="input" value={c.reach ?? 0} onChange={e => { const arr = [...v.past_campaigns]; arr[i] = { ...arr[i], reach: parseInt(e.target.value) || 0 }; set('past_campaigns' as any, arr); }} />
            </div>
            <div><label className="label">ER %</label>
              <input type="number" step="0.1" className="input" value={c.engagement_rate ?? 0} onChange={e => { const arr = [...v.past_campaigns]; arr[i] = { ...arr[i], engagement_rate: parseFloat(e.target.value) || 0 }; set('past_campaigns' as any, arr); }} />
            </div>
            <div className="col-span-2"><label className="label">Conversion signal</label>
              <input className="input" value={c.conversion_signal ?? ''} onChange={e => { const arr = [...v.past_campaigns]; arr[i] = { ...arr[i], conversion_signal: e.target.value }; set('past_campaigns' as any, arr); }} placeholder="5K SKU sold · 1.2K sign-ups · etc." />
            </div>
            <div className="col-span-3"><label className="label">Link to proof</label>
              <input className="input" value={c.link ?? ''} onChange={e => { const arr = [...v.past_campaigns]; arr[i] = { ...arr[i], link: e.target.value }; set('past_campaigns' as any, arr); }} placeholder="https://…" />
            </div>
            <div className="col-span-3"><label className="label">Notes</label>
              <input className="input" value={c.notes ?? ''} onChange={e => { const arr = [...v.past_campaigns]; arr[i] = { ...arr[i], notes: e.target.value }; set('past_campaigns' as any, arr); }} />
            </div>
          </div>
        ))}
      </div>

      {/* DELIVERED KPIs */}
      <div className="card card-p">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold">Delivered KPIs (track record)</h2>
            <p className="text-xs text-mute">Proof points for sales — drove X conversions, hit Y impressions, etc.</p>
          </div>
          <button type="button" onClick={() => set('delivered_kpis' as any, [...(v.delivered_kpis ?? []), { kpi: '', value: '', unit: '', source: '', captured_at: new Date().toISOString().slice(0,10) }])}
            className="btn btn-secondary text-xs">+ Add KPI</button>
        </div>
        {(v.delivered_kpis ?? []).length === 0 && <p className="text-xs text-mute italic">No KPIs logged yet.</p>}
        {(v.delivered_kpis ?? []).map((k: any, i: number) => (
          <div key={i} className="border border-line rounded-lg p-3 mb-3 grid grid-cols-6 gap-2">
            <div className="col-span-2"><label className="label">KPI</label>
              <input className="input" value={k.kpi ?? ''} onChange={e => { const arr = [...v.delivered_kpis]; arr[i] = { ...arr[i], kpi: e.target.value }; set('delivered_kpis' as any, arr); }} placeholder="Avg engagement rate" />
            </div>
            <div><label className="label">Value</label>
              <input className="input" value={k.value ?? ''} onChange={e => { const arr = [...v.delivered_kpis]; arr[i] = { ...arr[i], value: e.target.value }; set('delivered_kpis' as any, arr); }} placeholder="6.4" />
            </div>
            <div><label className="label">Unit</label>
              <input className="input" value={k.unit ?? ''} onChange={e => { const arr = [...v.delivered_kpis]; arr[i] = { ...arr[i], unit: e.target.value }; set('delivered_kpis' as any, arr); }} placeholder="%" />
            </div>
            <div><label className="label">Source</label>
              <input className="input" value={k.source ?? ''} onChange={e => { const arr = [...v.delivered_kpis]; arr[i] = { ...arr[i], source: e.target.value }; set('delivered_kpis' as any, arr); }} placeholder="Shikenso / IG insights" />
            </div>
            <div><button type="button" onClick={() => { const arr = v.delivered_kpis.filter((_: any, j: number) => j !== i); set('delivered_kpis' as any, arr); }} className="btn btn-ghost text-red-600 text-xs mt-5"><Trash2 size={12} /></button></div>
          </div>
        ))}
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
