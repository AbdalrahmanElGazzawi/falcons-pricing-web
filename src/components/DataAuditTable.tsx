'use client';
/**
 * DataAuditTable — companion to /admin/data-audit/page.tsx.
 *
 * Surfaces every signal the pricing engine uses to weight a player:
 *   • data_completeness state           → ConfidenceCap haircut
 *   • Liquipedia URL + last sync        → tournament data freshness
 *   • achievement_decay_factor          → AuthorityFloor scaling
 *   • peak_tournament_tier + last_major → "what makes them defensible"
 *
 * Every row links to the F/A/S/C panel and offers a one-click Liquipedia
 * re-sync (admin endpoint already exists).
 */
import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, ExternalLink, RefreshCw, AlertTriangle, Lock, ChevronUp, ChevronDown } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { tierClass, fmtFollowers } from '@/lib/utils';

export type AuditPlayer = {
  id: number;
  nickname: string;
  full_name: string | null;
  avatar_url: string | null;
  tier_code: string | null;
  role: string | null;
  game: string | null;
  team: string | null;
  has_social_data: boolean | null;
  has_tournament_data: boolean | null;
  has_audience_demo: boolean | null;
  data_completeness: 'full' | 'socials_only' | 'tournament_only' | 'minimal' | null;
  liquipedia_url: string | null;
  liquipedia_synced_at: string | null;
  prize_money_24mo_usd: number | null;
  peak_tournament_tier: 'S' | 'A' | 'B' | 'C' | 'unrated' | null;
  current_ranking: number | null;
  last_major_finish_date: string | null;
  last_major_placement: string | null;
  achievement_decay_factor: number | null;
  followers_ig: number | null; followers_x: number | null; followers_yt: number | null;
  followers_tiktok: number | null; followers_twitch: number | null;
};

type SortKey =
  | 'nickname' | 'tier_code' | 'data_completeness' | 'achievement_decay_factor'
  | 'prize_money_24mo_usd' | 'last_major_finish_date' | 'liquipedia_synced_at';

const STATE_COLOR: Record<string, string> = {
  full:            'bg-green/15 text-greenDark border-green/40',
  socials_only:    'bg-amber-50 text-amber-700 border-amber-300',
  tournament_only: 'bg-blue-50 text-blue-700 border-blue-300',
  minimal:         'bg-red-50 text-red-700 border-red-200',
};

