'use client';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Creator } from '@/lib/types';
import {
  fmtCurrency, tierClass, fmtFollowers, totalReach, maxPlatformReach,
  tierReviewFlag, expectedTierFromMax,
} from '@/lib/utils';
import { useDisplayCurrency } from '@/lib/use-display-currency';
import { useTierReviewSettings } from '@/lib/use-tier-review-settings';
import { CurrencyPill } from '@/components/CurrencyPill';
import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/components/Toast';
import { SearchInput } from '@/components/SearchInput';
import {
  Users, Rows2, Rows3, Rows4, Pencil, Check, X as XIcon,
  Twitch, Youtube, Instagram, Music2, AlertTriangle, Lock, Hourglass,
  Settings, Eye, EyeOff, Undo2, ArrowUpRight, ArrowDownRight, ChevronDown,
  Globe,
} from 'lucide-react';

type Density = 'compact' | 'comfortable' | 'spacious';

const KEY_PLATFORMS = [
  { key: 'rate_ig_reels',         label: 'IG Reel'  },
  { key: 'rate_ig_post',          label: 'IG Post'  },
  { key: 'rate_yt_full',          label: 'YT Full'  },
  { key: 'rate_yt_shorts',        label: 'YT Short' },
  { key: 'rate_tiktok_ours',      label: 'TikTok'   },
  { key: 'rate_x_post_quote',     label: 'X Post'   },
  { key: 'rate_twitch_kick_live', label: 'Twitch/Kick' },
] as const;

type RateKey = typeof KEY_PLATFORMS[number]['key'];

type EditDraft = {
  nickname: string;
  full_name: string;
  nationality: string;
  avatar_url: string;
  tier_code: string;
  score: string;
  link: string;
  audience_market: string;
  handle_ig: string;
  handle_x: string;
  handle_yt: string;
  handle_tiktok: string;
  handle_twitch: string;
  followers_ig: string;
  followers_x: string;
  followers_yt: string;
  followers_tiktok: string;
  followers_twitch: string;
} & Record<RateKey, string>;

function toDraft(c: Creator): EditDraft {
  const draft: any = {
    nickname:        c.nickname ?? '',
    full_name:       c.full_name ?? '',
    nationality:     c.nationality ?? '',
    avatar_url:      c.avatar_url ?? '',
    tier_code:       c.tier_code ?? '',
    score:           c.score != null ? String(c.score) : '',
    link:            c.link ?? '',
    audience_market: (c as any).audience_market ?? '',
    handle_ig:       c.handle_ig ?? '',
    handle_x:        c.handle_x ?? '',
    handle_yt:       c.handle_yt ?? '',
    handle_tiktok:   c.handle_tiktok ?? '',
    handle_twitch:   c.handle_twitch ?? '',
    followers_ig:       c.followers_ig != null ? String(c.followers_ig) : '',
    followers_x:        c.followers_x != null ? String(c.followers_x) : '',
    followers_yt:       c.followers_yt != null ? String(c.followers_yt) : '',
    followers_tiktok:   c.followers_tiktok != null ? String(c.followers_tiktok) : '',
    followers_twitch:   c.followers_twitch != null ? String(c.followers_twitch) : '',
  };
  for (const p of KEY_PLATFORMS) {
    const v = (c as any)[p.key];
    draft[p.key] = v != null ? String(v) : '';
  }
  return draft as EditDraft;
}

function draftToPatch(d: EditDraft) {
  const patch: any = {
    nickname:        d.nickname.trim(),
    full_name:       d.full_name.trim() || null,
    nationality:     d.nationality.trim() || null,
    avatar_url:      d.avatar_url.trim() || null,
    tier_code:       d.tier_code.trim() || null,
    score:           d.score === '' ? null : Number(d.score),
    link:            d.link.trim() || null,
    audience_market: d.audience_market.trim() || null,
    handle_ig:       d.handle_ig.trim() || null,
    handle_x:        d.handle_x.trim() || null,
    handle_yt:       d.handle_yt.trim() || null,
    handle_tiktok:   d.handle_tiktok.trim() || null,
    handle_twitch:   d.handle_twitch.trim() || null,
    followers_ig:       d.followers_ig === '' ? null : Number(d.followers_ig),
    followers_x:        d.followers_x === '' ? null : Number(d.followers_x),
    followers_yt:       d.followers_yt === '' ? null : Number(d.followers_yt),
    followers_tiktok:   d.followers_tiktok === '' ? null : Number(d.followers_tiktok),
    followers_twitch:   d.followers_twitch === '' ? null : Number(d.followers_twitch),
  };
  for (const p of KEY_PLATFORMS) {
    patch[p.key] = d[p.key] === '' ? null : Number(d[p.key]);
  }
  return patch;
}

