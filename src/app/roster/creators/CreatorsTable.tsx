'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Creator } from '@/lib/types';
import { fmtMoney, tierClass } from '@/lib/utils';
import { Search } from 'lucide-react';

const KEY_PLATFORMS = [
  { key: 'rate_x_post_quote', label: 'X Post' },
  { key: 'rate_ig_post', label: 'IG Post' },
  { key: 'rate_ig_reels', label: 'IG Reels' },
  { key: 'rate_yt_full', label: 'YT Full' },
  { key: 'rate_yt_shorts', label: 'YT Short' },
  { key: 'rate_tiktok_ours', label: 'TikTok' },
  { key: 'rate_twitch_kick_live', label: 'Twitch/Kick' },
] as const;

export function CreatorsTable({ creators, isAdmin }: { creators: Creator[]; isAdmin: boolean }) {
  const [q, setQ] = useState('');
  const [tier, setTier] = useState('');

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return creators.filter(c =>
      (!tier || c.tier_code === tier) &&
      (!s || [c.nickname, c.notes].filter(Boolean).some(v => v!.toLowerCase().includes(s)))
    );
  }, [creators, q, tier]);

  const tiers = Array.from(new Set(creators.map(c => c.tier_code).filter(Boolean))) as string[];

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search creator name…"
            className="input pl-9"
          />
        </div>
        <select value={tier} onChange={e => setTier(e.target.value)} className="input max-w-[200px]">
          <option value="">All tiers</option>
          {tiers.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="text-sm text-label ml-auto">{filtered.length} of {creators.length}</div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-label uppercase tracking-wide bg-bg">
                <th className="px-4 py-3">Creator</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3 text-right">Score</th>
                {KEY_PLATFORMS.map(p => (
                  <th key={p.key} className="px-4 py-3 text-right">{p.label}</th>
                ))}
                {isAdmin && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-t border-line hover:bg-bg">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{c.nickname}</div>
                    {c.link && (
                      <a href={c.link} target="_blank" rel="noreferrer"
                         className="text-xs text-mute hover:text-green truncate inline-block max-w-[200px]">
                        {c.link.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`chip border ${tierClass(c.tier_code)}`}>{c.tier_code || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-label">
                    {c.score != null ? c.score.toFixed(1) : '—'}
                  </td>
                  {KEY_PLATFORMS.map(p => {
                    const v = (c as any)[p.key] as number | null;
                    return (
                      <td key={p.key} className="px-4 py-3 text-right">
                        {v ? fmtMoney(v) : '—'}
                      </td>
                    );
                  })}
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <Link href={`/admin/creators/${c.id}`} className="text-xs text-green hover:underline">
                        Edit
                      </Link>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 4 + KEY_PLATFORMS.length : 3 + KEY_PLATFORMS.length}
                      className="px-4 py-10 text-center text-label">
                    No matches.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
