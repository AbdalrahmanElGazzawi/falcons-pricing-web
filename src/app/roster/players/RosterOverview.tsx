'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Player } from '@/lib/types';
import { fmtCurrency, tierClass, fmtFollowers, totalReach, maxPlatformReach, tierReviewFlag, expectedTierFromMax } from '@/lib/utils';
import { useDisplayCurrency } from '@/lib/use-display-currency';
import { CurrencyPill } from '@/components/CurrencyPill';
import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/components/Toast';
import {
  Users, Rows2, Rows3, Rows4, Pencil, Check, X as XIcon,
  Trophy, Clipboard, Briefcase, ScanSearch, Megaphone, Layers,
  Twitch, Youtube, Instagram, Music2, AlertTriangle, Radio, Lock, Hourglass,
  Settings, Eye, EyeOff, Undo2, ArrowUpRight, ArrowDownRight, ChevronDown,
} from 'lucide-react';
import { SearchInput } from '@/components/SearchInput';
import { CutChip } from '@/components/CutChip';
import { LiquipediaChip } from '@/components/LiquipediaChip';
import { LiquipediaCoverageBanner } from './LiquipediaCoverageBanner';
import { PlayerQuickView } from '@/components/QuickViewDrawer';

type Density = 'compact' | 'comfortable' | 'spacious';

const ROLE_GROUPS: Array<{
  key: string;
  label: string;
  icon: any;
  match: (role?: string | null) => boolean;
}> = [
  { key: 'all',         label: 'All',              icon: Layers,    match: () => true },
  { key: 'player',      label: 'Players',          icon: Trophy,    match: r => r === 'Player' },
  { key: 'coach',       label: 'Coaches & Mgmt',   icon: Briefcase, match: r => !!r && ['Head Coach','Coach','Assistant Coach','Manager'].includes(r) },
  { key: 'analyst',     label: 'Analysts',         icon: ScanSearch, match: r => r === 'Analyst' },
  { key: 'influencer',  label: 'Influencers',      icon: Megaphone, match: r => r === 'Influencer' },
];

const ROLE_OPTIONS = [
  'Player','Manager','Head Coach','Coach','Assistant Coach','Analyst','Influencer',
];

const TR_LS_DISABLED  = 'falcons.tierReview.disabled';
const TR_LS_TOLERANCE = 'falcons.tierReview.tolerance';
const TR_LS_DISMISSED = 'falcons.tierReview.dismissed';

function useTierReviewSettings() {
  const [disabled, setDisabledState] = useState(false);
  const [tolerance, setToleranceState] = useState(0);
  const [dismissed, setDismissedState] = useState<Set<number>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      setDisabledState(localStorage.getItem(TR_LS_DISABLED) === 'true');
      const t = Number(localStorage.getItem(TR_LS_TOLERANCE) ?? '0');
      setToleranceState(Number.isFinite(t) ? Math.max(0, Math.min(t, 0.5)) : 0);
      const raw = localStorage.getItem(TR_LS_DISMISSED) ?? '[]';
      const arr = JSON.parse(raw);
      setDismissedState(new Set(
        Array.isArray(arr) ? arr.map((x: any) => Number(x)).filter((x: number) => Number.isFinite(x)) : []
      ));
    } catch {}
    setHydrated(true);
  }, []);

  const setDisabled = (v: boolean) => {
    setDisabledState(v);
    try { localStorage.setItem(TR_LS_DISABLED, String(v)); } catch {}
  };
  const setTolerance = (v: number) => {
    const clamped = Math.max(0, Math.min(v, 0.5));
    setToleranceState(clamped);
    try { localStorage.setItem(TR_LS_TOLERANCE, String(clamped)); } catch {}
  };
  const dismiss = (id: number) => {
    setDismissedState(prev => {
      const next = new Set(prev); next.add(id);
      try { localStorage.setItem(TR_LS_DISMISSED, JSON.stringify([...next])); } catch {}
      return next;
    });
  };
  const restore = (id: number) => {
    setDismissedState(prev => {
      const next = new Set(prev); next.delete(id);
      try { localStorage.setItem(TR_LS_DISMISSED, JSON.stringify([...next])); } catch {}
      return next;
    });
  };
  const restoreAll = () => {
    setDismissedState(new Set());
    try { localStorage.removeItem(TR_LS_DISMISSED); } catch {}
  };
  return { disabled, setDisabled, tolerance, setTolerance, dismissed, dismiss, restore, restoreAll, hydrated };
}

