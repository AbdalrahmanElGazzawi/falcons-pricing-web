'use client';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { MarketBand } from '@/lib/market-bands';
import { sourceLabel } from '@/lib/market-bands';
import { fmtCurrency, tierClass } from '@/lib/utils';
import { useDisplayCurrency } from '@/lib/use-display-currency';
import { CurrencyPill } from '@/components/CurrencyPill';
import { useToast } from '@/components/Toast';
import { SearchInput } from '@/components/SearchInput';
import { EmptyState } from '@/components/EmptyState';
import {
  Database, Plus, Save, Trash2, X as XIcon, AlertTriangle, Globe, Edit3, BookOpen,
} from 'lucide-react';

const PLATFORMS = [
  { key: 'rate_ig_reel',      label: 'IG Reel'    },
  { key: 'rate_ig_post',      label: 'IG Post'    },
  { key: 'rate_ig_story',     label: 'IG Story'   },
  { key: 'rate_tiktok_video', label: 'TikTok'     },
  { key: 'rate_yt_full',      label: 'YT Full'    },
  { key: 'rate_yt_short',     label: 'YT Short'   },
  { key: 'rate_twitch_stream',label: 'Twitch'     },
  { key: 'rate_x_post',       label: 'X Post'     },
  { key: 'rate_irl',          label: 'IRL Event'  },
];
const MARKETS = ['KSA', 'MENA', 'GCC', 'Global'];
const SOURCES = [
  { value: 'peer_rate_card',         label: 'Peer rate card' },
  { value: 'methodology_v2_baseline',label: 'Methodology v2' },
  { value: 'closed_deal_history',    label: 'Closed-deal history' },
  { value: 'manual_override',        label: 'Manual override' },
];

