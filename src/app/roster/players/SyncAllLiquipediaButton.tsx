'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, RefreshCw } from 'lucide-react';

interface SummaryDetail {
  id: number; nickname: string; ok: boolean; reason?: string;
  prize_money_24mo_usd?: number; peak_tournament_tier?: string;
}
interface SummaryResponse {
  ran_at: string;
  total: number;
  ok: number;
  failed: number;
  details: SummaryDetail[];
}

export function SyncAllLiquipediaButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SummaryResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    if (running) return;
    if (!confirm(
      'Pull tournament data from Liquipedia for every active player with a URL set.\n\n' +
      'This takes about 5 minutes (rate-limited by Liquipedia ToS at 1 req/2s).\n' +
      'Stay on this page or it will keep running in the background.\n\n' +
      'Continue?'
    )) return;
    setErr(null); setResult(null); setRunning(true);
    try {
      const res = await fetch('/api/admin/players/sync-liquipedia-all', { method: 'POST' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Request failed: ${res.status}`);
      }
      const j = await res.json() as SummaryResponse;
      setResult(j);
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={run}
        disabled={running}
        className="btn btn-ghost text-xs"
        title="Pull tournament data from Liquipedia for every player with a URL set (~5 min)"
      >
        {running
          ? <><RefreshCw size={12} className="animate-spin" /> Syncing all… (~5 min)</>
          : <><Trophy size={12} /> Sync all Liquipedia</>}
      </button>
      {result && (
        <div className="text-xs text-mute">
          ✓ {result.ok}/{result.total} synced ·
          {' '}{result.details.filter(d => (d.prize_money_24mo_usd ?? 0) > 0).length} with tournament hits ·
          {' '}{result.failed} failed
        </div>
      )}
      {err && <div className="text-xs text-red-600">{err}</div>}
    </div>
  );
}
