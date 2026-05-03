'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, CheckCircle2, AlertCircle, Loader2, FileText } from 'lucide-react';

/**
 * Manus / external research CSV importer.
 *
 * Accepts a CSV with a header row. nickname column required. Other columns
 * (ig_followers, tiktok_followers, etc.) all optional — only present columns
 * trigger updates. Fuzzy nickname match (case-insensitive, full_name fallback).
 */
export default function ResearchImportPage() {
  const router = useRouter();
  const [csv, setCsv] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsv(String(ev.target?.result ?? ''));
    reader.readAsText(file);
  }

  async function submit() {
    if (!csv.trim()) { setError('Paste or upload CSV first'); return; }
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/admin/research-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `Import failed (${res.status})`);
      setResult(j);
      router.refresh();
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-1">Research import</h1>
      <p className="text-sm text-label mb-6">
        Upload a CSV from Manus (or any research source) to bulk-update follower counts,
        engagement rates, tournament data, and agency info on the active roster.
        Reach multiplier auto-recomputes downstream.
      </p>

      {/* Schema reference */}
      <div className="card card-p mb-4 text-xs">
        <div className="flex items-center gap-2 font-semibold mb-2">
          <FileText size={14} /> Expected CSV columns
        </div>
        <p className="text-mute mb-2">Header row required. <strong>nickname</strong> column is the only required field; everything else is opt-in.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          <div>
            <div className="font-semibold text-label uppercase tracking-wider text-[10px] mb-1">Followers (numbers, k/m suffix OK)</div>
            <code className="text-[11px] block leading-relaxed">ig_followers · tiktok_followers · yt_followers · twitch_followers · x_followers · kick_followers · snap_followers · fb_followers</code>
          </div>
          <div>
            <div className="font-semibold text-label uppercase tracking-wider text-[10px] mb-1">Engagement (% or fraction)</div>
            <code className="text-[11px] block leading-relaxed">ig_er · tiktok_er · yt_er · twitch_er · x_er</code>
          </div>
          <div>
            <div className="font-semibold text-label uppercase tracking-wider text-[10px] mb-1">Tournament + brand</div>
            <code className="text-[11px] block leading-relaxed">peak_tournament_tier (S/A/B/C) · last_major_placement · last_major_finish_date (YYYY-MM-DD) · prize_money_24mo_usd · liquipedia_url</code>
          </div>
          <div>
            <div className="font-semibold text-label uppercase tracking-wider text-[10px] mb-1">Other</div>
            <code className="text-[11px] block leading-relaxed">agency_name · notes</code>
          </div>
        </div>
      </div>

      {/* Upload widget */}
      <div className="card card-p mb-4">
        <div className="flex items-center gap-3 mb-3">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            className="block text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-bg file:text-ink hover:file:bg-line"
          />
          <span className="text-xs text-mute">or paste CSV below</span>
        </div>
        <textarea
          value={csv}
          onChange={e => setCsv(e.target.value)}
          placeholder="nickname,ig_followers,tiktok_followers,yt_followers&#10;Spy,76000,12000,5000&#10;madv,106000,40000,8000"
          rows={12}
          className="input font-mono text-xs w-full"
        />
        <div className="flex items-center justify-between mt-3">
          <div className="text-xs text-mute">{csv ? `${csv.split('\n').filter(l => l.trim()).length} non-empty lines` : 'No data'}</div>
          <button
            onClick={submit}
            disabled={submitting || !csv.trim()}
            className="px-4 py-2 rounded bg-green text-white font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {submitting ? 'Importing…' : 'Import'}
          </button>
        </div>
      </div>

      {/* Errors */}
      {error && (
        <div className="rounded-lg border border-red/40 bg-red/5 p-3 text-sm text-red-900 dark:text-red mb-4 flex items-start gap-2">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="card card-p">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green" />
              Import complete
            </h2>
            <span className="text-xs text-mute">{result.total_rows} rows processed</span>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded border border-green/30 bg-green/5">
              <div className="text-[10px] uppercase tracking-wider text-label">Matched</div>
              <div className="text-2xl font-bold text-green">{result.matched_count}</div>
            </div>
            <div className="p-3 rounded border border-amber/30 bg-amber/5">
              <div className="text-[10px] uppercase tracking-wider text-label">Unmatched</div>
              <div className="text-2xl font-bold text-amber">{result.unmatched_count}</div>
            </div>
            <div className="p-3 rounded border border-red/30 bg-red/5">
              <div className="text-[10px] uppercase tracking-wider text-label">Errors</div>
              <div className="text-2xl font-bold text-red">{result.error_count}</div>
            </div>
          </div>

          {result.unmatched?.length > 0 && (
            <details className="mb-3 text-xs">
              <summary className="font-semibold cursor-pointer text-amber">
                Unmatched nicknames ({result.unmatched.length})
              </summary>
              <div className="mt-2 p-2 rounded bg-bg/40 max-h-40 overflow-y-auto">
                <code className="text-[11px]">{result.unmatched.join(', ')}</code>
              </div>
              <p className="text-mute mt-1">
                These nicknames didn&apos;t match anyone in the active roster. Check spelling or run again with the correct DB nickname.
              </p>
            </details>
          )}

          {result.matched?.length > 0 && (
            <details className="text-xs">
              <summary className="font-semibold cursor-pointer">
                Matched updates ({result.matched.length})
              </summary>
              <div className="mt-2 max-h-60 overflow-y-auto">
                <table className="w-full text-[11px]">
                  <thead className="text-label uppercase tracking-wider">
                    <tr>
                      <th className="text-left py-1 pr-2">Sheet nickname</th>
                      <th className="text-left py-1 px-2">DB nickname</th>
                      <th className="text-right py-1 pl-2"># updates</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.matched.map((m: any, i: number) => (
                      <tr key={i} className="border-t border-line/40">
                        <td className="py-1 pr-2">{m.sheet_nick}</td>
                        <td className="py-1 px-2 text-ink">{m.db_nick}</td>
                        <td className="py-1 pl-2 text-right tabular-nums">{m.updates}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}

          {result.errors?.length > 0 && (
            <details className="mt-3 text-xs">
              <summary className="font-semibold cursor-pointer text-red">Errors</summary>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                {result.errors.map((e: any, i: number) => (
                  <li key={i}><strong>{e.nick}</strong>: {e.error}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