export function MarketBandsEditor({
  initialBands, tiers, gameOptions,
}: {
  initialBands: MarketBand[];
  tiers: string[];
  gameOptions: string[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [bands, setBands] = useState<MarketBand[]>(initialBands);
  const [q, setQ] = useState('');
  const [filterTier, setFilterTier] = useState('');
  const [filterMarket, setFilterMarket] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [filterGame, setFilterGame] = useState<'__all__' | '__universal__' | string>('__all__');
  const [filterSource, setFilterSource] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const [ccy] = useDisplayCurrency();

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return bands.filter(b => {
      if (filterTier && b.tier_code !== filterTier) return false;
      if (filterMarket && b.audience_market !== filterMarket) return false;
      if (filterPlatform && b.platform !== filterPlatform) return false;
      if (filterGame === '__universal__' && b.game !== null) return false;
      if (filterGame !== '__all__' && filterGame !== '__universal__' && b.game !== filterGame) return false;
      if (filterSource && b.source !== filterSource) return false;
      if (s) {
        const blob = [b.tier_code, b.audience_market, b.platform, b.game, b.source_notes, b.notes].filter(Boolean).join(' ').toLowerCase();
        if (!blob.includes(s)) return false;
      }
      return true;
    });
  }, [bands, q, filterTier, filterMarket, filterPlatform, filterGame, filterSource]);

  // Coverage stats — how many of the canonical (tier × market × platform)
  // universal cells are populated. Surfaces gaps to management.
  const coverage = useMemo(() => {
    const universal = bands.filter(b => b.game === null);
    const cells = new Set(universal.map(b => `${b.tier_code}|${b.audience_market}|${b.platform}`));
    const expected = tiers.length * MARKETS.length * PLATFORMS.length;
    return { populated: cells.size, expected, pct: expected > 0 ? Math.round((cells.size / expected) * 100) : 0 };
  }, [bands, tiers]);

  async function refresh() {
    const res = await fetch('/api/admin/market-bands?activeOnly=true', { cache: 'no-store' });
    if (res.ok) {
      const j = await res.json();
      setBands(j.bands ?? []);
    }
    startTransition(() => router.refresh());
  }

  async function deleteBand(id: string, label: string) {
    if (!confirm(`Retire band: ${label}?`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/market-bands/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Retired'); await refresh(); }
    else { const j = await res.json().catch(() => ({})); toast.error('Delete failed', j.error); }
    setBusy(false);
  }

  return (
    <>
      {/* Coverage banner */}
      <div className="card card-p mb-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-sm text-label">Universal-baseline coverage</div>
          <div className="text-2xl font-semibold text-ink mt-1 tabular-nums">
            {coverage.populated} <span className="text-mute text-base">/ {coverage.expected}</span>
            <span className={[
              'ml-2 text-sm font-semibold',
              coverage.pct >= 90 ? 'text-greenDark' : coverage.pct >= 60 ? 'text-orange-700' : 'text-red-600',
            ].join(' ')}>
              {coverage.pct}%
            </span>
          </div>
          <div className="text-xs text-mute mt-1">
            Cells with no band fall back to methodology baseline. {bands.filter(b => b.game !== null).length} game-specific overrides on top.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAdd(true)} className="btn btn-primary">
            <Plus size={14} className="inline mr-1" /> New band
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <SearchInput value={q} onChange={setQ} placeholder="Search source notes, game, platform…" className="flex-1 min-w-[220px] max-w-md" />
        <select value={filterTier} onChange={e => setFilterTier(e.target.value)} className="input max-w-[140px]">
          <option value="">All tiers</option>
          {tiers.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterMarket} onChange={e => setFilterMarket(e.target.value)} className="input max-w-[140px]">
          <option value="">All markets</option>
          {MARKETS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)} className="input max-w-[160px]">
          <option value="">All platforms</option>
          {PLATFORMS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
        <select value={filterGame} onChange={e => setFilterGame(e.target.value as any)} className="input max-w-[180px]">
          <option value="__all__">All games</option>
          <option value="__universal__">Universal only</option>
          {gameOptions.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className="input max-w-[180px]">
          <option value="">All sources</option>
          {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <CurrencyPill />
        <div className="text-sm text-label ml-auto whitespace-nowrap">{filtered.length} of {bands.length}</div>
      </div>

      {/* Bands table */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Database}
            title="No matches"
            body={q || filterTier || filterMarket || filterPlatform || filterGame !== '__all__' || filterSource
              ? 'Try clearing filters.'
              : 'No active market bands. Add the first one to start defending prices.'}
            action={!q && !filterTier && !filterMarket && !filterPlatform && filterGame === '__all__' && !filterSource
              ? { label: 'Add band', onClick: () => setShowAdd(true) } as any
              : undefined}
          />
        ) : (
          <div className="overflow-x-auto max-h-[78vh]">
            <table className="data-table density-comfortable">
              <thead>
                <tr>
                  <th>Tier</th>
                  <th>Game</th>
                  <th>Market</th>
                  <th>Platform</th>
                  <th className="text-right">Min</th>
                  <th className="text-right">Median</th>
                  <th className="text-right">Max</th>
                  <th>Source</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => editingId === b.id ? (
                  <BandEditRow
                    key={b.id} band={b}
                    onSaved={async () => { setEditingId(null); await refresh(); }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <tr key={b.id}>
                    <td><span className={`chip border whitespace-nowrap ${tierClass(b.tier_code)}`}>{b.tier_code}</span></td>
                    <td className="text-sm">
                      {b.game ? (
                        <span className="text-ink whitespace-nowrap">{b.game}</span>
                      ) : (
                        <span className="text-mute italic whitespace-nowrap">universal</span>
                      )}
                    </td>
                    <td className="text-label whitespace-nowrap text-sm">
                      <span className="inline-flex items-center gap-1"><Globe size={11} className="text-mute" /> {b.audience_market}</span>
                    </td>
                    <td className="text-label whitespace-nowrap text-sm">{PLATFORMS.find(p => p.key === b.platform)?.label ?? b.platform}</td>
                    <td className="text-right text-mute whitespace-nowrap tabular-nums">{fmtCurrency(b.min_sar, ccy, 3.75)}</td>
                    <td className="text-right text-ink font-semibold whitespace-nowrap tabular-nums">{fmtCurrency(b.median_sar, ccy, 3.75)}</td>
                    <td className="text-right text-mute whitespace-nowrap tabular-nums">{fmtCurrency(b.max_sar, ccy, 3.75)}</td>
                    <td>
                      <SourceChip source={b.source} url={b.source_url} notes={b.source_notes} />
                    </td>
                    <td className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <button onClick={() => setEditingId(b.id)} className="text-xs text-greenDark hover:underline whitespace-nowrap"><Edit3 size={11} className="inline mr-0.5" />Edit</button>
                        <button onClick={() => deleteBand(b.id, `${b.tier_code} ${b.game ?? 'universal'} ${b.audience_market} ${b.platform}`)} disabled={busy} className="text-xs text-red-600 hover:underline whitespace-nowrap"><Trash2 size={11} className="inline mr-0.5" />Retire</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <NewBandModal
          tiers={tiers}
          gameOptions={gameOptions}
          onClose={() => setShowAdd(false)}
          onSaved={async () => { setShowAdd(false); await refresh(); }}
        />
      )}
    </>
  );
}

function SourceChip({ source, url, notes }: { source: string; url?: string | null; notes?: string | null }) {
  const tone =
    source === 'peer_rate_card'         ? 'bg-green/10 text-greenDark dark:text-green border-green/30' :
    source === 'closed_deal_history'    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700/50' :
    source === 'manual_override'        ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700/50' :
                                          'bg-bg dark:bg-card text-mute border-line';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${tone}`}
          title={notes ?? sourceLabel(source)}>
      <BookOpen size={10} />
      {sourceLabel(source)}
      {url && <a href={url} target="_blank" rel="noreferrer" className="ml-0.5 text-mute hover:text-greenDark" onClick={e => e.stopPropagation()}>↗</a>}
    </span>
  );
}

function BandEditRow({ band, onSaved, onCancel }: { band: MarketBand; onSaved: () => void; onCancel: () => void }) {
  const [min, setMin] = useState(String(band.min_sar));
  const [med, setMed] = useState(String(band.median_sar));
  const [max, setMax] = useState(String(band.max_sar));
  const [source, setSource] = useState(band.source);
  const [url, setUrl] = useState(band.source_url ?? '');
  const [notes, setNotes] = useState(band.source_notes ?? '');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function save() {
    setSaving(true);
    const body = { min_sar: Number(min), median_sar: Number(med), max_sar: Number(max), source, source_url: url, source_notes: notes };
    const res = await fetch(`/api/admin/market-bands/${band.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { toast.error('Save failed', j.error); return; }
    toast.success('Saved');
    onSaved();
  }

  return (
    <tr className="bg-greenSoft/40">
      <td><span className="chip">{band.tier_code}</span></td>
      <td className="text-mute italic">{band.game ?? 'universal'}</td>
      <td className="text-mute">{band.audience_market}</td>
      <td className="text-mute">{band.platform}</td>
      <td className="text-right"><input type="number" value={min} onChange={e => setMin(e.target.value)} className="input py-1 text-right w-[100px] text-sm tabular-nums" /></td>
      <td className="text-right"><input type="number" value={med} onChange={e => setMed(e.target.value)} className="input py-1 text-right w-[100px] text-sm tabular-nums" /></td>
      <td className="text-right"><input type="number" value={max} onChange={e => setMax(e.target.value)} className="input py-1 text-right w-[100px] text-sm tabular-nums" /></td>
      <td>
        <div className="flex flex-col gap-1">
          <select value={source} onChange={e => setSource(e.target.value)} className="input py-1 text-xs">
            {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Source URL" className="input py-1 text-[11px]" />
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes" className="input py-1 text-[11px]" />
        </div>
      </td>
      <td>
        <div className="flex flex-col gap-1 items-end">
          <button onClick={save} disabled={saving} className="btn btn-primary text-xs"><Save size={11} className="inline mr-0.5" />{saving ? '…' : 'Save'}</button>
          <button onClick={onCancel} disabled={saving} className="btn btn-ghost text-xs">Cancel</button>
        </div>
      </td>
    </tr>
  );
}

function NewBandModal({
  tiers, gameOptions, onClose, onSaved,
}: { tiers: string[]; gameOptions: string[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [tier_code, setTier] = useState(tiers[0] ?? 'Tier 2');
  const [game, setGame] = useState('');
  const [market, setMarket] = useState('KSA');
  const [platform, setPlatform] = useState(PLATFORMS[0].key);
  const [min, setMin] = useState('');
  const [med, setMed] = useState('');
  const [max, setMax] = useState('');
  const [source, setSource] = useState('peer_rate_card');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function esc(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  async function save() {
    if (!min || !med || !max) { toast.error('Fill min / median / max'); return; }
    if (Number(min) > Number(med) || Number(med) > Number(max)) { toast.error('Need min ≤ median ≤ max'); return; }
    setSaving(true);
    const body = {
      tier_code, game: game || null, audience_market: market, platform,
      min_sar: Number(min), median_sar: Number(med), max_sar: Number(max),
      source, source_url: url || null, source_notes: notes || null,
    };
    const res = await fetch('/api/admin/market-bands', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { toast.error('Save failed', j.error); return; }
    toast.success('Created');
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/40">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-semibold text-ink text-base">Add market band</div>
            <div className="text-xs text-mute mt-0.5">Existing band for the same cell will be retired automatically.</div>
          </div>
          <button onClick={onClose} className="text-mute hover:text-ink"><XIcon size={16} /></button>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <label className="space-y-1">
            <div className="text-label">Tier *</div>
            <select value={tier_code} onChange={e => setTier(e.target.value)} className="input">
              {tiers.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <div className="text-label">Audience market *</div>
            <select value={market} onChange={e => setMarket(e.target.value)} className="input">
              {MARKETS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <div className="text-label">Platform *</div>
            <select value={platform} onChange={e => setPlatform(e.target.value)} className="input">
              {PLATFORMS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <div className="text-label">Game (blank = universal)</div>
            <input list="games-dl" value={game} onChange={e => setGame(e.target.value)} className="input" placeholder="(any)" />
            <datalist id="games-dl">
              {gameOptions.map(g => <option key={g} value={g} />)}
            </datalist>
          </label>
          <label className="space-y-1">
            <div className="text-label">Min SAR *</div>
            <input type="number" value={min} onChange={e => setMin(e.target.value)} className="input text-right tabular-nums" />
          </label>
          <label className="space-y-1">
            <div className="text-label">Median SAR *</div>
            <input type="number" value={med} onChange={e => setMed(e.target.value)} className="input text-right tabular-nums" />
          </label>
          <label className="space-y-1">
            <div className="text-label">Max SAR *</div>
            <input type="number" value={max} onChange={e => setMax(e.target.value)} className="input text-right tabular-nums" />
          </label>
          <label className="space-y-1">
            <div className="text-label">Source *</div>
            <select value={source} onChange={e => setSource(e.target.value)} className="input">
              {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
          <label className="col-span-2 space-y-1">
            <div className="text-label">Source URL (optional — link to peer card or doc)</div>
            <input value={url} onChange={e => setUrl(e.target.value)} className="input" placeholder="https://…" />
          </label>
          <label className="col-span-2 space-y-1">
            <div className="text-label">Notes</div>
            <input value={notes} onChange={e => setNotes(e.target.value)} className="input" placeholder="Calibrated to FaZe rate card Q1 2026, etc." />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={save} disabled={saving} className="btn btn-primary">{saving ? 'Saving…' : 'Create band'}</button>
        </div>
      </div>
    </div>
  );
}
