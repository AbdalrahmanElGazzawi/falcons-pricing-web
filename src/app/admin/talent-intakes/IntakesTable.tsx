'use client';
import { useMemo, useState } from 'react';
import { Copy, ExternalLink, Check, Search, RefreshCw, Sparkles, Globe, ChevronDown, ChevronRight } from 'lucide-react';
import { resolveTalentPhoto, isAuto, audienceMarketFor } from '@/lib/talent-photo';
import { fmtCurrency } from '@/lib/utils';

type P = {
  id: number; nickname: string; full_name: string | null;
  tier_code: string | null; role: string | null; game: string | null;
  team: string | null; nationality: string | null;
  avatar_url: string | null;
  instagram?: string | null;
  x_handle?: string | null;
  tiktok?: string | null;
  twitch?: string | null;
  youtube?: string | null;
  commission?: number | null;
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

// Friendly labels for the floor breakdown — keep aligned with PLAYER_PLATFORMS in lib/types.ts
const PLATFORM_LABELS: Record<string, string> = {
  rate_ig_reel:        'IG Reel',
  rate_ig_static:      'IG Post',
  rate_ig_story:       'IG Story',
  rate_tiktok_video:   'TikTok',
  rate_yt_short:       'YT Short',
  rate_x_post:         'X Post',
  rate_fb_post:        'FB Post',
  rate_twitch_stream:  'Twitch 2h',
  rate_twitch_integ:   'Twitch Integ',
  rate_irl:            'IRL',
};

const SAR_PER_USD = 3.75; // peg

function sumFloors(min: Record<string, number> | null): number {
  if (!min) return 0;
  return Object.values(min).reduce((a, v) => a + (Number(v) || 0), 0);
}

export function IntakesTable({ players }: { players: P[] }) {
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [marketFilter, setMarketFilter] = useState<'' | 'KSA' | 'MENA' | 'Global'>('');
  const [photoFilter, setPhotoFilter] = useState<'' | 'missing' | 'auto' | 'uploaded'>('');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const origin = typeof window === 'undefined' ? '' : window.location.origin;

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return players.filter(p => {
      if (statusFilter && p.intake_status !== statusFilter) return false;
      const market = audienceMarketFor(p.nationality);
      if (marketFilter && marketFilter !== market) return false;
      if (photoFilter) {
        const photo = resolveTalentPhoto(p);
        if (photoFilter === 'missing'  && photo.url !== null) return false;
        if (photoFilter === 'uploaded' && photo.source !== 'explicit') return false;
        if (photoFilter === 'auto'     && (photo.source === 'explicit' || photo.url === null)) return false;
      }
      if (s) {
        const hay = [p.nickname, p.full_name, p.team, p.game, p.tier_code, p.nationality].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [players, q, statusFilter, marketFilter, photoFilter]);

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
            placeholder="Search nickname, team, game, nationality…"
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
        <select
          value={marketFilter}
          onChange={e => setMarketFilter(e.target.value as any)}
          className="text-xs border border-line rounded-lg px-2 py-2 bg-card"
          title="Audience market — drives currency display (KSA/MENA = SAR primary, Global = USD primary)"
        >
          <option value="">All markets</option>
          <option value="KSA">KSA</option>
          <option value="MENA">MENA</option>
          <option value="Global">Global (USD)</option>
        </select>
        <select
          value={photoFilter}
          onChange={e => setPhotoFilter(e.target.value as any)}
          className="text-xs border border-line rounded-lg px-2 py-2 bg-card"
          title="Photo source"
        >
          <option value="">All photos</option>
          <option value="uploaded">Uploaded</option>
          <option value="auto">Auto (from social)</option>
          <option value="missing">Missing</option>
        </select>
        <span className="text-[11px] text-mute">{filtered.length} of {players.length}</span>
      </div>

      <div className="rounded-xl border border-line bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg/60 border-b border-line">
            <tr className="text-[10px] uppercase tracking-wider text-label">
              <th className="text-left px-3 py-2 w-[8px]"></th>
              <th className="text-left px-3 py-2">Player</th>
              <th className="text-left px-3 py-2">Tier</th>
              <th className="text-left px-3 py-2">Market</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-left px-3 py-2">Last activity</th>
              <th className="text-right px-3 py-2">Floors set</th>
              <th className="text-right px-3 py-2">Floor total</th>
              <th className="text-right px-3 py-2">Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map(p => {
              const photo = resolveTalentPhoto(p);
              const auto = isAuto(photo.source);
              const market = audienceMarketFor(p.nationality);
              const isGlobal = market === 'Global';
              const ccy = isGlobal ? 'USD' : 'SAR';
              const setCount = Object.values(p.min_rates ?? {}).filter(v => Number(v) > 0).length;
              const totalSar = sumFloors(p.min_rates);
              const totalUsd = totalSar / SAR_PER_USD;
              const lastTs = p.intake_submitted_at ?? p.intake_sent_at ?? null;
              const lastLabel = lastTs ? new Date(lastTs).toLocaleDateString('en-GB', { day:'2-digit', month:'short' }) : '—';
              const lastWhat = p.intake_submitted_at ? 'submitted' : (p.intake_sent_at ? 'opened' : '');
              const url = p.intake_token ? `${origin}/talent/${p.intake_token}` : null;
              const isExpanded = expandedId === p.id;
              const canExpand = setCount > 0;

              return (
                <>
                  <tr key={p.id} className={isExpanded ? 'bg-bg/40' : ''}>
                    <td className="px-2 py-2">
                      {canExpand && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : p.id)}
                          className="text-mute hover:text-ink"
                          title={isExpanded ? 'Collapse' : 'Show floor breakdown'}
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          {photo.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={photo.url}
                              alt={p.nickname}
                              className={`w-8 h-8 rounded-full object-cover ${auto ? 'ring-2 ring-orange-300/70 ring-offset-1' : ''}`}
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-red-50 border border-red-200 text-[10px] flex items-center justify-center text-red-600 font-bold">
                              {p.nickname.slice(0,2).toUpperCase()}
                            </div>
                          )}
                          {auto && (
                            <Sparkles size={9} className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5 text-orange-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-ink truncate flex items-center gap-1">
                            {p.nickname}
                            {isGlobal && <Globe size={10} className="text-blue-600" />}
                          </div>
                          <div className="text-[11px] text-mute truncate">
                            {p.game || p.team || p.full_name || ''}
                            {p.nationality && <span className="opacity-70"> · {p.nationality}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-label whitespace-nowrap">{p.tier_code || '—'}</td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap">
                      <span className={[
                        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-semibold',
                        market === 'KSA'    ? 'bg-green/10 text-greenDark border-green/30' :
                        market === 'MENA'   ? 'bg-amber-50 text-amber-800 border-amber-300' :
                                              'bg-blue-50 text-blue-700 border-blue-200',
                      ].join(' ')}>
                        {market === 'Global' ? <Globe size={9} /> : null}
                        {market}
                      </span>
                    </td>
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
                    <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">
                      {totalSar > 0 ? (
                        <div className="flex flex-col items-end leading-tight">
                          <span className="text-ink font-semibold text-xs">
                            {ccy === 'USD'
                              ? fmtCurrency(totalSar, 'USD', SAR_PER_USD)
                              : fmtCurrency(totalSar, 'SAR', SAR_PER_USD)}
                          </span>
                          <span className="text-[10px] text-mute">
                            {ccy === 'USD' ? fmtCurrency(totalSar, 'SAR', SAR_PER_USD) : fmtCurrency(totalSar, 'USD', SAR_PER_USD)}
                          </span>
                        </div>
                      ) : <span className="text-mute text-xs">—</span>}
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
                  {isExpanded && p.min_rates && (
                    <tr key={`${p.id}-x`} className="bg-bg/40 border-t border-line/40">
                      <td colSpan={9} className="px-3 py-3">
                        <div className="text-[11px] text-mute mb-2 flex items-center gap-3 flex-wrap">
                          <span className="font-semibold text-ink">{p.nickname}&apos;s minimum floors</span>
                          <span>·</span>
                          <span>Total: <span className="text-ink font-semibold">{fmtCurrency(totalSar, 'SAR', SAR_PER_USD)}</span></span>
                          <span className="text-mute">/ {fmtCurrency(totalSar, 'USD', SAR_PER_USD)}</span>
                          {isGlobal && <span className="text-blue-700"> · displayed in {ccy} primary</span>}
                          {p.min_rates_notes && (
                            <span className="ml-auto text-mute italic">&ldquo;{p.min_rates_notes}&rdquo;</span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                          {Object.entries(p.min_rates).filter(([,v]) => Number(v) > 0).map(([k, v]) => {
                            const vSar = Number(v);
                            const vUsd = vSar / SAR_PER_USD;
                            return (
                              <div key={k} className="rounded-lg border border-line bg-white px-2.5 py-1.5">
                                <div className="text-[10px] uppercase tracking-wider text-mute font-semibold">{PLATFORM_LABELS[k] || k.replace(/^rate_/, '').replace(/_/g, ' ')}</div>
                                <div className="text-sm font-semibold text-ink tabular-nums">
                                  {ccy === 'USD' ? `$ ${Math.round(vUsd).toLocaleString('en-US')}` : `SAR ${Math.round(vSar).toLocaleString('en-US')}`}
                                </div>
                                <div className="text-[10px] text-mute tabular-nums">
                                  {ccy === 'USD' ? `SAR ${Math.round(vSar).toLocaleString('en-US')}` : `$ ${Math.round(vUsd).toLocaleString('en-US')}`}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-mute">
                  Nobody matches that filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-[11px] text-mute flex items-center gap-1.5 flex-wrap">
        <RefreshCw size={11} /> Same link stays valid forever — talent revises minimums anytime.
        <span className="ml-3 inline-flex items-center gap-1"><Sparkles size={11} className="text-orange-600" /> auto photo from social handle</span>
        <span className="ml-3 inline-flex items-center gap-1"><Globe size={11} className="text-blue-600" /> global talent → USD primary</span>
      </div>
    </div>
  );
}
