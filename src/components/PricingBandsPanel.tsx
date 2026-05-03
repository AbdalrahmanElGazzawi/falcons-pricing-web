'use client';
/**
 * F/A/S/C pricing audit panel — PR2.
 *
 * One row per platform on the talent's internal rate card. Each row shows
 * Floor / Anchor / Stretch / Ceiling. Click any cell to expand the math
 * inline (sources list with cite per source).
 *
 * Production grade selector + premium-stack slider re-compute on the client
 * — no server round-trip per change. Currency toggle (SAR/USD) uses the
 * existing site-wide hook.
 *
 * Manual overrides POST to /api/admin/pricing-overrides which writes the
 * audit row and supersedes any prior override on the same cell.
 */
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Pencil, Lock, AlertTriangle, RotateCcw, Save } from 'lucide-react';
import { computeBands } from '@/lib/pricing-bands';
import type {
  PricingInputs, MarketBandRow, CampaignSummary, ActiveOverride,
  ProductionGrade, BandResult, AllBandsForPlatform, Band,
} from '@/lib/pricing-bands';
import { useDisplayCurrency } from '@/lib/use-display-currency';
import { fmtCurrency } from '@/lib/utils';

const PLATFORM_LABELS: Record<string, string> = {
  rate_ig_reel:        'IG Reel',
  rate_ig_static:      'IG Post',
  rate_ig_story:       'IG Story',
  rate_ig_post:        'IG Post',
  rate_ig_reels:       'IG Reels',
  rate_tiktok_video:   'TikTok',
  rate_tiktok_ours:    'TikTok',
  rate_yt_short:       'YT Short',
  rate_yt_shorts:      'YT Shorts',
  rate_yt_full:        'YT Full',
  rate_x_post:         'X Post',
  rate_x_post_quote:   'X Post',
  rate_twitch_stream:  'Twitch 2h',
  rate_twitch_integ:   'Twitch Integ',
  rate_twitch_kick_live:'Twitch / Kick Live',
  rate_irl:            'IRL',
};

