'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Player } from '@/lib/types';
import { fmtMoney, tierClass } from '@/lib/utils';
import { Search } from 'lucide-react';

export function PlayersTable({ players, isAdmin }: { players: Player[]; isAdmin: boolean }) {
  const [q, setQ] = useState('');
  const [tier, setTier] = useState('');

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return players.filter(p =>
      (!tier || p.tier_code === tier) &&
      (!s || [p.nickname, p.full_name, p.team, p.game, p.nationality].filter(Boolean)
        .some(v => v!.toLowerCase().includes(s)))
    );
  }, [players, q, tier]);

  const tiers = Array.from(new Set(players.map(p => p.tier_code).filter(Boolean))) as string[];

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search name, team, game…"
            className="input pl-9"
          />
        </div>
        <select value={tier} onChange={e => setTier(e.target.value)} className="input max-w-[200px]">
          <option value="">All tiers</option>
          {tiers.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="text-sm text-label ml-auto">{filtered.length} of {players.length}</div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-label uppercase tracking-wide bg-bg">
                <th className="px-4 py-3">Nickname</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Game</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3 text-right">IG Reel</th>
                <th className="px-4 py-3 text-right">TikTok</th>
                <th className="px-4 py-3 text-right">YT Short</th>
                <th className="px-4 py-3 text-right">X Post</th>
                <th className="px-4 py-3 text-right">IRL</th>
                {isAdmin && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-t border-line hover:bg-bg">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{p.nickname}</div>
                    {p.full_name && <div className="text-xs text-mute">{p.full_name}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`chip border ${tierClass(p.tier_code)}`}>{p.tier_code || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-label">{p.game || '—'}</td>
                  <td className="px-4 py-3 text-label">{p.team || '—'}</td>
                  <td className="px-4 py-3 text-right">{p.rate_ig_reel ? fmtMoney(p.rate_ig_reel) : '—'}</td>
                  <td className="px-4 py-3 text-right">{p.rate_tiktok_video ? fmtMoney(p.rate_tiktok_video) : '—'}</td>
                  <td className="px-4 py-3 text-right">{p.rate_yt_short ? fmtMoney(p.rate_yt_short) : '—'}</td>
                  <td className="px-4 py-3 text-right">{p.rate_x_post ? fmtMoney(p.rate_x_post) : '—'}</td>
                  <td className="px-4 py-3 text-right">{p.rate_irl ? fmtMoney(p.rate_irl) : '—'}</td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <Link href={`/admin/players/${p.id}`} className="text-xs text-green hover:underline">Edit</Link>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={isAdmin ? 10 : 9} className="px-4 py-10 text-center text-label">No matches.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
