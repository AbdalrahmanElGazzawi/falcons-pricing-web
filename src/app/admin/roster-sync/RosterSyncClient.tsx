'use client';

import { useState } from 'react';

type SheetTalent = {
  game: string;
  team: string;
  nickname: string;
  full_name: string;
  role: string;
  nationality: string;
  date_of_birth: string | null;
  x_handle: string | null;
  instagram: string | null;
  twitch: string | null;
  kick: string | null;
  youtube: string | null;
  tiktok: string | null;
  facebook: string | null;
  uploaded: boolean;
};

type Orphan = { id: number; nickname: string; game: string | null; team: string | null };

type PreviewResult = {
  ok: true;
  total_in_sheet: number;
  total_in_db_active_players: number;
  total_in_db_creators: number;
  matched: number;
  missing: SheetTalent[];
  orphans: Orphan[];
};

export default function RosterSyncClient() {
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [committing, setCommitting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  async function onPickFile(file: File) {
    setError(null);
    const text = await file.text();
    setCsv(text);
  }

  async function runPreview() {
    setError(null);
    setSuccess(null);
    setPreview(null);
    setPreviewing(true);
    try {
      const r = await fetch('/api/admin/roster-sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'preview', csv }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || 'Preview failed'); return; }
      setPreview(j);
      // Auto-select everything by default — admin can deselect rows they
      // want to exclude (e.g. test data, mistaken sheet entries).
      setSelected(new Set(j.missing.map((m: SheetTalent) => m.nickname)));
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setPreviewing(false);
    }
  }

  async function runCommit() {
    if (!preview) return;
    setError(null);
    setSuccess(null);
    setCommitting(true);
    try {
      const rows = preview.missing.filter(m => selected.has(m.nickname));
      const r = await fetch('/api/admin/roster-sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'commit', rows }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || 'Insert failed'); return; }
      setSuccess(`Inserted ${j.inserted} new talents. ${j.skipped ? `Skipped ${j.skipped} duplicates.` : ''}`);
      // Re-run preview so the diff updates and they can confirm zero missing
      await runPreview();
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setCommitting(false);
    }
  }

  function toggle(nickname: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(nickname)) next.delete(nickname); else next.add(nickname);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {/* Input panel */}
      <section className="rounded-lg border border-line p-4">
        <h2 className="text-sm font-medium mb-2">1. Upload or paste CSV</h2>
        <div className="flex gap-3 items-center mb-3">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickFile(f); }}
            className="text-xs"
          />
          <span className="text-xs text-mute">or paste the CSV body below</span>
        </div>
        <textarea
          className="w-full h-32 rounded border border-line p-2 font-mono text-xs"
          placeholder="Game,Team,Nickname,Done by Esports,Uploaded to website,Role,..."
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
        />
        <div className="mt-3 flex gap-2">
          <button
            onClick={runPreview}
            disabled={previewing || csv.trim().length < 50}
            className="rounded bg-fg text-bg px-3 py-1.5 text-sm disabled:opacity-50"
          >
            {previewing ? 'Diffing…' : 'Preview diff'}
          </button>
          {error && <span className="text-sm text-rose-600">{error}</span>}
          {success && <span className="text-sm text-emerald-600">{success}</span>}
        </div>
      </section>

      {preview && (
        <>
          {/* Summary chips */}
          <section className="grid grid-cols-4 gap-3">
            <Stat label="Sheet talents" value={preview.total_in_sheet} />
            <Stat label="DB active players" value={preview.total_in_db_active_players} />
            <Stat label="Matched" value={preview.matched} accent="emerald" />
            <Stat label="Missing from DB" value={preview.missing.length} accent="rose" />
          </section>

          {/* Missing list */}
          <section className="rounded-lg border border-line p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-medium">
                Missing from DB — {preview.missing.length} talent{preview.missing.length === 1 ? '' : 's'}
              </h2>
              {preview.missing.length > 0 && (
                <button
                  onClick={runCommit}
                  disabled={committing || selected.size === 0}
                  className="rounded bg-emerald-600 text-white px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  {committing ? 'Inserting…' : `Insert selected (${selected.size})`}
                </button>
              )}
            </div>
            {preview.missing.length === 0 ? (
              <p className="text-sm text-mute">Clean — every sheet talent is in the DB.</p>
            ) : (
              <table className="w-full text-xs">
                <thead className="text-left text-mute border-b border-line">
                  <tr>
                    <th className="py-1.5">Select</th>
                    <th className="py-1.5">Game</th>
                    <th className="py-1.5">Team</th>
                    <th className="py-1.5">Nickname</th>
                    <th className="py-1.5">Name</th>
                    <th className="py-1.5">Role</th>
                    <th className="py-1.5">Nationality</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.missing.map((m) => (
                    <tr key={m.nickname} className="border-b border-line/50">
                      <td className="py-1.5">
                        <input
                          type="checkbox"
                          checked={selected.has(m.nickname)}
                          onChange={() => toggle(m.nickname)}
                        />
                      </td>
                      <td className="py-1.5">{m.game}</td>
                      <td className="py-1.5">{m.team}</td>
                      <td className="py-1.5 font-medium">{m.nickname}</td>
                      <td className="py-1.5">{m.full_name}</td>
                      <td className="py-1.5">{m.role}</td>
                      <td className="py-1.5">{m.nationality}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* Orphans list */}
          {preview.orphans.length > 0 && (
            <section className="rounded-lg border border-line p-4">
              <h2 className="text-sm font-medium mb-2">
                Active in DB but NOT in sheet — {preview.orphans.length}
              </h2>
              <p className="text-xs text-mute mb-2">
                Possible orphans (rows the sheet doesn't carry). Could be legit (e.g. released
                talent not yet deactivated) or stale. Review manually — no automated action here.
              </p>
              <ul className="text-xs space-y-0.5">
                {preview.orphans.slice(0, 50).map((o) => (
                  <li key={o.id}>
                    <span className="font-medium">{o.nickname}</span>
                    <span className="text-mute"> · {o.game || '—'} · {o.team || '—'} (id={o.id})</span>
                  </li>
                ))}
                {preview.orphans.length > 50 && (
                  <li className="text-mute">…and {preview.orphans.length - 50} more</li>
                )}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: 'emerald' | 'rose' }) {
  const color =
    accent === 'emerald' ? 'text-emerald-600' :
    accent === 'rose'    ? 'text-rose-600'    : 'text-fg';
  return (
    <div className="rounded border border-line p-3">
      <div className="text-xs text-mute">{label}</div>
      <div className={`text-xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}