export function PricingBandsPanel({
  talent, bands, campaigns, overrides: initialOverrides, grades,
}: {
  talent: PricingInputs;
  bands: MarketBandRow[];
  campaigns: CampaignSummary[];
  overrides: ActiveOverride[];
  grades: ProductionGrade[];
}) {
  const router = useRouter();
  const [ccy] = useDisplayCurrency();
  const [, startTransition] = useTransition();

  const [overrides, setOverrides] = useState<ActiveOverride[]>(initialOverrides);
  const [gradeCode, setGradeCode] = useState<string>(grades[0]?.code ?? 'standard');
  const [premiumPct, setPremiumPct] = useState(40);   // %
  const [expanded, setExpanded] = useState<{ platform: string; band: Band } | null>(null);
  const [editing, setEditing] = useState<{ platform: string; band: Band; value: string; reason: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const grade = grades.find(g => g.code === gradeCode);
  const platforms = Object.keys(talent.internal_rates ?? {});

  const rows: AllBandsForPlatform[] = useMemo(() => {
    return platforms.map(platform => computeBands({
      talent, platform, bands, campaigns, productionGrade: grade, overrides,
      premiumStackPct: premiumPct / 100,
    }));
  }, [platforms, talent, bands, campaigns, grade, overrides, premiumPct]);

  function fmt(v: number | null): string {
    if (v == null) return '—';
    return fmtCurrency(v, ccy, 3.75);
  }

  function toggleExpand(platform: string, band: Band) {
    if (expanded?.platform === platform && expanded.band === band) setExpanded(null);
    else setExpanded({ platform, band });
  }

  function startOverride(platform: string, band: Band, currentVal: number | null) {
    setErr(null);
    setEditing({ platform, band, value: currentVal != null ? String(currentVal) : '', reason: '' });
  }

  async function saveOverride() {
    if (!editing) return;
    if (!editing.value || Number(editing.value) <= 0) { setErr('Override must be a positive SAR amount.'); return; }
    if (!editing.reason.trim()) { setErr('Reason is required for any override.'); return; }
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch('/api/admin/pricing-overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          talent_kind: talent.talent_kind,
          talent_id:   talent.talent_id,
          platform:    editing.platform,
          band:        editing.band,
          override_value_sar: Number(editing.value),
          reason: editing.reason.trim(),
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `Save failed (${res.status})`);
      // Optimistic merge: replace any prior override on same (platform, band)
      setOverrides(prev => [
        ...prev.filter(o => !(o.platform === editing.platform && o.band === editing.band)),
        j.override as ActiveOverride,
      ]);
      setEditing(null);
      startTransition(() => router.refresh());
    } catch (e: any) {
      setErr(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function removeOverride(platform: string, band: Band) {
    if (!confirm(`Remove override on ${PLATFORM_LABELS[platform] ?? platform} → ${band}?`)) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch('/api/admin/pricing-overrides', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          talent_kind: talent.talent_kind,
          talent_id:   talent.talent_id,
          platform, band,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Remove failed (${res.status})`);
      }
      setOverrides(prev => prev.filter(o => !(o.platform === platform && o.band === band)));
      startTransition(() => router.refresh());
    } catch (e: any) {
      setErr(e.message || 'Remove failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="card card-p flex flex-wrap items-end gap-4">
        <div>
          <label className="label">Production grade</label>
          <select className="input" value={gradeCode} onChange={e => setGradeCode(e.target.value)}>
            {grades.map(g => (
              <option key={g.code} value={g.code}>{g.label} (×{g.multiplier})</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="label flex items-center justify-between">
            <span>Premium stack</span>
            <span className="text-xs text-mute tabular-nums">{premiumPct}%</span>
          </label>
          <input
            type="range" min={0} max={100} step={5}
            value={premiumPct}
            onChange={e => setPremiumPct(Number(e.target.value))}
            className="w-full"
          />
          <p className="text-[10px] text-mute mt-1">Rights + relationship + bundle uplift applied to Anchor → Stretch.</p>
        </div>
        <div className="text-xs text-mute">
          Display: <span className="font-semibold text-ink">{ccy}</span>
        </div>
      </div>

      {err && (
        <div className="card card-p border-red-300 bg-red-50 text-red-700 text-sm flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5" /> {err}
        </div>
      )}

      {/* The grid */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-label uppercase tracking-wide bg-bg">
                <th className="px-4 py-3">Platform</th>
                <th className="px-4 py-3 text-right">Internal rate</th>
                <th className="px-4 py-3 text-right">Floor</th>
                <th className="px-4 py-3 text-right">Anchor</th>
                <th className="px-4 py-3 text-right">Stretch</th>
                <th className="px-4 py-3 text-right">Ceiling</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const label = PLATFORM_LABELS[r.platform] ?? r.platform;
                return (
                  <BandRow
                    key={r.platform}
                    label={label}
                    row={r}
                    expanded={expanded}
                    onToggle={(band) => toggleExpand(r.platform, band)}
                    onOverride={(band, val) => startOverride(r.platform, band, val)}
                    onRemoveOverride={(band) => removeOverride(r.platform, band)}
                    fmt={fmt}
                  />
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-mute">
                    No internal rates set on this talent yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Override editor modal */}
      {editing && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
          <button onClick={() => setEditing(null)} aria-label="Close"
            className="fixed inset-0 bg-navy/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md card overflow-hidden shadow-2xl">
            <div className="card-p space-y-4">
              <div>
                <h3 className="font-semibold text-ink">
                  Override {PLATFORM_LABELS[editing.platform] ?? editing.platform} → {editing.band}
                </h3>
                <p className="text-xs text-mute mt-1">
                  Hard-set this cell. Any existing override on this cell will be superseded (kept in audit history).
                </p>
              </div>
              <div>
                <label className="label">Value (SAR)</label>
                <input
                  type="number" min={0} step={100}
                  value={editing.value}
                  onChange={e => setEditing(s => s ? { ...s, value: e.target.value } : s)}
                  className="input"
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Reason *</label>
                <textarea
                  value={editing.reason}
                  onChange={e => setEditing(s => s ? { ...s, reason: e.target.value } : s)}
                  rows={3}
                  className="input resize-none"
                  placeholder="e.g. Negotiated card with talent's agency on 2026-04-15. Locked through end-of-quarter."
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={() => setEditing(null)} disabled={saving} className="btn btn-ghost text-sm">
                  Cancel
                </button>
                <button type="button" onClick={saveOverride} disabled={saving} className="btn btn-primary text-sm">
                  <Save size={14} /> {saving ? 'Saving…' : 'Save override'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── One row per platform with expandable cells ──────────────────────────
function BandRow({
  label, row, expanded, onToggle, onOverride, onRemoveOverride, fmt,
}: {
  label: string;
  row: AllBandsForPlatform;
  expanded: { platform: string; band: Band } | null;
  onToggle: (band: Band) => void;
  onOverride: (band: Band, val: number | null) => void;
  onRemoveOverride: (band: Band) => void;
  fmt: (v: number | null) => string;
}) {
  const cells: Array<{ band: Band; result: BandResult }> = [
    { band: 'floor',   result: row.floor   },
    { band: 'anchor',  result: row.anchor  },
    { band: 'stretch', result: row.stretch },
    { band: 'ceiling', result: row.ceiling },
  ];
  const isExpanded = expanded?.platform === row.platform;
  const expandedBand = isExpanded ? expanded.band : null;

  return (
    <>
      <tr className="border-t border-line hover:bg-bg/50">
        <td className="px-4 py-3 font-medium text-ink whitespace-nowrap">{label}</td>
        <td className="px-4 py-3 text-right text-mute tabular-nums">{fmt(row.internal_rate)}</td>
        {cells.map(c => (
          <td key={c.band} className="px-4 py-3 text-right">
            <button
              type="button"
              onClick={() => onToggle(c.band)}
              className={[
                'group inline-flex items-center gap-1 px-2 py-1 -my-1 rounded transition tabular-nums',
                expandedBand === c.band ? 'bg-greenSoft text-greenDark' : 'hover:bg-bg',
                c.result.overridden ? 'ring-1 ring-amber-400' : '',
                c.result.value == null ? 'text-mute' : 'text-ink font-medium',
              ].join(' ')}
              title={c.result.overridden ? 'Manually overridden' : 'Click to expand math'}
            >
              {c.result.overridden && <Lock size={10} className="text-amber-600" />}
              {fmt(c.result.value)}
              <ChevronRight size={12} className={['transition', expandedBand === c.band ? 'rotate-90' : ''].join(' ')} />
            </button>
          </td>
        ))}
      </tr>
      {isExpanded && expandedBand && (
        <tr className="bg-bg/40 border-t border-line">
          <td colSpan={6} className="px-4 py-4">
            <ExpandedDetail
              band={expandedBand}
              result={cells.find(c => c.band === expandedBand)!.result}
              onOverride={(val) => onOverride(expandedBand, val)}
              onRemoveOverride={() => onRemoveOverride(expandedBand)}
              fmt={fmt}
            />
          </td>
        </tr>
      )}
    </>
  );
}

function ExpandedDetail({
  band, result, onOverride, onRemoveOverride, fmt,
}: {
  band: Band;
  result: BandResult;
  onOverride: (val: number | null) => void;
  onRemoveOverride: () => void;
  fmt: (v: number | null) => string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-2 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wider text-label font-semibold">
            {band} — math {result.overridden && <span className="text-amber-700">· OVERRIDDEN</span>}
          </div>
          <div className="text-xs text-mute">winning method: <span className="font-semibold text-ink">{result.method}</span></div>
        </div>
        {result.sources.length === 0 ? (
          <p className="text-xs text-mute italic">No method produced a value for this cell.</p>
        ) : (
          <ol className="space-y-1.5">
            {result.sources.map((s, i) => (
              <li key={i} className={['text-xs flex items-start gap-2 px-2 py-1 rounded',
                i === 0 && !result.overridden ? 'bg-greenSoft text-greenDark font-medium' : 'text-mute',
              ].join(' ')}>
                <span className="font-mono tabular-nums whitespace-nowrap">{fmt(s.value)}</span>
                <span className="text-label">·</span>
                <span className="font-semibold whitespace-nowrap">{s.method}</span>
                <span className="text-label">·</span>
                <span>{s.cite}</span>
              </li>
            ))}
          </ol>
        )}
        {Object.keys(result.inputs).length > 0 && (
          <details className="text-[11px] text-mute">
            <summary className="cursor-pointer hover:text-ink select-none">Raw inputs</summary>
            <pre className="mt-1 p-2 bg-bg rounded overflow-x-auto text-[10px]">{JSON.stringify(result.inputs, null, 2)}</pre>
          </details>
        )}
      </div>
      <div className="space-y-2">
        {result.overridden ? (
          <button
            type="button"
            onClick={onRemoveOverride}
            className="btn btn-ghost text-xs w-full text-amber-700 hover:bg-amber-50"
          >
            <RotateCcw size={12} /> Remove override
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onOverride(result.value)}
            className="btn btn-ghost text-xs w-full"
          >
            <Pencil size={12} /> Override this cell
          </button>
        )}
        {result.overridden && result.override?.reason && (
          <div className="text-[11px] text-mute p-2 bg-bg rounded border border-line">
            <div className="font-semibold text-ink mb-0.5">Override reason</div>
            {result.override.reason}
            <div className="text-[10px] mt-1 opacity-70">
              by {result.override.created_by_email ?? 'admin'} · {result.override.effective_from}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
