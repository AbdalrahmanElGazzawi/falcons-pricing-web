'use client';

import { useMemo, useState } from 'react';

type Player = { id: number; nickname: string; full_name: string | null; game: string | null; team: string | null; agency_name: string | null };
type Token = {
  token: string; agency_name: string; agency_email: string | null;
  scope_talent_ids: number[]; expires_at: string | null; used_at: string | null;
  created_at: string; notes: string | null;
};

export default function AgencyTokensClient({ players, initialTokens }: { players: Player[]; initialTokens: Token[] }) {
  const [tokens, setTokens] = useState<Token[]>(initialTokens);
  const [agencyName, setAgencyName] = useState('');
  const [agencyEmail, setAgencyEmail] = useState('');
  const [expiresDays, setExpiresDays] = useState(21);
  const [notes, setNotes] = useState('');
  const [scope, setScope] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Group players by their `agency_name` so admin can quickly select by agency
  const grouped = useMemo(() => {
    const map = new Map<string, Player[]>();
    for (const p of players) {
      if (filter && !`${p.nickname} ${p.full_name ?? ''} ${p.game ?? ''} ${p.agency_name ?? ''}`.toLowerCase().includes(filter.toLowerCase())) continue;
      const k = p.agency_name?.trim() || '(no agency)';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(p);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] === '(no agency)' ? 1 : b[0] === '(no agency)' ? -1 : a[0].localeCompare(b[0])));
  }, [players, filter]);

  function toggle(id: number) {
    setScope(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function selectAgencyGroup(group: Player[]) {
    setScope(prev => { const n = new Set(prev); for (const p of group) n.add(p.id); return n; });
  }

  async function mint() {
    setError(null);
    if (!agencyName.trim()) { setError('Agency name required'); return; }
    if (scope.size === 0) { setError('Pick at least one player'); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/admin/agency-tokens', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          agency_name: agencyName.trim(),
          agency_email: agencyEmail.trim() || null,
          scope_talent_ids: Array.from(scope),
          expires_days: expiresDays,
          notes: notes.trim() || null,
        }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || 'Mint failed'); return; }
      // Refresh
      const listRes = await fetch('/api/admin/agency-tokens');
      const listJson = await listRes.json();
      setTokens(listJson.tokens || []);
      setAgencyName(''); setAgencyEmail(''); setScope(new Set()); setNotes(''); setExpiresDays(21);
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setBusy(false);
    }
  }

  async function revoke(token: string) {
    if (!confirm('Revoke this token? Agency will lose access.')) return;
    const r = await fetch(`/api/admin/agency-tokens?token=${encodeURIComponent(token)}`, { method: 'DELETE' });
    if (r.ok) setTokens(prev => prev.filter(t => t.token !== token));
  }

  async function copyUrl(t: Token) {
    const url = `${window.location.origin}/agency/${t.token}`;
    try { await navigator.clipboard.writeText(url); setCopiedToken(t.token); setTimeout(() => setCopiedToken(null), 2000); } catch {}
  }

  return (
    <div className="space-y-6">
      {/* Create card */}
      <section className="rounded-lg border border-line p-4 space-y-3">
        <h2 className="text-sm font-medium">Mint a new agency token</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="label">Agency name</label>
            <input value={agencyName} onChange={e => setAgencyName(e.target.value)} className="input" placeholder="e.g. Hero Agency" />
          </div>
          <div>
            <label className="label">Contact email <span className="text-mute font-normal">(optional)</span></label>
            <input value={agencyEmail} onChange={e => setAgencyEmail(e.target.value)} className="input" placeholder="agent@hero-agency.com" />
          </div>
          <div>
            <label className="label">Expires in (days)</label>
            <input type="number" min={1} max={180} value={expiresDays} onChange={e => setExpiresDays(Number(e.target.value) || 21)} className="input" />
          </div>
        </div>
        <div>
          <label className="label">Notes <span className="text-mute font-normal">(optional, e.g. "scope: SF roster only")</span></label>
          <input value={notes} onChange={e => setNotes(e.target.value)} className="input" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="label">Scope (which players this agency can submit for)</label>
            <input value={filter} onChange={e => setFilter(e.target.value)} className="input max-w-xs" placeholder="filter…" />
          </div>
          <div className="max-h-64 overflow-y-auto border border-line rounded p-2 text-xs space-y-2">
            {grouped.map(([groupKey, ps]) => (
              <div key={groupKey}>
                <div className="flex items-center justify-between sticky top-0 bg-bg py-1">
                  <div className="font-medium">
                    {groupKey} <span className="text-mute font-normal">({ps.length})</span>
                  </div>
                  <button type="button" onClick={() => selectAgencyGroup(ps)} className="text-[10px] underline">select all</button>
                </div>
                <ul className="pl-2">
                  {ps.map(p => (
                    <li key={p.id}>
                      <label className="flex items-center gap-2 cursor-pointer py-0.5">
                        <input type="checkbox" checked={scope.has(p.id)} onChange={() => toggle(p.id)} />
                        <span className="font-medium">{p.nickname}</span>
                        <span className="text-mute">{p.full_name ? `· ${p.full_name}` : ''} · {p.game || '?'} {p.team ? `(${p.team})` : ''}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="text-xs text-mute">{scope.size} player{scope.size === 1 ? '' : 's'} selected</div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={mint} disabled={busy} className="rounded bg-fg text-bg px-3 py-1.5 text-sm disabled:opacity-50">
            {busy ? 'Minting…' : 'Mint token'}
          </button>
          {error && <span className="text-sm text-rose-600">{error}</span>}
        </div>
      </section>

      {/* Existing tokens */}
      <section className="rounded-lg border border-line p-4">
        <h2 className="text-sm font-medium mb-3">Existing tokens ({tokens.length})</h2>
        {tokens.length === 0 ? (
          <p className="text-sm text-mute">No tokens minted yet.</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="text-left text-mute border-b border-line">
              <tr>
                <th className="py-1.5">Agency</th>
                <th className="py-1.5">Scope</th>
                <th className="py-1.5">Expires</th>
                <th className="py-1.5">Status</th>
                <th className="py-1.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map(t => {
                const expired = t.expires_at && new Date(t.expires_at) < new Date();
                const used = !!t.used_at;
                return (
                  <tr key={t.token} className="border-b border-line/50">
                    <td className="py-1.5">
                      <div className="font-medium">{t.agency_name}</div>
                      <div className="text-mute">{t.agency_email || '—'}</div>
                    </td>
                    <td className="py-1.5">{t.scope_talent_ids.length} player{t.scope_talent_ids.length === 1 ? '' : 's'}</td>
                    <td className="py-1.5">{t.expires_at ? new Date(t.expires_at).toISOString().slice(0,10) : '—'}</td>
                    <td className="py-1.5">
                      {used ? <span className="text-emerald-600">Submitted {new Date(t.used_at!).toISOString().slice(0,10)}</span>
                       : expired ? <span className="text-mute">Expired</span>
                       : <span className="text-amber-600">Pending</span>}
                    </td>
                    <td className="py-1.5">
                      <button onClick={() => copyUrl(t)} className="text-[11px] underline mr-3">
                        {copiedToken === t.token ? 'copied!' : 'copy URL'}
                      </button>
                      <button onClick={() => revoke(t.token)} className="text-[11px] underline text-rose-600">revoke</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