const TIER_OPTIONS = ['Tier S', 'Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'];

export function CreatorsTable({
  creators: initialCreators, isAdmin,
}: { creators: Creator[]; isAdmin: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [creators, setCreators] = useState<Creator[]>(initialCreators);
  const [q, setQ] = useState('');
  const [tier, setTier] = useState('');
  const [country, setCountry] = useState('');
  const [market, setMarket] = useState('');
  const [density, setDensity] = useState<Density>('comfortable');
  const [reviewOnly, setReviewOnly] = useState(false);
  const tierReview = useTierReviewSettings('creators');
  const [showTrSettings, setShowTrSettings] = useState(false);
  const [ccy] = useDisplayCurrency();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [, startTransition] = useTransition();

  const tiers = useMemo(() => {
    const seen = new Set(creators.map(c => c.tier_code).filter(Boolean) as string[]);
    return TIER_OPTIONS.filter(t => seen.has(t));
  }, [creators]);

  const countries = useMemo(() => {
    const norm = (raw: string | null | undefined) => {
      const v = (raw ?? '').trim();
      if (!v) return '';
      return v.toLowerCase() === 'saudi' ? 'Saudi Arabia' : v;
    };
    return Array.from(new Set(creators.map(c => norm(c.nationality)).filter(Boolean))).sort() as string[];
  }, [creators]);

  const markets = useMemo(() => {
    return Array.from(new Set(creators.map(c => ((c as any).audience_market ?? '').trim()).filter(Boolean))).sort() as string[];
  }, [creators]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return creators.filter(c => {
      if (tier && c.tier_code !== tier) return false;
      if (country) {
        const nat = (c.nationality ?? '').trim().toLowerCase();
        const target = country.toLowerCase();
        if (target === 'saudi arabia') {
          if (!nat.startsWith('saudi')) return false;
        } else if (nat !== target) return false;
      }
      if (market && ((c as any).audience_market ?? '').trim() !== market) return false;
      if (reviewOnly) {
        if (tierReview.disabled) return false;
        if (tierReview.dismissed.has(c.id)) return false;
        const f = tierReviewFlag(c.tier_code, maxPlatformReach(c), { tolerance: tierReview.tolerance });
        if (f !== 'promote' && f !== 'demote') return false;
      }
      if (s) {
        const fields = [
          c.nickname, c.full_name, c.nationality, (c as any).audience_market,
          c.handle_ig, c.handle_x, c.handle_yt, c.handle_tiktok, c.handle_twitch,
        ];
        if (!fields.filter(Boolean).some(v => v!.toLowerCase().includes(s))) return false;
      }
      return true;
    });
  }, [creators, q, tier, country, market, reviewOnly, tierReview.disabled, tierReview.dismissed, tierReview.tolerance]);

  const reviewFlagCount = useMemo(() => {
    if (tierReview.disabled) return 0;
    return creators.filter(c => {
      if (tierReview.dismissed.has(c.id)) return false;
      const f = tierReviewFlag(c.tier_code, maxPlatformReach(c), { tolerance: tierReview.tolerance });
      return f === 'promote' || f === 'demote';
    }).length;
  }, [creators, tierReview.disabled, tierReview.dismissed, tierReview.tolerance]);

  async function patchCreator(id: number, body: Record<string, any>): Promise<boolean> {
    try {
      const res = await fetch(`/api/admin/creators/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error('Save failed', j.error || 'Please try again.'); return false; }
      setCreators(cs => cs.map(c => c.id === id ? ({ ...c, ...body } as Creator) : c));
      toast.success('Saved');
      return true;
    } catch (e: any) {
      toast.error('Save failed', e.message || 'Please try again.');
      return false;
    }
  }

  function startEdit(c: Creator) { if (!isAdmin) return; setEditingId(c.id); setDraft(toDraft(c)); }
  function cancelEdit() { setEditingId(null); setDraft(null); }

  async function saveEdit() {
    if (!editingId || !draft) return;
    if (!draft.nickname.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const patch = draftToPatch(draft);
      const res = await fetch(`/api/admin/creators/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `Save failed (${res.status})`);
      setCreators(cs => cs.map(c => c.id === editingId ? ({ ...c, ...patch } as Creator) : c));
      toast.success('Saved');
      setEditingId(null); setDraft(null);
      startTransition(() => router.refresh());
    } catch (e: any) {
      toast.error('Save failed', e.message || 'Please try again.');
    } finally { setSaving(false); }
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <SearchInput
          value={q} onChange={setQ}
          placeholder="Search nickname, full name, handle, market…"
          className="flex-1 min-w-[220px] max-w-md"
        />
        <select value={tier} onChange={e => setTier(e.target.value)} className="input max-w-[160px]">
          <option value="">All tiers</option>
          {tiers.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={country} onChange={e => setCountry(e.target.value)} className="input max-w-[180px]">
          <option value="">All countries</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {markets.length > 0 && (
          <select value={market} onChange={e => setMarket(e.target.value)} className="input max-w-[180px]">
            <option value="">All audiences</option>
            {markets.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
        <DensityToggle value={density} onChange={setDensity} />
        {!tierReview.disabled && (
          <button
            type="button"
            onClick={() => setReviewOnly(v => !v)}
            className={[
              'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition whitespace-nowrap',
              reviewOnly
                ? 'border-orange-400 bg-orange-50 text-orange-700'
                : reviewFlagCount > 0
                  ? 'border-orange-300 text-orange-700 hover:bg-orange-50'
                  : 'border-line text-label hover:bg-bg',
            ].join(' ')}
            title="Show only creators whose current tier doesn't match their follower data"
          >
            <AlertTriangle size={14} />
            Tier review
            {reviewFlagCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0 rounded-full bg-orange-100 text-orange-700 text-[11px] font-bold">{reviewFlagCount}</span>
            )}
          </button>
        )}
        {isAdmin && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTrSettings(v => !v)}
              className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-line text-sm transition whitespace-nowrap text-label hover:bg-bg"
              aria-expanded={showTrSettings}
              title="Tier-review settings"
            >
              <Settings size={14} />
              <ChevronDown size={12} className={showTrSettings ? 'rotate-180 transition' : 'transition'} />
            </button>
            {showTrSettings && (
              <TierReviewSettingsPanel
                tierReview={tierReview}
                onClose={() => setShowTrSettings(false)}
                pendingCount={reviewFlagCount}
              />
            )}
          </div>
        )}
        <CurrencyPill />
        <div className="text-sm text-label ml-auto whitespace-nowrap">{filtered.length} of {creators.length}</div>
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No matches"
            body={q || tier || country || market ? 'Try clearing your filters.' : 'No active creators yet.'}
            action={isAdmin && !q && !tier && !country && !market
              ? { label: 'Add creator', href: '/admin/creators/new' }
              : undefined}
          />
        ) : (
          <div className="overflow-x-auto max-h-[78vh]">
            <table className={`data-table density-${density}`}>
              <thead>
                <tr>
                  <th>Creator</th>
                  <th>Tier</th>
                  {!tierReview.disabled && <th>Tier check</th>}
                  <th>Nationality</th>
                  <th>Market</th>
                  <th>Socials</th>
                  <th className="text-right">Reach</th>
                  {KEY_PLATFORMS.map(p => (
                    <th key={p.key} className="text-right">{p.label}</th>
                  ))}
                  {isAdmin && <th></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const isEditing = editingId === c.id;
                  if (isEditing && draft) {
                    return (
                      <CreatorEditRow
                        key={c.id}
                        c={c}
                        draft={draft}
                        setDraft={setDraft as any}
                        ccy={ccy}
                        saving={saving}
                        onSave={saveEdit}
                        onCancel={cancelEdit}
                        showTierCheck={!tierReview.disabled}
                      />
                    );
                  }
                  return (
                    <CreatorRow
                      key={c.id}
                      c={c}
                      ccy={ccy}
                      isAdmin={isAdmin}
                      onEdit={() => startEdit(c)}
                      onPatch={patchCreator}
                      tierReview={tierReview}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function CreatorRow({
  c, ccy, isAdmin, onEdit, onPatch, tierReview,
}: {
  c: Creator;
  ccy: 'SAR' | 'USD';
  isAdmin: boolean;
  onEdit: () => void;
  onPatch: (id: number, body: Record<string, any>) => Promise<boolean>;
  tierReview: ReturnType<typeof useTierReviewSettings>;
}) {
  const reach = totalReach(c);
  const market = (c as any).audience_market as string | undefined;
  return (
    <tr>
      <td>
        <div className="flex items-center gap-3 min-w-0">
          <Avatar src={c.avatar_url || undefined} name={c.nickname} size="sm" />
          <div className="min-w-0">
            <div className="font-medium text-ink truncate flex items-center gap-1.5">
              {c.nickname}
              {c.score != null && (
                <span className="text-[10px] font-semibold tabular-nums text-mute" title="Composite score">
                  · {c.score.toFixed(1)}
                </span>
              )}
            </div>
            {(c.full_name || c.link) && (
              <div className="text-xs text-mute truncate">
                {c.full_name || ''}
                {c.full_name && c.link && ' · '}
                {c.link && (
                  <a
                    href={c.link} target="_blank" rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="hover:text-greenDark"
                  >
                    {c.link.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </td>
      <td>
        <div className="inline-flex items-center gap-1">
          <span className={`chip border whitespace-nowrap ${tierClass(c.tier_code)}`}>{c.tier_code || '—'}</span>
          <DataLockChip completeness={(c as any).data_completeness} />
        </div>
      </td>
      {!tierReview.disabled && (
        <td><TierReviewBadge c={c} isAdmin={isAdmin} onPatch={onPatch} tierReview={tierReview} /></td>
      )}
      <td className="text-label whitespace-nowrap">{c.nationality || '—'}</td>
      <td className="text-label whitespace-nowrap text-xs">
        {market ? (
          <span className="inline-flex items-center gap-1">
            <Globe size={10} className="text-mute" />
            {market}
          </span>
        ) : '—'}
      </td>
      <td><CreatorSocials c={c} /></td>
      <td className="text-right text-ink whitespace-nowrap">{reach > 0 ? fmtFollowers(reach) : '—'}</td>
      {KEY_PLATFORMS.map(p => {
        const v = (c as any)[p.key] as number | null;
        return (
          <td key={p.key} className="text-right">{v ? fmtCurrency(v, ccy, 3.75) : '—'}</td>
        );
      })}
      {isAdmin && (
        <td>
          <button
            type="button"
            onClick={onEdit}
            className="row-actions text-xs text-greenDark hover:underline whitespace-nowrap"
            title="Edit handles, followers, rates, audience"
          >
            <Pencil size={12} className="inline mr-1" />Edit
          </button>
        </td>
      )}
    </tr>
  );
}

function CreatorEditRow({
  c, draft, setDraft, ccy, saving, onSave, onCancel, showTierCheck,
}: {
  c: Creator;
  draft: EditDraft;
  setDraft: (d: EditDraft) => void;
  ccy: 'SAR' | 'USD';
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  showTierCheck: boolean;
}) {
  const set = <K extends keyof EditDraft>(k: K, v: EditDraft[K]) => setDraft({ ...draft, [k]: v });
  return (
    <tr className="bg-greenSoft/40">
      <td>
        <div className="flex items-start gap-2 min-w-[260px]">
          <Avatar src={draft.avatar_url || undefined} name={draft.nickname || c.nickname} size="md" />
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <input className="input py-1 text-sm" value={draft.nickname} placeholder="Nickname *" onChange={e => set('nickname', e.target.value)} />
            <input className="input py-1 text-xs" value={draft.full_name} placeholder="Full name" onChange={e => set('full_name', e.target.value)} />
            <input className="input py-1 text-xs" value={draft.avatar_url} placeholder="Photo URL" onChange={e => set('avatar_url', e.target.value)} />
            <input className="input py-1 text-xs" value={draft.link} placeholder="Profile link" onChange={e => set('link', e.target.value)} />
            <input className="input py-1 text-xs" value={draft.score} placeholder="Score" type="number" step="0.1" onChange={e => set('score', e.target.value)} />
          </div>
        </div>
      </td>
      <td>
        <select className="input py-1 text-sm" value={draft.tier_code} onChange={e => set('tier_code', e.target.value)}>
          <option value="">—</option>
          {TIER_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </td>
      {showTierCheck && <td className="text-mute text-xs">— editing —</td>}
      <td>
        <input className="input py-1 text-sm w-[120px]" value={draft.nationality} placeholder="Saudi Arabia" onChange={e => set('nationality', e.target.value)} />
      </td>
      <td>
        <input className="input py-1 text-sm w-[140px]" value={draft.audience_market} placeholder="KSA / MENA / GCC…" onChange={e => set('audience_market', e.target.value)} />
      </td>
      <td>
        <div className="grid grid-cols-2 gap-1 min-w-[280px]">
          <SocialInput icon={Instagram} handle={draft.handle_ig}     followers={draft.followers_ig}     onHandle={v => set('handle_ig', v)}     onFollowers={v => set('followers_ig', v)} />
          <SocialInput icon={Music2}    handle={draft.handle_tiktok} followers={draft.followers_tiktok} onHandle={v => set('handle_tiktok', v)} onFollowers={v => set('followers_tiktok', v)} />
          <SocialInput icon={Youtube}   handle={draft.handle_yt}     followers={draft.followers_yt}     onHandle={v => set('handle_yt', v)}     onFollowers={v => set('followers_yt', v)} />
          <SocialInput icon={XIcon}     handle={draft.handle_x}      followers={draft.followers_x}      onHandle={v => set('handle_x', v)}      onFollowers={v => set('followers_x', v)} />
          <SocialInput icon={Twitch}    handle={draft.handle_twitch} followers={draft.followers_twitch} onHandle={v => set('handle_twitch', v)} onFollowers={v => set('followers_twitch', v)} />
        </div>
      </td>
      <td className="text-right text-mute text-xs">auto</td>
      {KEY_PLATFORMS.map(p => (
        <td key={p.key} className="text-right">
          <input
            type="number"
            className="input py-1 text-right w-[88px] text-sm tabular-nums"
            value={draft[p.key]}
            onChange={e => set(p.key, e.target.value)}
            placeholder={ccy === 'USD' ? '$' : 'SAR'}
          />
        </td>
      ))}
      <td>
        <div className="flex flex-col gap-1">
          <button onClick={onSave} disabled={saving} className="btn btn-primary text-xs">
            {saving ? '…' : 'Save'}
          </button>
          <button onClick={onCancel} disabled={saving} className="btn btn-ghost text-xs">Cancel</button>
        </div>
      </td>
    </tr>
  );
}

function SocialInput({
  icon: Icon, handle, followers, onHandle, onFollowers,
}: {
  icon: any;
  handle: string; followers: string;
  onHandle: (v: string) => void; onFollowers: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Icon size={12} className="text-mute shrink-0" />
      <input className="input py-1 text-[11px] flex-1 min-w-0" value={handle} onChange={e => onHandle(e.target.value)} placeholder="@handle" />
      <input type="number" className="input py-1 text-[11px] w-[68px] text-right tabular-nums" value={followers} onChange={e => onFollowers(e.target.value)} placeholder="0" />
    </div>
  );
}

function CreatorSocials({ c }: { c: Creator }) {
  const items = [
    { key: 'instagram', icon: Instagram, n: Number(c.followers_ig)     || 0, handle: c.handle_ig,     base: 'https://instagram.com/' },
    { key: 'tiktok',    icon: Music2,    n: Number(c.followers_tiktok) || 0, handle: c.handle_tiktok, base: 'https://tiktok.com/@' },
    { key: 'youtube',   icon: Youtube,   n: Number(c.followers_yt)     || 0, handle: c.handle_yt,     base: 'https://youtube.com/@' },
    { key: 'x',         icon: XIcon,     n: Number(c.followers_x)      || 0, handle: c.handle_x,      base: 'https://x.com/' },
    { key: 'twitch',    icon: Twitch,    n: Number(c.followers_twitch) || 0, handle: c.handle_twitch, base: 'https://twitch.tv/' },
  ].filter(i => i.n > 0 || i.handle);

  if (items.length === 0) return <span className="text-mute text-xs">no data</span>;

  const sorted = items.sort((a, b) => b.n - a.n);
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs whitespace-nowrap">
      {sorted.map(({ key, icon: Icon, n, handle, base }) => {
        const url = handle ? `${base}${String(handle).replace(/^@/, '')}` : null;
        const inner = (
          <>
            <Icon size={12} className="text-mute" />
            {n > 0 && <span className="font-medium text-ink tabular-nums">{fmtFollowers(n)}</span>}
            {n === 0 && handle && <span className="text-mute">@</span>}
          </>
        );
        const title = handle
          ? `${handle} — ${n.toLocaleString('en-US')} followers`
          : `${n.toLocaleString('en-US')} followers`;
        return url ? (
          <a key={key} href={url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} title={title} className="inline-flex items-center gap-1 text-label hover:text-greenDark">
            {inner}
          </a>
        ) : (
          <span key={key} className="inline-flex items-center gap-1 text-label" title={title}>{inner}</span>
        );
      })}
    </div>
  );
}

function TierReviewBadge({
  c, isAdmin, onPatch, tierReview,
}: {
  c: Creator;
  isAdmin: boolean;
  onPatch: (id: number, body: Record<string, any>) => Promise<boolean>;
  tierReview: ReturnType<typeof useTierReviewSettings>;
}) {
  const [busy, setBusy] = useState(false);
  const max = maxPlatformReach(c);
  const flag = tierReviewFlag(c.tier_code, max, { tolerance: tierReview.tolerance });
  const isDismissed = tierReview.dismissed.has(c.id);

  if (flag === 'no-data') return <span className="text-mute text-xs">—</span>;
  if (flag === 'ok') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green/10 text-greenDark text-[11px] font-semibold whitespace-nowrap">
        <Check size={11} /> match
      </span>
    );
  }
  const expected = expectedTierFromMax(max);

  if (isDismissed) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] whitespace-nowrap">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-bg text-mute font-semibold border border-line">
          <Check size={11} /> kept
        </span>
        {isAdmin && (
          <button type="button" onClick={() => tierReview.restore(c.id)} className="text-mute hover:text-orange-700">
            <Undo2 size={12} />
          </button>
        )}
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-1 whitespace-nowrap">
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[11px] font-semibold"
        title={`Max reach ${fmtFollowers(max)} → expected ${expected}. Currently ${c.tier_code}.`}
      >
        <AlertTriangle size={11} />
        {flag === 'promote' ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
        {expected}
      </span>
      {isAdmin && (
        <span className="inline-flex items-center gap-0.5">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              if (!confirm(`Move ${c.nickname} from ${c.tier_code} to ${expected}?`)) return;
              setBusy(true);
              await onPatch(c.id, { tier_code: expected });
              setBusy(false);
            }}
            className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-orange-700 hover:bg-orange-50 border border-orange-200 disabled:opacity-50"
          >
            {flag === 'promote' ? 'Promote' : 'Demote'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => tierReview.dismiss(c.id)}
            className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-greenDark hover:bg-green/10 border border-green/30"
          >
            Approve
          </button>
        </span>
      )}
    </div>
  );
}

function TierReviewSettingsPanel({
  tierReview, onClose, pendingCount,
}: {
  tierReview: ReturnType<typeof useTierReviewSettings>;
  onClose: () => void;
  pendingCount: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const tolPct = Math.round(tierReview.tolerance * 100);
  return (
    <div ref={ref} className="absolute right-0 mt-2 w-80 z-50 rounded-xl border border-line bg-white shadow-lg p-4 text-sm" role="dialog">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-semibold text-ink">Creator tier review</div>
          <div className="text-xs text-mute mt-0.5">Auto-flag creators whose tier doesn&apos;t match their follower data.</div>
        </div>
        <button onClick={onClose} className="text-mute hover:text-ink"><XIcon size={14} /></button>
      </div>
      <label className="flex items-center justify-between gap-2 py-2 border-t border-line cursor-pointer">
        <span className="inline-flex items-center gap-2 text-ink">
          {tierReview.disabled ? <EyeOff size={14} className="text-mute" /> : <Eye size={14} className="text-greenDark" />}
          <span>Show tier review</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={!tierReview.disabled}
          onClick={() => tierReview.setDisabled(!tierReview.disabled)}
          className={['relative inline-flex h-5 w-9 items-center rounded-full transition', !tierReview.disabled ? 'bg-greenDark' : 'bg-line'].join(' ')}
        >
          <span className={['inline-block h-4 w-4 rounded-full bg-white shadow transition', !tierReview.disabled ? 'translate-x-4' : 'translate-x-0.5'].join(' ')} />
        </button>
      </label>
      <div className="py-2 border-t border-line">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-ink">Tolerance band</span>
          <span className="text-mute text-xs tabular-nums">±{tolPct}%</span>
        </div>
        <input type="range" min={0} max={25} step={1} value={tolPct} onChange={e => tierReview.setTolerance(Number(e.target.value) / 100)} className="w-full" disabled={tierReview.disabled} />
      </div>
      <div className="py-2 border-t border-line flex items-center justify-between">
        <div>
          <div className="text-ink">Approved as-is</div>
          <div className="text-xs text-mute">{tierReview.dismissed.size} creator{tierReview.dismissed.size === 1 ? '' : 's'}</div>
        </div>
        <button type="button" onClick={tierReview.restoreAll} disabled={tierReview.dismissed.size === 0} className="text-xs text-orange-700 hover:underline disabled:text-mute disabled:no-underline">Restore all</button>
      </div>
      <div className="py-2 border-t border-line">
        <Link href="/admin/tiers" className="text-xs text-greenDark hover:underline inline-flex items-center gap-1">Adjust tier thresholds → <ArrowUpRight size={11} /></Link>
      </div>
      <div className="pt-2 border-t border-line text-[11px] text-mute">{pendingCount} pending review{pendingCount === 1 ? '' : 's'}. Settings save to this browser only.</div>
    </div>
  );
}

function DensityToggle({ value, onChange }: { value: Density; onChange: (d: Density) => void }) {
  const opts: Array<{ k: Density; icon: any; title: string }> = [
    { k: 'compact', icon: Rows4, title: 'Compact' },
    { k: 'comfortable', icon: Rows3, title: 'Comfortable' },
    { k: 'spacious', icon: Rows2, title: 'Spacious' },
  ];
  return (
    <div className="inline-flex rounded-lg border border-line bg-white overflow-hidden">
      {opts.map(o => {
        const Icon = o.icon;
        const active = o.k === value;
        return (
          <button key={o.k} type="button" onClick={() => onChange(o.k)} title={o.title} className={['px-2.5 py-2 transition', active ? 'bg-greenSoft text-greenDark' : 'text-mute hover:text-ink hover:bg-bg'].join(' ')}>
            <Icon size={14} />
          </button>
        );
      })}
    </div>
  );
}

function DataLockChip({ completeness }: { completeness?: string | null }) {
  const c = (completeness ?? '').toLowerCase();
  if (c === 'verified' || c === 'locked' || c === 'exact' || c === 'full') {
    return (
      <span title="Verified — full social + audience data" className="inline-flex items-center gap-1 px-1.5 py-0 rounded-full text-[9px] font-bold uppercase tracking-wider bg-green/15 text-greenDark border border-green/30">
        <Lock size={9} /> Locked
      </span>
    );
  }
  return (
    <span title="TBD — partial data, methodology defaults applied" className="inline-flex items-center gap-1 px-1.5 py-0 rounded-full text-[9px] font-bold uppercase tracking-wider bg-gold/10 text-gold border border-gold/30">
      <Hourglass size={9} /> TBD
    </span>
  );
}