function ageFromDob(dob?: string | null): number | null {
  if (!dob) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dob);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  const today = new Date();
  let age = today.getFullYear() - y;
  const before = today.getMonth() + 1 < mo || (today.getMonth() + 1 === mo && today.getDate() < d);
  if (before) age -= 1;
  return age >= 0 && age < 100 ? age : null;
}

export function RosterOverview({
  players: initialPlayers, tiers, isAdmin,
}: {
  players: Player[];
  tiers: { code: string; label: string }[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<string>('all');
  const [tier, setTier] = useState('');
  const [game, setGame] = useState('');
  const [team, setTeam] = useState('');
  const [country, setCountry] = useState('');
  const [dataFilter, setDataFilter] = useState<'' | 'locked' | 'tbd' | 'pending'>('');
  const [liqFilter, setLiqFilter] = useState<'' | 'missing_url' | 'has_url_unsynced' | 'synced' | 'stale'>('');
  const [density, setDensity] = useState<Density>('comfortable');
  const [reviewOnly, setReviewOnly] = useState(false);
  const tierReview = useTierReviewSettings();
  const [showTrSettings, setShowTrSettings] = useState(false);
  const [quickViewId, setQuickViewId] = useState<number | null>(null);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const grp of ROLE_GROUPS) {
      m.set(grp.key, players.filter(p => grp.match(p.role)).length);
    }
    return m;
  }, [players]);

  const tabMatch = ROLE_GROUPS.find(g => g.key === tab) ?? ROLE_GROUPS[0];
  const [ccy] = useDisplayCurrency();
  const games = useMemo(() => Array.from(new Set(players.map(p => p.game).filter(Boolean))).sort() as string[], [players]);
  const countries = useMemo(() => {
    const norm = (raw: string | null | undefined) => {
      const v = (raw ?? '').trim();
      if (!v) return '';
      return v.toLowerCase() === 'saudi' ? 'Saudi Arabia' : v;
    };
    return Array.from(new Set(players.map(p => norm(p.nationality)).filter(Boolean))).sort() as string[];
  }, [players]);
  const teams = useMemo(() => {
    const set = new Set(players.filter(p => !game || p.game === game).map(p => p.team).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [players, game]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return players.filter(p => {
      if (!tabMatch.match(p.role)) return false;
      if (tier && p.tier_code !== tier) return false;
      if (game && p.game !== game) return false;
      if (team && p.team !== team) return false;
      if (dataFilter) {
        const c = (p.measurement_confidence ?? 'pending').toLowerCase();
        if (dataFilter === 'locked'  && c !== 'exact') return false;
        if (dataFilter === 'tbd'     && c !== 'rounded' && c !== 'estimated') return false;
        if (dataFilter === 'pending' && c !== 'pending') return false;
      }
      if (liqFilter) {
        const hasUrl = !!p.liquipedia_url;
        const synced = !!p.liquipedia_synced_at;
        if (liqFilter === 'missing_url'      && hasUrl) return false;
        if (liqFilter === 'has_url_unsynced' && (!hasUrl || synced)) return false;
        if (liqFilter === 'synced'           && !synced) return false;
        if (liqFilter === 'stale') {
          if (!synced) return false;
          const ageDays = Math.floor((Date.now() - new Date(p.liquipedia_synced_at!).getTime()) / 86400000);
          if (ageDays <= 30) return false;
        }
      }
      if (country) {
        const nat = (p.nationality ?? '').trim();
        const target = country.toLowerCase();
        if (target === 'saudi arabia') {
          if (!nat.toLowerCase().startsWith('saudi')) return false;
        } else if (nat.toLowerCase() !== target) {
          return false;
        }
      }
      if (reviewOnly) {
        if (tierReview.disabled) return false;
        if (tierReview.dismissed.has(p.id)) return false;
        const f = tierReviewFlag(p.tier_code, maxPlatformReach(p), { tolerance: tierReview.tolerance });
        if (f !== 'promote' && f !== 'demote') return false;
      }
      if (s) {
        const fields = [p.nickname, p.full_name, p.team, p.game, p.nationality, p.ingame_role, p.role];
        if (!fields.filter(Boolean).some(v => v!.toLowerCase().includes(s))) return false;
      }
      return true;
    });
  }, [players, q, tier, game, team, country, dataFilter, tabMatch, reviewOnly, tierReview.disabled, tierReview.dismissed, tierReview.tolerance, liqFilter]);

  const reviewFlagCount = useMemo(() => {
    if (tierReview.disabled) return 0;
    return players.filter(p => {
      if (tierReview.dismissed.has(p.id)) return false;
      const f = tierReviewFlag(p.tier_code, maxPlatformReach(p), { tolerance: tierReview.tolerance });
      return f === 'promote' || f === 'demote';
    }).length;
  }, [players, tierReview.disabled, tierReview.dismissed, tierReview.tolerance]);

  async function patchPlayer(id: number, body: Record<string, any>): Promise<boolean> {
    try {
      const res = await fetch(`/api/admin/players/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error('Save failed', j.error || 'Please try again.');
        return false;
      }
      setPlayers(ps => ps.map(p => p.id === id ? ({ ...p, ...body } as Player) : p));
      toast.success('Saved');
      return true;
    } catch (e: any) {
      toast.error('Save failed', e.message || 'Please try again.');
      return false;
    }
  }

  return (
    <>
      <div className="flex items-center gap-1 mb-4 overflow-x-auto -mx-1 px-1">
        {ROLE_GROUPS.map(g => {
          const Icon = g.icon;
          const active = tab === g.key;
          return (
            <button
              key={g.key}
              onClick={() => setTab(g.key)}
              className={[
                'inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm border transition whitespace-nowrap',
                active ? 'bg-navy text-white border-navy' : 'bg-white text-ink border-line hover:border-mute',
              ].join(' ')}
            >
              <Icon size={14} />
              <span>{g.label}</span>
              <span className={[
                'ml-1 inline-flex items-center justify-center min-w-[22px] h-[18px] rounded-full text-[10px] font-semibold px-1.5',
                active ? 'bg-white/15 text-white' : 'bg-bg text-mute',
              ].join(' ')}>{counts.get(g.key) ?? 0}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <SearchInput value={q} onChange={setQ} placeholder="Search nickname, name, team, in-game role…" className="flex-1 min-w-[220px] max-w-md" />
        <select value={game} onChange={e => { setGame(e.target.value); setTeam(''); }} className="input max-w-[200px]">
          <option value="">All games</option>
          {games.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={team} onChange={e => setTeam(e.target.value)} className="input max-w-[200px]" disabled={!game}>
          <option value="">All teams</option>
          {teams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={country} onChange={e => setCountry(e.target.value)} className="input max-w-[180px]">
          <option value="">All countries</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={dataFilter} onChange={e => setDataFilter(e.target.value as any)} className="input max-w-[170px]">
          <option value="">All data states</option>
          <option value="locked">Locked only</option>
          <option value="tbd">TBD only</option>
          <option value="pending">No data (pending)</option>
        </select>
        <select value={tier} onChange={e => setTier(e.target.value)} className="input max-w-[160px]">
          <option value="">All tiers</option>
          {tiers.map(t => <option key={t.code} value={t.code}>{t.code} · {t.label}</option>)}
        </select>
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
            >
              <Settings size={14} />
              <ChevronDown size={12} className={showTrSettings ? 'rotate-180 transition' : 'transition'} />
            </button>
            {showTrSettings && (
              <TierReviewSettingsPanel tierReview={tierReview} onClose={() => setShowTrSettings(false)} pendingCount={reviewFlagCount} />
            )}
          </div>
        )}
        <CurrencyPill />
        <div className="text-sm text-label ml-auto whitespace-nowrap">
          {filtered.length} of {players.length}
        </div>
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No matches"
            body={q || tier || game || team || country || dataFilter || tab !== 'all' ? 'Try clearing your filters or switching tabs.' : 'No active roster members yet.'}
            action={isAdmin && tab === 'all' && !q && !tier && !game && !team && !country && !dataFilter
              ? { label: 'Add roster member', href: '/admin/players/new' }
              : undefined}
          />
        ) : (
          <div className="overflow-x-auto max-h-[75vh]">
            <table className={`data-table density-${density}`}>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>In-game</th>
                  <th>Tier</th>
                  {!tierReview.disabled && <th>Tier check</th>}
                  <th title="Talent's share of the deal (1 - Falcons commission)">Cut</th>
                  <th>Liquipedia</th>
                  <th>Game</th>
                  <th>Team</th>
                  <th>Age</th>
                  <th>Nationality</th>
                  <th>Followers</th>
                  <th className="text-right">Reach</th>
                  <th className="text-right">IG Reel</th>
                  <th className="text-right">IRL</th>
                  {isAdmin && <th></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <RosterRow key={p.id} p={p} ccy={ccy} isAdmin={isAdmin} onPatch={patchPlayer} tierReview={tierReview} onOpenQuick={() => setQuickViewId(p.id)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {quickViewId != null && (() => {
        const pl = players.find(x => x.id === quickViewId);
        if (!pl) return null;
        return (
          <PlayerQuickView
            open={true}
            onClose={() => setQuickViewId(null)}
            player={pl as any}
            isAdmin={isAdmin}
            onPatch={patchPlayer}
          />
        );
      })()}
    </>
  );
}

function RosterRow({
  p, ccy, isAdmin, onPatch, tierReview, onOpenQuick,
}: {
  p: Player;
  ccy: 'SAR' | 'USD';
  isAdmin: boolean;
  onPatch: (id: number, body: Record<string, any>) => Promise<boolean>;
  tierReview: ReturnType<typeof useTierReviewSettings>;
  onOpenQuick: () => void;
}) {
  const [editingNick, setEditingNick] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingRole, setEditingRole] = useState(false);
  const [editingIngame, setEditingIngame] = useState(false);
  const [nick, setNick] = useState(p.nickname);
  const [name, setName] = useState(p.full_name ?? '');
  const [role, setRole] = useState(p.role ?? 'Player');
  const [ingame, setIngame] = useState(p.ingame_role ?? '');

  const age = ageFromDob(p.date_of_birth);

  return (
    <tr>
      <td>
        <div className="flex items-center gap-3 min-w-0">
          <Avatar src={p.avatar_url} name={p.nickname} size="sm" />
          <div className="min-w-0">
            {editingNick && isAdmin ? (
              <InlineInput value={nick} onCancel={() => { setNick(p.nickname); setEditingNick(false); }} onCommit={async (v) => { if (!v.trim()) { setEditingNick(false); return; } const ok = await onPatch(p.id, { nickname: v.trim() }); if (ok) setEditingNick(false); }} />
            ) : (
              <div className={`font-medium text-ink truncate ${isAdmin ? 'cursor-text hover:underline decoration-dotted' : ''}`} onClick={() => isAdmin && setEditingNick(true)}>{p.nickname}</div>
            )}
            {editingName && isAdmin ? (
              <InlineInput value={name} onCancel={() => { setName(p.full_name ?? ''); setEditingName(false); }} onCommit={async (v) => { const ok = await onPatch(p.id, { full_name: v.trim() || null }); if (ok) setEditingName(false); }} size="sm" />
            ) : (
              <div className={`text-xs text-mute truncate ${isAdmin ? 'cursor-text hover:underline decoration-dotted' : ''}`} onClick={() => isAdmin && setEditingName(true)}>{p.full_name || (isAdmin ? <em>add full name</em> : '—')}</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-1">
        <button
          type="button"
          onClick={onOpenQuick}
          className="text-mute hover:text-greenDark p-1 -m-1 rounded transition"
          title="Quick view — details + inline edit"
          aria-label="Quick view"
        >
          <Eye size={14} />
        </button>
      </td>
      <td>
        {editingRole && isAdmin ? (
          <InlineSelect value={role} options={ROLE_OPTIONS.map(r => ({ value: r, label: r }))} onCancel={() => { setRole(p.role ?? 'Player'); setEditingRole(false); }} onCommit={async (v) => { const ok = await onPatch(p.id, { role: v }); if (ok) setEditingRole(false); }} />
        ) : (
          <button type="button" disabled={!isAdmin} onClick={() => setEditingRole(true)} className={['text-left text-sm whitespace-nowrap', isAdmin ? 'hover:underline decoration-dotted' : ''].join(' ')}>{p.role || '—'}</button>
        )}
      </td>
      <td>
        {editingIngame && isAdmin ? (
          <InlineInput value={ingame} onCancel={() => { setIngame(p.ingame_role ?? ''); setEditingIngame(false); }} onCommit={async (v) => { const ok = await onPatch(p.id, { ingame_role: v.trim() || null }); if (ok) setEditingIngame(false); }} placeholder="SMG, Tank, Flex…" />
        ) : (
          <button type="button" disabled={!isAdmin} onClick={() => setEditingIngame(true)} className={`text-left text-sm text-label whitespace-nowrap ${isAdmin ? 'hover:underline decoration-dotted' : ''}`}>{p.ingame_role || (isAdmin ? <span className="text-mute italic">add</span> : '—')}</button>
        )}
      </td>
      <td>
        <div className="inline-flex items-center gap-1">
          <span className={`chip border whitespace-nowrap ${tierClass(p.tier_code)}`}>{p.tier_code || '—'}</span>
          <DataLockChip confidence={p.measurement_confidence} />
        </div>
      </td>
      {!tierReview.disabled && (
        <td><TierReviewBadge p={p} isAdmin={isAdmin} onPatch={onPatch} tierReview={tierReview} /></td>
      )}
      <td><CutChip commission={p.commission} /></td>
      <td><LiquipediaChip p={p as any} /></td>
      <td className="text-label whitespace-nowrap">{p.game || '—'}</td>
      <td className="text-label whitespace-nowrap">{p.team || '—'}</td>
      <td className="text-label whitespace-nowrap">{age ?? '—'}</td>
      <td className="text-label whitespace-nowrap">{p.nationality || '—'}</td>
      <td><FollowerCluster p={p} /></td>
      <td className="text-right text-ink whitespace-nowrap">{totalReach(p) > 0 ? fmtFollowers(totalReach(p)) : '—'}</td>
      <td className="text-right">{p.rate_ig_reel ? fmtCurrency(p.rate_ig_reel, ccy, 3.75) : '—'}</td>
      <td className="text-right">{p.rate_irl ? fmtCurrency(p.rate_irl, ccy, 3.75) : '—'}</td>
      {isAdmin && (
        <td>
          <Link href={`/admin/players/${p.id}`} className="row-actions text-xs text-greenDark hover:underline whitespace-nowrap">
            <Pencil size={12} className="inline mr-1" />Full edit
          </Link>
        </td>
      )}
    </tr>
  );
}

function InlineInput({ value: initial, onCommit, onCancel, placeholder, size = 'md' }: { value: string; onCommit: (v: string) => void | Promise<void>; onCancel: () => void; placeholder?: string; size?: 'md' | 'sm' }) {
  const [v, setV] = useState(initial);
  return (
    <input
      autoFocus value={v}
      onChange={e => setV(e.target.value)}
      onBlur={() => onCommit(v)}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') onCancel(); }}
      placeholder={placeholder}
      className={`input py-1 px-2 ${size === 'sm' ? 'text-xs h-7' : 'text-sm h-8'}`}
    />
  );
}

function InlineSelect({ value: initial, options, onCommit, onCancel }: { value: string; options: Array<{ value: string; label: string }>; onCommit: (v: string) => void | Promise<void>; onCancel: () => void }) {
  return (
    <select autoFocus defaultValue={initial} onChange={e => onCommit(e.target.value)} onBlur={onCancel} onKeyDown={e => { if (e.key === 'Escape') onCancel(); }} className="input py-1 px-2 text-sm h-8 w-36">
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
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

function FollowerCluster({ p }: { p: Player }) {
  const items = [
    { key: 'x',         icon: XIcon,     n: Number((p as any).followers_x)      || 0, label: 'X / Twitter' },
    { key: 'instagram', icon: Instagram, n: Number((p as any).followers_ig)     || 0, label: 'Instagram' },
    { key: 'twitch',    icon: Twitch,    n: Number((p as any).followers_twitch) || 0, label: 'Twitch' },
    { key: 'youtube',   icon: Youtube,   n: Number((p as any).followers_yt)     || 0, label: 'YouTube' },
    { key: 'tiktok',    icon: Music2,    n: Number((p as any).followers_tiktok) || 0, label: 'TikTok' },
    { key: 'kick',      icon: Radio,     n: Number((p as any).followers_kick)   || 0, label: 'Kick' },
  ].filter(i => i.n > 0).sort((a, b) => b.n - a.n);
  if (items.length === 0) return <span className="text-mute text-xs">no data</span>;
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs whitespace-nowrap">
      {items.map(({ key, icon: Icon, n, label }) => (
        <span key={key} className="inline-flex items-center gap-1 text-label" title={`${label}: ${n.toLocaleString('en-US')}`}>
          <Icon size={12} className="text-mute" />
          <span className="font-medium text-ink tabular-nums">{fmtFollowers(n)}</span>
        </span>
      ))}
    </div>
  );
}

function DataLockChip({ confidence }: { confidence?: string | null }) {
  if (confidence === 'exact') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0 rounded-full text-[9px] font-bold uppercase tracking-wider bg-green/15 text-greenDark border border-green/30">
        <Lock size={9} /> Locked
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0 rounded-full text-[9px] font-bold uppercase tracking-wider bg-gold/10 text-gold border border-gold/30">
      <Hourglass size={9} /> TBD
    </span>
  );
}

function TierReviewBadge({ p, isAdmin, onPatch, tierReview }: { p: Player; isAdmin: boolean; onPatch: (id: number, body: Record<string, any>) => Promise<boolean>; tierReview: ReturnType<typeof useTierReviewSettings> }) {
  const [busy, setBusy] = useState(false);
  const max = maxPlatformReach(p);
  const flag = tierReviewFlag(p.tier_code, max, { tolerance: tierReview.tolerance });
  const isDismissed = tierReview.dismissed.has(p.id);

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
          <button type="button" onClick={() => tierReview.restore(p.id)} className="text-mute hover:text-orange-700">
            <Undo2 size={12} />
          </button>
        )}
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-1 whitespace-nowrap">
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[11px] font-semibold">
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
              if (!confirm(`Move ${p.nickname} from ${p.tier_code} to ${expected}?`)) return;
              setBusy(true);
              await onPatch(p.id, { tier_code: expected });
              setBusy(false);
            }}
            className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-orange-700 hover:bg-orange-50 border border-orange-200 disabled:opacity-50"
          >
            {flag === 'promote' ? 'Promote' : 'Demote'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => tierReview.dismiss(p.id)}
            className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-greenDark hover:bg-green/10 border border-green/30"
          >
            Approve
          </button>
        </span>
      )}
    </div>
  );
}

function TierReviewSettingsPanel({ tierReview, onClose, pendingCount }: { tierReview: ReturnType<typeof useTierReviewSettings>; onClose: () => void; pendingCount: number }) {
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
          <div className="font-semibold text-ink">Tier review</div>
          <div className="text-xs text-mute mt-0.5">Auto-flag players whose assigned tier doesn&apos;t match their follower data.</div>
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
        <div className="text-[11px] text-mute mt-1">Players within ±{tolPct}% of a tier cutoff stay marked as &ldquo;match&rdquo;.</div>
      </div>
      <div className="py-2 border-t border-line flex items-center justify-between">
        <div>
          <div className="text-ink">Approved as-is</div>
          <div className="text-xs text-mute">{tierReview.dismissed.size} player{tierReview.dismissed.size === 1 ? '' : 's'}</div>
        </div>
        <button type="button" onClick={tierReview.restoreAll} disabled={tierReview.dismissed.size === 0} className="text-xs text-orange-700 hover:underline disabled:text-mute disabled:no-underline">Restore all</button>
      </div>
      <div className="py-2 border-t border-line">
        <Link href="/admin/tiers" className="text-xs text-greenDark hover:underline inline-flex items-center gap-1">Adjust tier thresholds → <ArrowUpRight size={11} /></Link>
      </div>
      <div className="pt-2 border-t border-line text-[11px] text-mute">Currently {pendingCount} pending review{pendingCount === 1 ? '' : 's'}. Settings save to this browser only.</div>
    </div>
  );
}
