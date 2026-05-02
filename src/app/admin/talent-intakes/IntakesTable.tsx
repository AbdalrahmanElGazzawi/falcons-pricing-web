'use client';
import { useMemo, useState } from 'react';
import { Copy, ExternalLink, Check, Search, RefreshCw } from 'lucide-react';

type P = {
  id: number; nickname: string; full_name: string | null;
  tier_code: string | null; role: string | null; game: string | null;
  team: string | null; nationality: string | null;
  avatar_url: string | null;
  intake_token: string | null; intake_status: string;
  intake_sent_at: string | null; intake_submitted_at: string | null;
  min_rates: Record<string, number> | null;
  min_rates_notes: string | null;
};

const STATUS_CHIP: Record<string, string> = {
  not_started: 'bg-bg text-mute border-line',
  sent:        'bg-amber-50 text-amber-800 border-amber-300',
  submitted:   'bg-greenSoft text-greenDark border-greenDark/40',
  approved:    'bg-greenSoft text-greenDark border-greenDark/40',
  revised:     'bg-blue-50 text-blue-800 border-blue-300',
};

const STATUS_LABEL: Record<string, string> = {
  not_started: 'Not started',
  sent:        'Link opened',
  submitted:   'Submitted',
  approved:    'Approved',
  revised:     'Revised',
};

export function IntakesTable({ players }: { players: P[] }) {
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const origin = typeof window === 'undefined' ? '' : window.location.origin;

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return players.filter(p => {
      if (statusFilter && p.intake_status !== statusFilter) return false;
      if (s) {
        const hay = [p.nickname, p.full_name, p.team, p.game, p.tier_code].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [players, q, statusFilter]);

  function copyLink(p: P) {
    if (!p.intake_token) return;
    const url = `${origin}/talent/${p.intake_token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(p.id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
          <input
            type="search"
            placeholder="Search nickname, team, game…"
            value={q}
            onChange={e => setQ(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-line rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-greenDark/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="text-xs border border-line rounded-lg px-2 py-2 bg-card"
        >
          <option value="">All statuses</option>
          <option value="not_started">Not started</option>
          <option value="sent">Link opened</option>
          <option value="submitted">Submitted</option>
          <option value="revised">Revised</option>
          <option value="approved">Approved</option>
        </select>
        <span className="text-[11px] text-mute">{filtered.length} of {players.length}</span>
      </div>

      <div className="rounded-xl border border-line bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg/60 border-b border-line">
            <tr className="text-[10px] uppercase tracking-wider text-label">
              <th className="text-left px-3 py-2">Player</th>
              <th className="text-left px-3 py-2">Tier</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-left px-3 py-2">Last activity</th>
              <th className="text-right px-3 py-2">Floors set</th>
              <th className="text-right px-3 py-2">Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map(p => {
              const setCount = Object.values(p.min_rates ?? {}).filter(v => Number(v) > 0).length;
              const lastTs = p.intake_submitted_at ?? p.intake_sent_at ?? null;
              const lastLabel = lastTs ? new Date(lastTs).toLocaleDateString('en-GB', { day:'2-digit', month:'short' }) : '—';
              const lastWhat = p.intake_submitted_at ? 'submitted' : (p.intake_sent_at ? 'opened' : '');
              const url = p.intake_token ? `${origin}/talent/${p.intake_token}` : null;

              return (
                <tr key={p.id}>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {p.avatar_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={p.avatar_url} alt={p.nickname} className="w-7 h-7 rounded-full object-cover" />
                        : <div className="w-7 h-7 rounded-full bg-bg border border-line text-[10px] flex items-center justify-center text-mute font-bold">{p.nickname.slice(0,2).toUpperCase()}</div>}
                      <div className="min-w-0">
                        <div className="font-medium text-ink truncate">{p.nickname}</div>
                        <div className="text-[11px] text-mute truncate">{p.game || p.team || p.full_name || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-label whitespace-nowrap">{p.tier_code || '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`chip border whitespace-nowrap ${STATUS_CHIP[p.intake_status] || STATUS_CHIP.not_started}`}>
                      {STATUS_LABEL[p.intake_status] || p.intake_status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-label whitespace-nowrap">
                    {lastLabel}{lastWhat && <span className="text-mute"> · {lastWhat}</span>}
                  </td>
                  <td className="px-3 py-2 text-right text-xs tabular-nums">
                    {setCount > 0 ? <span className="text-greenDark font-semibold">{setCount} / 12</span> : <span className="text-mute">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {url ? (
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => copyLink(p)}
                          className="text-xs text-greenDark hover:underline inline-flex items-center gap-1"
                          title="Copy link to clipboard"
                        >
                          {copiedId === p.id ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                        </button>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-mute hover:text-greenDark inline-flex items-center gap-0.5"
                          title="Open the player's view in a new tab"
                        >
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    ) : <span className="text-[11px] text-mute italic">No token</span>}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-mute">
                  Nobody matches that filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-[11px] text-mute flex items-center gap-1.5">
        <RefreshCw size={11} /> The same link stays valid forever — talent can revise minimums anytime.
      </div>
    </div>
  );
}
