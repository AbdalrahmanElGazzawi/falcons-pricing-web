'use client';
import { useMemo, useState } from 'react';
import {  Copy, ExternalLink, Check, Search, RefreshCw, Sparkles, Globe, ChevronDown, ChevronRight, Edit3, Trash2, Unlock, CheckCircle2 } from 'lucide-react';
import { resolveTalentPhoto, isAuto, audienceMarketFor } from '@/lib/talent-photo';
import { useLocale } from '@/lib/i18n/Locale';
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
  // Migration 058 — revision lockout + admin override
  intake_revision_count?: number | null;
  intake_locked_until?: string | null;
  intake_admin_override_at?: string | null;
  intake_admin_override_by?: string | null;
  agency_status?: string | null;
  agency_name?: string | null;
  agency_fee_pct?: number | null;
};

const STATUS_CHIP: Record<string, string> = {
  not_started: 'bg-bg dark:bg-card text-mute border-line',
  sent:        'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/50',
  submitted:   'bg-greenSoft dark:bg-green/15 text-greenDark dark:text-green border-greenDark/40',
  approved:    'bg-greenSoft dark:bg-green/15 text-greenDark dark:text-green border-greenDark/40',
  revised:     'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700/50',
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
  rate_ig_post:      'IG Post',
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

type OverrideState = { player: P; rates: Record<string, string>; agencyOn: boolean; agencyName: string; agencyFee: string };

export function IntakesTable({ players: initialPlayers }: { players: P[] }) {
  const [players, setPlayers] = useState<P[]>(initialPlayers);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [marketFilter, setMarketFilter] = useState<'' | 'KSA' | 'MENA' | 'Global'>('');
  const [photoFilter, setPhotoFilter] = useState<'' | 'missing' | 'auto' | 'uploaded'>('');
  const { t } = useLocale();
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [override, setOverride] = useState<OverrideState | null>(null);

  const RATE_KEYS: Array<{ k: string; label: string }> = [
    { k:'ig_reel',         label:'IG Reel' },
    { k:'ig_static',       label:'IG Static' },
    { k:'ig_story',        label:'IG Story' },
    { k:'tiktok_video',    label:'TikTok Video' },
    { k:'tiktok_repost',   label:'TikTok Repost' },
    { k:'yt_short',        label:'YT Short' },
    { k:'yt_short_repost', label:'YT Short Repost' },
    { k:'x_post',          label:'X Post' },
    { k:'x_repost',        label:'X Repost' },
    { k:'twitch_stream',   label:'Twitch Stream' },
    { k:'twitch_integ',    label:'Twitch Integ' },
    { k:'irl',             label:'IRL' },
  ];

  async function callAdmin(playerId: number, path: 'override'|'clear'|'unlock'|'approve', body?: unknown) {
    setBusyId(playerId);
    try {
      const res = await fetch(`/api/admin/talent-intake/${playerId}/${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        alert(`Failed: ${txt || res.status}`);
        return false;
      }
      return true;
    } finally {
      setBusyId(null);
    }
  }

  async function onClearSubmission(p: P) {
    if (!confirm(`Clear ${p.nickname}'s submission? This wipes their min_rates, resets status to 'not_started', and clears any lockout. They can resubmit fresh from the intake link.`)) return;
    if (await callAdmin(p.id, 'clear')) {
      setPlayers(rows => rows.map(r => r.id === p.id ? {
        ...r,
        min_rates: null,
        intake_status: 'not_started',
        intake_submitted_at: null,
        intake_revision_count: 0,
        intake_locked_until: null,
      } : r));
    }
  }

  async function onUnlock(p: P) {
    if (!confirm(`Unlock ${p.nickname}? This clears their 3-month revision lockout so they can revise once more without resubmitting.`)) return;
    if (await callAdmin(p.id, 'unlock')) {
      setPlayers(rows => rows.map(r => r.id === p.id ? {
        ...r,
        intake_revision_count: 0,
        intake_locked_until: null,
      } : r));
    }
  }

  // Approve as-submitted (Mig 062 workflow) — promotes status submitted/revised
  // to approved without changing min_rates. Engine immediately starts using
  // the floor on the next quote line.
  async function onApprove(p: P) {
    if (!confirm(`Approve ${p.nickname}'s submitted floor as-is? Their min_rates start applying to every quote line on the next reload.`)) return;
    if (await callAdmin(p.id, 'approve')) {
      setPlayers(rows => rows.map(r => r.id === p.id ? {
        ...r,
        intake_status: 'approved',
      } : r));
    }
  }

  function onOverride(p: P) {
    const initialRates: Record<string, string> = {};
    for (const { k } of RATE_KEYS) {
      const v = (p.min_rates ?? {})[k];
      initialRates[k] = v ? String(v) : '';
    }
    setOverride({
      player: p,
      rates: initialRates,
      agencyOn: p.agency_status === 'agency',
      agencyName: p.agency_name ?? '',
      agencyFee: p.agency_fee_pct != null ? String(p.agency_fee_pct) : '',
    });
  }

  async function submitOverride() {
    if (!override) return;
    const cleaned: Record<string, number> = {};
    for (const [k, v] of Object.entries(override.rates)) {
      const n = Number(String(v).replace(/[, ]/g,''));
      if (Number.isFinite(n) && n > 0) cleaned[k] = Math.round(n);
    }
    const body = {
      min_rates: cleaned,
      agency: {
        has_agency: override.agencyOn,
        name: override.agencyOn ? override.agencyName.trim() : null,
        fee_pct: override.agencyOn ? Number(String(override.agencyFee).replace(',','.')) : null,
      },
    };
    if (await callAdmin(override.player.id, 'override', body)) {
      const id = override.player.id;
      setPlayers(rows => rows.map(r => r.id === id ? {
        ...r,
        min_rates: cleaned,
        intake_status: 'approved',
        agency_status: override.agencyOn ? 'agency' : 'direct',
        agency_name:   override.agencyOn ? override.agencyName.trim() || null : null,
        agency_fee_pct: override.agencyOn && Number.isFinite(Number(override.agencyFee)) ? Number(override.agencyFee) : null,
      } : r));
      setOverride(null);
    }
  }


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
            placeholder={t('ti.search_ph')}
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
          <option value="">{t('ti.status.all')}</option>
          <option value="not_started">{t('ti.status.not_started')}</option>
          <option value="sent">{t('ti.status.sent')}</option>
          <option value="submitted">{t('ti.status.submitted')}</option>
          <option value="revised">{t('ti.status.revised')}</option>
          <option value="approved">{t('ti.status.approved')}</option>
        </select>
        <select
          value={marketFilter}
          onChange={e => setMarketFilter(e.target.value as any)}
          className="text-xs border border-line rounded-lg px-2 py-2 bg-card"
          title="Audience market — drives currency display (KSA/MENA = SAR primary, Global = USD primary)"
        >
          <option value="">{t('ti.market.all')}</option>
          <option value="KSA">KSA</option>
          <option value="MENA">MENA</option>
          <option value="Global">{t('ti.market.global_usd')}</option>
        </select>
        <select
          value={photoFilter}
          onChange={e => setPhotoFilter(e.target.value as any)}
          className="text-xs border border-line rounded-lg px-2 py-2 bg-card"
          title="Photo source"
        >
          <option value="">{t('ti.photo.all')}</option>
          <option value="uploaded">{t('ti.photo.uploaded')}</option>
          <option value="auto">{t('ti.photo.auto')}</option>
          <option value="missing">{t('ti.photo.missing')}</option>
        </select>
        <span className="text-[11px] text-mute">{filtered.length} of {players.length}</span>
      </div>

      <div className="rounded-xl border border-line bg-card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-bg/60 border-b border-line">
            <tr className="text-[10px] uppercase tracking-wider text-label">
              <th className="text-left px-3 py-2 w-[8px]"></th>
              <th className="text-left px-3 py-2">{t('ti.col.player')}</th>
              <th className="text-left px-3 py-2">{t('ti.col.tier')}</th>
              <th className="text-left px-3 py-2">{t('ti.col.market')}</th>
              <th className="text-left px-3 py-2">{t('ti.col.status')}</th>
              <th className="text-left px-3 py-2">{t('ti.col.last_activity')}</th>
              <th className="text-right px-3 py-2">{t('ti.col.floors_set')}</th>
              <th className="text-right px-3 py-2">{t('ti.col.floor_total')}</th>
              <th className="text-right px-3 py-2">{t('ti.col.link')}</th>
              <th className="text-right px-3 py-2">Actions</th>
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
              const lastWhat = p.intake_submitted_at ? t('ti.submitted_label') : (p.intake_sent_at ? t('ti.opened_label') : '');
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
                            <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700/50 text-[10px] flex items-center justify-center text-red-600 dark:text-red-300 font-bold">
                              {p.nickname.slice(0,2).toUpperCase()}
                            </div>
                          )}
                          {auto && (
                            <Sparkles size={9} className="absolute -bottom-0.5 -right-0.5 bg-card rounded-full p-0.5 text-orange-600 dark:text-orange-400" />
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
                        market === 'KSA'    ? 'bg-green/10 text-greenDark dark:text-green border-green/30' :
                        market === 'MENA'   ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/50' :
                                              'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700/50',
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
                            {copiedId === p.id ? <><Check size={12} /> {t('ti.copied')}</> : <><Copy size={12} /> {t('ti.copy')}</>}
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
                      ) : <span className="text-[11px] text-mute italic">{t('ti.no_token')}</span>}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-0.5">
                        {(p.intake_status === 'submitted' || p.intake_status === 'revised') && (
                          <button
                            onClick={() => onApprove(p)}
                            disabled={busyId === p.id}
                            className="p-1.5 rounded-md text-greenDark hover:text-green hover:bg-greenSoft/40 disabled:opacity-50"
                            title="Approve as-submitted — engine starts using these floors on the next quote line"
                            aria-label="Approve as-submitted"
                          >
                            <CheckCircle2 size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => onOverride(p)}
                          disabled={busyId === p.id}
                          className="p-1.5 rounded-md text-mute hover:text-greenDark hover:bg-greenSoft/40 disabled:opacity-50"
                          title="Override floor — set or replace min_rates as admin"
                          aria-label="Override floor"
                        >
                          <Edit3 size={14} />
                        </button>
                        {p.intake_locked_until && (
                          <button
                            onClick={() => onUnlock(p)}
                            disabled={busyId === p.id}
                            className="p-1.5 rounded-md text-amber-700 hover:text-amber-900 hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-50"
                            title={`Unlock revisions (locked until ${new Date(p.intake_locked_until).toLocaleDateString()})`}
                            aria-label="Unlock revisions"
                          >
                            <Unlock size={14} />
                          </button>
                        )}
                        {(p.min_rates && Object.keys(p.min_rates ?? {}).filter(k => Number((p.min_rates ?? {})[k]) > 0).length > 0) && (
                          <button
                            onClick={() => onClearSubmission(p)}
                            disabled={busyId === p.id}
                            className="p-1.5 rounded-md text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                            title="Clear submission — wipe min_rates, reset status, clear lockout"
                            aria-label="Clear submission"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isExpanded && p.min_rates && (
                    <tr key={`${p.id}-x`} className="bg-bg/40 border-t border-line/40">
                      <td colSpan={10} className="px-3 py-3">
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
                              <div key={k} className="rounded-lg border border-line bg-card px-2.5 py-1.5">
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
                <td colSpan={10} className="px-4 py-10 text-center text-sm text-mute">
                  {t('ti.no_match')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      <div className="text-[11px] text-mute flex items-center gap-1.5 flex-wrap">
        <RefreshCw size={11} /> {t('ti.link_forever')}
        <span className="ml-3 inline-flex items-center gap-1"><Sparkles size={11} className="text-orange-600" /> {t('ti.legend_auto')}</span>
        <span className="ml-3 inline-flex items-center gap-1"><Globe size={11} className="text-blue-600" /> {t('ti.legend_global')}</span>
      </div>

      {/* ── Override modal (Migration 058) ──────────────────────────── */}
      {override && (
        <div className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-4" onClick={() => setOverride(null)}>
          <div className="bg-card rounded-2xl border-2 border-greenDark/30 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-line flex items-center justify-between">
              <h2 className="font-semibold text-ink">Override floor — {override.player.nickname}</h2>
              <button onClick={() => setOverride(null)} className="text-mute hover:text-ink">×</button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-[11px] text-mute">Sets new min_rates + agency fields. Audit-logged. Doesn&apos;t affect the talent&apos;s lockout.</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {RATE_KEYS.map(({ k, label }) => (
                  <label key={k} className="flex items-center justify-between gap-2 border border-line rounded-lg px-2 py-1.5 bg-bg/40">
                    <span className="text-label">{label}</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={override.rates[k] ?? ''}
                      onChange={e => {
                        const v = e.target.value.replace(/[^\d]/g, '');
                        setOverride(st => st ? { ...st, rates: { ...st.rates, [k]: v } } : st);
                      }}
                      placeholder="SAR"
                      className="w-24 text-right text-xs tabular-nums border border-line rounded px-2 py-1 bg-card focus:outline-none focus:ring-1 focus:ring-greenDark/40"
                    />
                  </label>
                ))}
              </div>
              <div className="border-t border-line pt-3 space-y-2">
                <label className="flex items-center justify-between text-xs font-semibold">
                  <span>Agency representation</span>
                  <input type="checkbox" checked={override.agencyOn} onChange={e => setOverride(st => st ? { ...st, agencyOn: e.target.checked } : st)} />
                </label>
                {override.agencyOn && (
                  <div className="grid grid-cols-2 gap-2">
                    <input value={override.agencyName} onChange={e => setOverride(st => st ? { ...st, agencyName: e.target.value } : st)} placeholder="Agency name" className="text-xs border border-line rounded px-2 py-1.5 bg-bg" />
                    <input value={override.agencyFee} onChange={e => setOverride(st => st ? { ...st, agencyFee: e.target.value.replace(/[^\d.,]/g,'').slice(0,5) } : st)} placeholder="Fee %" className="text-xs border border-line rounded px-2 py-1.5 bg-bg tabular-nums" />
                  </div>
                )}
              </div>
            </div>
            <div className="px-5 py-3 border-t border-line flex items-center justify-end gap-2 bg-bg/30">
              <button onClick={() => setOverride(null)} className="text-xs px-3 py-2 rounded-lg border border-line hover:bg-bg">Cancel</button>
              <button onClick={submitOverride} disabled={busyId === override.player.id} className="btn btn-primary text-xs px-3 py-2 disabled:opacity-50">
                {busyId === override.player.id ? 'Saving…' : 'Save override'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
