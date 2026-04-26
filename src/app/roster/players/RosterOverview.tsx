'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Player } from '@/lib/types';
import { fmtCurrency, tierClass } from '@/lib/utils';
import { useDisplayCurrency } from '@/lib/use-display-currency';
import { CurrencyPill } from '@/components/CurrencyPill';
import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/components/Toast';
import {
  Users, Rows2, Rows3, Rows4, Pencil, Check, X as XIcon,
  Trophy, Clipboard, Briefcase, ScanSearch, Megaphone, Layers,
} from 'lucide-react';
import { SearchInput } from '@/components/SearchInput';

type Density = 'compact' | 'comfortable' | 'spacious';

// Role groups — preset tabs that drive the role filter.
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
  const [density, setDensity] = useState<Density>('comfortable');

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
  const teams = useMemo(() => {
    const set = new Set(players.filter(p => !game || p.game === game).map(p => p.team).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [players, game]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return players.filter(p =>
      tabMatch.match(p.role) &&
      (!tier || p.tier_code === tier) &&
      (!game || p.game === game) &&
      (!team || p.team === team) &&
      (!s || [p.nickname, p.full_name, p.team, p.game, p.nationality, p.ingame_role, p.role]
        .filter(Boolean).some(v => v!.toLowerCase().includes(s)))
    );
  }, [players, q, tier, game, team, tabMatch]);

  // ── Inline patch helper
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
      // Optimistic local merge
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
      {/* Role tab strip */}
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
                active
                  ? 'bg-navy text-white border-navy'
                  : 'bg-white text-ink border-line hover:border-mute',
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

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Search nickname, name, team, in-game role…"
          className="flex-1 min-w-[220px] max-w-md"
        />
        <select value={game} onChange={e => { setGame(e.target.value); setTeam(''); }} className="input max-w-[200px]">
          <option value="">All games</option>
          {games.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={team} onChange={e => setTeam(e.target.value)} className="input max-w-[200px]" disabled={!game}>
          <option value="">All teams</option>
          {teams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={tier} onChange={e => setTier(e.target.value)} className="input max-w-[160px]">
          <option value="">All tiers</option>
          {tiers.map(t => <option key={t.code} value={t.code}>{t.code} · {t.label}</option>)}
        </select>
        <DensityToggle value={density} onChange={setDensity} />
          <CurrencyPill />
        <div className="text-sm text-label ml-auto whitespace-nowrap">
          {filtered.length} of {players.length}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No matches"
            body={q || tier || game || team || tab !== 'all' ? 'Try clearing your filters or switching tabs.' : 'No active roster members yet.'}
            action={isAdmin && tab === 'all' && !q && !tier && !game && !team
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
                  <th>Game</th>
                  <th>Team</th>
                  <th>Age</th>
                  <th>Nationality</th>
                  <th className="text-right">IG Reel</th>
                  <th className="text-right">IRL</th>
                  {isAdmin && <th></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <RosterRow
                    key={p.id}
                    p={p}
                    ccy={ccy}
                    isAdmin={isAdmin}
                    onPatch={patchPlayer}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// One row — handles its own inline-edit state for nickname/full_name/role/
// in-game role / DOB. Falls back to read-only for non-admins.
// ───────────────────────────────────────────────────────────────────────────
function RosterRow({
  p, ccy, isAdmin, onPatch,
}: {
  p: Player;
  ccy: 'SAR' | 'USD';
  isAdmin: boolean;
  onPatch: (id: number, body: Record<string, any>) => Promise<boolean>;
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
              <InlineInput
                value={nick}
                onCancel={() => { setNick(p.nickname); setEditingNick(false); }}
                onCommit={async (v) => {
                  if (!v.trim()) { setEditingNick(false); return; }
                  const ok = await onPatch(p.id, { nickname: v.trim() });
                  if (ok) setEditingNick(false);
                }}
              />
            ) : (
              <div
                className={`font-medium text-ink truncate ${isAdmin ? 'cursor-text hover:underline decoration-dotted' : ''}`}
                onClick={() => isAdmin && setEditingNick(true)}
                title={isAdmin ? 'Click to rename' : undefined}
              >
                {p.nickname}
              </div>
            )}
            {editingName && isAdmin ? (
              <InlineInput
                value={name}
                onCancel={() => { setName(p.full_name ?? ''); setEditingName(false); }}
                onCommit={async (v) => {
                  const ok = await onPatch(p.id, { full_name: v.trim() || null });
                  if (ok) setEditingName(false);
                }}
                size="sm"
              />
            ) : (
              <div
                className={`text-xs text-mute truncate ${isAdmin ? 'cursor-text hover:underline decoration-dotted' : ''}`}
                onClick={() => isAdmin && setEditingName(true)}
              >
                {p.full_name || (isAdmin ? <em>add full name</em> : '—')}
              </div>
            )}
          </div>
        </div>
      </td>

      <td>
        {editingRole && isAdmin ? (
          <InlineSelect
            value={role}
            options={ROLE_OPTIONS.map(r => ({ value: r, label: r }))}
            onCancel={() => { setRole(p.role ?? 'Player'); setEditingRole(false); }}
            onCommit={async (v) => {
              const ok = await onPatch(p.id, { role: v });
              if (ok) setEditingRole(false);
            }}
          />
        ) : (
          <button
            type="button"
            disabled={!isAdmin}
            onClick={() => setEditingRole(true)}
            className={[
              'text-left text-sm whitespace-nowrap',
              isAdmin ? 'hover:underline decoration-dotted' : '',
            ].join(' ')}
          >
            {p.role || '—'}
          </button>
        )}
      </td>

      <td>
        {editingIngame && isAdmin ? (
          <InlineInput
            value={ingame}
            onCancel={() => { setIngame(p.ingame_role ?? ''); setEditingIngame(false); }}
            onCommit={async (v) => {
              const ok = await onPatch(p.id, { ingame_role: v.trim() || null });
              if (ok) setEditingIngame(false);
            }}
            placeholder="SMG, Tank, Flex…"
          />
        ) : (
          <button
            type="button"
            disabled={!isAdmin}
            onClick={() => setEditingIngame(true)}
            className={`text-left text-sm text-label whitespace-nowrap ${isAdmin ? 'hover:underline decoration-dotted' : ''}`}
          >
            {p.ingame_role || (isAdmin ? <span className="text-mute italic">add</span> : '—')}
          </button>
        )}
      </td>

      <td>
        <span className={`chip border whitespace-nowrap ${tierClass(p.tier_code)}`}>{p.tier_code || '—'}</span>
      </td>
      <td className="text-label whitespace-nowrap">{p.game || '—'}</td>
      <td className="text-label whitespace-nowrap">{p.team || '—'}</td>
      <td className="text-label whitespace-nowrap">{age ?? '—'}</td>
      <td className="text-label whitespace-nowrap">{p.nationality || '—'}</td>
      <td className="text-right">{p.rate_ig_reel ? fmtCurrency(p.rate_ig_reel, ccy, 3.75) : '—'}</td>
      <td className="text-right">{p.rate_irl ? fmtCurrency(p.rate_irl, ccy, 3.75) : '—'}</td>
      {isAdmin && (
        <td>
          <Link
            href={`/admin/players/${p.id}`}
            className="row-actions text-xs text-greenDark hover:underline whitespace-nowrap"
            title="Open full editor (rates, socials, all fields)"
          >
            <Pencil size={12} className="inline mr-1" />Full edit
          </Link>
        </td>
      )}
    </tr>
  );
}

function InlineInput({
  value: initial, onCommit, onCancel, placeholder, size = 'md',
}: {
  value: string;
  onCommit: (v: string) => void | Promise<void>;
  onCancel: () => void;
  placeholder?: string;
  size?: 'md' | 'sm';
}) {
  const [v, setV] = useState(initial);
  return (
    <input
      autoFocus
      value={v}
      onChange={e => setV(e.target.value)}
      onBlur={() => onCommit(v)}
      onKeyDown={e => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') onCancel();
      }}
      placeholder={placeholder}
      className={`input py-1 px-2 ${size === 'sm' ? 'text-xs h-7' : 'text-sm h-8'}`}
    />
  );
}

function InlineSelect({
  value: initial, options, onCommit, onCancel,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  onCommit: (v: string) => void | Promise<void>;
  onCancel: () => void;
}) {
  return (
    <select
      autoFocus
      defaultValue={initial}
      onChange={e => onCommit(e.target.value)}
      onBlur={onCancel}
      onKeyDown={e => { if (e.key === 'Escape') onCancel(); }}
      className="input py-1 px-2 text-sm h-8 w-36"
    >
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
          <button key={o.k} type="button" onClick={() => onChange(o.k)} title={o.title}
            className={['px-2.5 py-2 transition', active ? 'bg-greenSoft text-greenDark' : 'text-mute hover:text-ink hover:bg-bg'].join(' ')}>
            <Icon size={14} />
          </button>
        );
      })}
    </div>
  );
}