export function DataAuditTable({ rows }: { rows: AuditPlayer[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [q, setQ] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [gapFilter, setGapFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [gameFilter, setGameFilter] = useState('');
  const [sort, setSort] = useState<{ k: SortKey; dir: 'asc' | 'desc' }>({ k: 'tier_code', dir: 'asc' });
  const [syncing, setSyncing] = useState<Set<number>>(new Set());

  const tiers = useMemo(() => Array.from(new Set(rows.map(r => r.tier_code).filter(Boolean))).sort() as string[], [rows]);
  const games = useMemo(() => Array.from(new Set(rows.map(r => r.game).filter(Boolean))).sort() as string[], [rows]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    let arr = rows.filter(r => {
      if (s && !(r.nickname.toLowerCase().includes(s) || (r.full_name ?? '').toLowerCase().includes(s))) return false;
      if (stateFilter && r.data_completeness !== stateFilter) return false;
      if (tierFilter && r.tier_code !== tierFilter) return false;
      if (gameFilter && r.game !== gameFilter) return false;
      if (gapFilter === 'no_liquipedia' && r.liquipedia_url) return false;
      if (gapFilter === 'no_tournament' && r.has_tournament_data) return false;
      if (gapFilter === 'no_audience'   && r.has_audience_demo) return false;
      if (gapFilter === 'decayed'       && Number(r.achievement_decay_factor ?? 1) >= 0.90) return false;
      return true;
    });
    const cmp = (a: any, b: any): number => {
      if (a == null && b == null) return 0;
      if (a == null) return 1;
      if (b == null) return -1;
      if (typeof a === 'number' && typeof b === 'number') return a - b;
      return String(a).localeCompare(String(b));
    };
    arr.sort((a, b) => {
      const r = cmp((a as any)[sort.k], (b as any)[sort.k]);
      return sort.dir === 'asc' ? r : -r;
    });
    return arr;
  }, [rows, q, stateFilter, tierFilter, gameFilter, gapFilter, sort]);

  function toggleSort(k: SortKey) {
    setSort(s => s.k === k ? { k, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { k, dir: 'asc' });
  }

  async function syncOne(playerId: number) {
    setSyncing(s => new Set(s).add(playerId));
    try {
      const res = await fetch(`/api/admin/players/${playerId}/sync-liquipedia`, { method: 'POST' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error ?? 'Sync failed');
      } else {
        startTransition(() => router.refresh());
      }
    } catch (e: any) {
      alert(e?.message ?? 'Sync failed');
    } finally {
      setSyncing(s => { const n = new Set(s); n.delete(playerId); return n; });
    }
  }

  const SortHead = ({ k, children, align }: { k: SortKey; children: React.ReactNode; align?: 'right' }) => (
    <th className={['px-3 py-2 cursor-pointer select-none', align === 'right' ? 'text-right' : 'text-left'].join(' ')} onClick={() => toggleSort(k)}>
      <span className="inline-flex items-center gap-1">
        {children}
        {sort.k === k && (sort.dir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
      </span>
    </th>
  );

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search nickname or full name…"
            className="input pl-9" />
        </div>
        <select value={tierFilter} onChange={e => setTierFilter(e.target.value)} className="input max-w-[160px]">
          <option value="">All tiers</option>
          {tiers.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={gameFilter} onChange={e => setGameFilter(e.target.value)} className="input max-w-[160px]">
          <option value="">All games</option>
          {games.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={stateFilter} onChange={e => setStateFilter(e.target.value)} className="input max-w-[180px]">
          <option value="">All data states</option>
          <option value="full">Full</option>
          <option value="socials_only">Socials only</option>
          <option value="tournament_only">Tournament only</option>
          <option value="minimal">Minimal</option>
        </select>
        <select value={gapFilter} onChange={e => setGapFilter(e.target.value)} className="input max-w-[200px]">
          <option value="">All players</option>
          <option value="no_liquipedia">No Liquipedia URL</option>
          <option value="no_tournament">No tournament data</option>
          <option value="no_audience">No audience demo</option>
          <option value="decayed">Decayed (decay &lt; 0.90)</option>
        </select>
        <div className="ml-auto text-sm text-label whitespace-nowrap">
          {filtered.length} of {rows.length}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto max-h-[78vh]">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-label bg-bg sticky top-0 z-10">
              <tr>
                <SortHead k="nickname">Player</SortHead>
                <SortHead k="tier_code">Tier · Game</SortHead>
                <SortHead k="data_completeness">Data state</SortHead>
                <th className="px-3 py-2 text-left">Signals</th>
                <SortHead k="liquipedia_synced_at">Liquipedia</SortHead>
                <SortHead k="achievement_decay_factor" align="right">Decay</SortHead>
                <SortHead k="last_major_finish_date">Last major</SortHead>
                <SortHead k="prize_money_24mo_usd" align="right">Prize 24mo</SortHead>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const decay = Number(r.achievement_decay_factor ?? 1);
                const decayTone =
                  decay >= 0.95 ? 'text-greenDark' :
                  decay >= 0.85 ? 'text-amber-700' :
                  'text-red-700';
                const stateCls = STATE_COLOR[r.data_completeness ?? 'minimal'] ?? STATE_COLOR.minimal;
                const reach = (r.followers_ig ?? 0) + (r.followers_x ?? 0) + (r.followers_yt ?? 0) + (r.followers_tiktok ?? 0) + (r.followers_twitch ?? 0);
                return (
                  <tr key={r.id} className="border-t border-line hover:bg-bg/40">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Avatar src={r.avatar_url ?? undefined} name={r.nickname} size="sm" />
                        <div className="min-w-0">
                          <Link href={`/admin/players/${r.id}/pricing`} className="font-medium text-ink hover:text-greenDark hover:underline truncate block">
                            {r.nickname}
                          </Link>
                          <div className="text-[11px] text-mute truncate">{r.full_name ?? '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`chip border ${tierClass(r.tier_code ?? undefined)}`}>{r.tier_code ?? '—'}</span>
                      <div className="text-[11px] text-mute mt-0.5">{r.game ?? '—'}{r.team ? ` · ${r.team}` : ''}</div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`chip border ${stateCls}`}>{(r.data_completeness ?? 'minimal').replace('_', ' ')}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Pill on={!!r.has_social_data}    label={`S ${reach > 0 ? fmtFollowers(reach) : ''}`} />
                        <Pill on={!!r.has_tournament_data} label="T" />
                        <Pill on={!!r.has_audience_demo}   label="A" />
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {r.liquipedia_url ? (
                        <a href={r.liquipedia_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-greenDark hover:underline">
                          link <ExternalLink size={10} />
                        </a>
                      ) : (
                        <span className="text-[11px] text-mute">no URL</span>
                      )}
                      <div className="text-[10px] text-mute mt-0.5">
                        {r.liquipedia_synced_at ? `synced ${formatDate(r.liquipedia_synced_at)}` : 'never synced'}
                      </div>
                    </td>
                    <td className={['px-3 py-2 text-right tabular-nums whitespace-nowrap font-mono', decayTone].join(' ')}>
                      × {decay.toFixed(3)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-[11px] text-mute">
                      {r.last_major_placement ? (
                        <>
                          <div className="text-ink">{r.last_major_placement}</div>
                          <div>{r.last_major_finish_date ? formatDate(r.last_major_finish_date) : '—'}</div>
                        </>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap text-[11px]">
                      {r.prize_money_24mo_usd ? `$${Number(r.prize_money_24mo_usd).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {r.liquipedia_url ? (
                        <button
                          type="button"
                          onClick={() => syncOne(r.id)}
                          disabled={syncing.has(r.id)}
                          className="btn btn-ghost text-xs disabled:opacity-50"
                          title="Re-pull Liquipedia data for this player"
                        >
                          <RefreshCw size={11} className={syncing.has(r.id) ? 'animate-spin' : ''} />
                          {syncing.has(r.id) ? 'syncing…' : 'sync'}
                        </button>
                      ) : (
                        <span className="text-[10px] text-mute">no URL</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-mute">No players match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Pill({ on, label }: { on: boolean; label: string }) {
  return (
    <span className={['inline-flex items-center px-1.5 py-0 rounded-full text-[10px] font-bold border whitespace-nowrap',
      on ? 'bg-green/15 text-greenDark border-green/40' : 'bg-bg text-mute border-line line-through opacity-70',
    ].join(' ')}>{label}</span>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toISOString().slice(0, 10);
  } catch { return iso; }
}
