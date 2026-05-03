'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Creator } from '@/lib/types';
import { Save, Trash2, Info, AlertCircle } from 'lucide-react';
import { tierBaseline, fmtBaseline } from '@/lib/floor-baselines';

const blank: Partial<Creator> = {
  nickname: '', full_name: '', nationality: '', tier_code: '', score: 0,
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function set<K extends keyof Creator>(k: K, val: any) {
    setV((s: any) => ({ ...s, [k]: val }));
  }

  async function save() {
    setErr(null); setFieldErrors({}); setSaving(true);
    try {
      const isEdit = !!creator;
      const res = await fetch(isEdit ? `/api/admin/creators/${creator!.id}` : `/api/admin/creators`, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(v),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (j.fieldErrors && typeof j.fieldErrors === 'object') {
          setFieldErrors(j.fieldErrors);
        } else {
          const m = (j.error || '').match(/['"](\w+)['"]/);
          if (m) setFieldErrors({ [m[1]]: j.error });
        }
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
          <div>
            <label className="label">Nickname <span className="text-rose-600">*</span></label>
            <input value={v.nickname ?? ''} onChange={e => set('nickname', e.target.value)}
              className="input" required />
            {fieldErrors.nickname && <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1"><AlertCircle size={11}/>{fieldErrors.nickname}</p>}
          </div>
          <Field label="Full name" v={v.full_name} on={x => set('full_name' as any, x)} />
          <Field label="Nationality" v={v.nationality} on={x => set('nationality' as any, x)} />
          <div>
            <label className="label">Tier <span className="text-rose-600">*</span></label>
            <select value={v.tier_code ?? ''} onChange={e => set('tier_code', e.target.value)} className="input" required>
              <option value="" disabled>— Choose a tier —</option>
              {tiers.map(t => <option key={t.code} value={t.code}>{t.code} — {t.label}</option>)}
            </select>
            {fieldErrors.tier_code && <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1"><AlertCircle size={11}/>{fieldErrors.tier_code}</p>}
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
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold">Rate card (SAR)</h2>
          {v.tier_code ? (
            <span className="text-[11px] text-mute">Baseline shown per row — tier × creator-game × platform ratio</span>
          ) : (
            <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded">Pick a tier above to see baseline hints</span>
          )}
        </div>
        <p className="text-xs text-mute mb-4">Per-deliverable base rate. The Configurator's axes layer on top per-quote.</p>

        <h3 className="text-xs uppercase tracking-wider text-mute font-bold mb-2">Instagram</h3>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <RateNum tier={v.tier_code} platformKey="rate_ig_reels" label="IG Reels" v={v.rate_ig_reels} on={x => set('rate_ig_reels', x)} step={500} />
          <RateNum tier={v.tier_code} platformKey="rate_ig_post" label="IG Post" v={v.rate_ig_post} on={x => set('rate_ig_post', x)} step={500} />
          <RateNum tier={v.tier_code} platformKey="rate_ig_story" label="IG Story" v={v.rate_ig_story} on={x => set('rate_ig_story', x)} step={500} />
        </div>

        <h3 className="text-xs uppercase tracking-wider text-mute font-bold mb-2">TikTok</h3>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <RateNum tier={v.tier_code} platformKey="rate_tiktok_ours" label="TikTok – Falcons account (Ours)" v={v.rate_tiktok_ours} on={x => set('rate_tiktok_ours', x)} step={500} />
          <RateNum tier={v.tier_code} platformKey="rate_tiktok_client" label="TikTok – Client account (Theirs)" v={v.rate_tiktok_client} on={x => set('rate_tiktok_client', x)} step={500} />
        </div>

        <h3 className="text-xs uppercase tracking-wider text-mute font-bold mb-2">YouTube</h3>
        <div className="grid grid-cols-4 gap-3 mb-4">
          <RateNum tier={v.tier_code} platformKey="rate_yt_full" label="YT Full Video" v={v.rate_yt_full} on={x => set('rate_yt_full', x)} step={1000} />
          <RateNum tier={v.tier_code} platformKey="rate_yt_preroll" label="YT Pre-roll" v={v.rate_yt_preroll} on={x => set('rate_yt_preroll', x)} step={500} />
          <RateNum tier={v.tier_code} platformKey="rate_yt_shorts" label="YT Short" v={v.rate_yt_shorts} on={x => set('rate_yt_shorts', x)} step={500} />
          <RateNum tier={v.tier_code} platformKey="rate_yt_shorts_repost" label="YT Short Repost" v={v.rate_yt_shorts_repost ?? 0} on={x => set('rate_yt_shorts_repost' as any, x)} step={500} />
        </div>

        <h3 className="text-xs uppercase tracking-wider text-mute font-bold mb-2">X / Snapchat / Telegram</h3>
        <div className="grid grid-cols-4 gap-3 mb-4">
          <RateNum tier={v.tier_code} platformKey="rate_x_post_quote" label="X Post / Quote" v={v.rate_x_post_quote} on={x => set('rate_x_post_quote', x)} step={250} />
          <RateNum tier={v.tier_code} platformKey="rate_x_repost" label="X Repost" v={v.rate_x_repost} on={x => set('rate_x_repost', x)} step={250} />
          <RateNum tier={v.tier_code} platformKey="rate_snapchat" label="Snapchat" v={v.rate_snapchat} on={x => set('rate_snapchat', x)} step={500} />
          <RateNum tier={v.tier_code} platformKey="rate_telegram" label="Telegram" v={v.rate_telegram} on={x => set('rate_telegram', x)} step={250} />
        </div>

        <h3 className="text-xs uppercase tracking-wider text-mute font-bold mb-2">Live &amp; events</h3>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <RateNum tier={v.tier_code} platformKey="rate_twitch_kick_live" label="Twitch / Kick Live Stream" v={v.rate_twitch_kick_live} on={x => set('rate_twitch_kick_live', x)} step={1000} />
          <RateNum tier={v.tier_code} platformKey="rate_kick_irl" label="Kick IRL / Event" v={v.rate_kick_irl} on={x => set('rate_kick_irl', x)} step={1000} />
          <RateNum tier={v.tier_code} platformKey="rate_event_snap" label="Event + Snap Coverage" v={v.rate_event_snap} on={x => set('rate_event_snap', x)} step={1000} />
        </div>

        <h3 className="text-xs uppercase tracking-wider text-mute font-bold mb-2">Monthly rights</h3>
        <div className="grid grid-cols-2 gap-3">
          <RateNum tier={v.tier_code} platformKey="rate_usage_monthly" label="Usage Rights / month" v={v.rate_usage_monthly} on={x => set('rate_usage_monthly', x)} step={500} />
          <RateNum tier={v.tier_code} platformKey="rate_promo_monthly" label="Promo / month" v={v.rate_promo_monthly} on={x => set('rate_promo_monthly', x)} step={500} />
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
            <Save size={14}/> {saving ? 'Saving…' : creator ? 'Save changes' : 'Create creator'}
          </button>
          {creator && (
            <button onClick={deactivate} disabled={saving} className="btn btn-ghost text-rose-600">
              <Trash2 size={14}/> Deactivate
            </button>
          )}
        </div>
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
/** Rate-input with tier × platform baseline hint. Used for every rate_* field. */
function RateNum({ tier, platformKey, label, v, on, step = 1 }: {
  tier?: string | null; platformKey: string; label: string; v: number | null | undefined; on: (x: number) => void; step?: number;
}) {
  const baseline = tierBaseline(tier, 'Esports Influencers', platformKey);
  const current = Number(v ?? 0);
  const offBy = baseline && current > 0 ? ((current - baseline) / baseline) * 100 : null;
  const tone = offBy == null ? 'text-mute'
    : Math.abs(offBy) < 10 ? 'text-emerald-700'
    : Math.abs(offBy) < 30 ? 'text-amber-700'
    : 'text-rose-700';
  return (
    <div>
      <label className="label">{label}</label>
      <input type="number" min={0} step={step} value={v ?? 0}
        onChange={e => on(parseFloat(e.target.value) || 0)} className="input" />
      {baseline ? (
        <p className={`text-[11px] mt-1 ${tone}`}>
          Baseline: SAR {fmtBaseline(baseline)}
          {current > 0 && offBy != null && (
            <span className="ml-1 opacity-80">({offBy >= 0 ? '+' : ''}{offBy.toFixed(0)}%)</span>
          )}
        </p>
      ) : null}
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
