'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Player } from '@/lib/types';
import { fmtMoney, tierClass } from '@/lib/utils';
import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { Search, Users, Rows2, Rows3, Rows4 } from 'lucide-react';

type Density = 'compact' | 'comfortable' | 'spacious';

export function PlayersTable({ players, isAdmin }: { players: Player[]; isAdmin: boolean }) {
  const [q, setQ] = useState('');
  const [tier, setTier] = useState('');
  const [game, setGame] = useState('');
  const [density, setDensity] = useState<Density>('comfortable');

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return players.filter(p =>
      (!tier || p.tier_code === tier) &&
      (!game || p.game === game) &&
      (!s || [p.nickname, p.full_name, p.team, p.game, p.nationality, p.ingame_role]
        .filter(Boolean).some(v => v!.toLowerCase().includes(s)))
    );
  }, [players, q, tier, game]);

  const tiers = Array.from(new Set(players.map(p => p.tier_code).filter(Boolean))) as string[];
  const games = Array.from(new Set(players.map(p => p.game).filter(Boolean))).sort() as string[];

  return (
    <>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search nickname, name, team, in-game role…"
            className="input pl-9"
          />
        </div>
        <select value={tier} onChange={e => setTier(e.target.value)} className="input max-w-[160px]">
          <option value="">All tiers</option>
          {tiers.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={game} onChange={e => setGame(e.target.value)} className="input max-w-[200px]">
          <option value="">All games</option>
          {games.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <DensityToggle value={density} onChange={setDensity} />
        <div className="text-sm text-label ml-auto whitespace-nowrap">
          {filtered.length} of {players.length}
        </div>
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No players match"
            body={q || tier || game ? 'Try clearing your filters.' : 'No players in the roster yet.'}
          />
        ) : (
          <div className="overflow-x-auto max-h-[75vh]">
            <table className={`data-table density-${density}`}>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Tier</th>
                  <th>Game</th>
                  <th>Team</th>
                  <th>Role</th>
                  <th className="text-right">IG Reel</th>
                  <th className="text-right">TikTok</th>
                  <th className="text-right">YT Short</th>
                  <th className="text-right">X Post</th>
                  <th className="text-right">IRL</th>
                  {isAdmin && <th></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar src={p.avatar_url} name={p.nickname} size="sm" />
                        <div className="min-w-0">
                          <div className="font-medium text-ink truncate">{p.nickname}</div>
                          {p.full_name && <div className="text-xs text-mute truncate">{p.full_name}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`chip border ${tierClass(p.tier_code)}`}>{p.tier_code || '—'}</span>
                    </td>
                    <td className="text-label whitespace-nowrap">{p.game || '—'}</td>
                    <td className="text-label whitespace-nowrap">{p.team || '—'}</td>
                    <td className="text-label whitespace-nowrap">
                      <div>{p.role || '—'}</div>
                      {p.ingame_role && <div className="text-xs text-mute">{p.ingame_role}</div>}
                    </td>
                    <td className="text-right">{p.rate_ig_reel ? fmtMoney(p.rate_ig_reel) : '—'}</td>
                    <td className="text-right">{p.rate_tiktok_video ? fmtMoney(p.rate_tiktok_video) : '—'}</td>
                    <td className="text-right">{p.rate_yt_short ? fmtMoney(p.rate_yt_short) : '—'}</td>
                    <td className="text-right">{p.rate_x_post ? fmtMoney(p.rate_x_post) : '—'}</td>
                    <td className="text-right">{p.rate_irl ? fmtMoney(p.rate_irl) : '—'}</td>
                    {isAdmin && (
                      <td>
                        <Link href={`/admin/players/${p.id}`} className="text-xs text-greenDark hover:underline">
                          Edit
                        </Link>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
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
