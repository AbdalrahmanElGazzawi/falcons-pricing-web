'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { fmtMoney, statusColor, statusLabel } from '@/lib/utils';
import { Search } from 'lucide-react';

type Row = {
  id: string;
  quote_number: string;
  client_name: string;
  campaign?: string | null;
  status: string;
  total: number;
  currency: string;
  owner_email?: string | null;
  created_at: string;
};

export function QuotesTable({ quotes }: { quotes: Row[] }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return quotes.filter(r =>
      (!status || r.status === status) &&
      (!s || [r.quote_number, r.client_name, r.campaign, r.owner_email].filter(Boolean)
        .some(v => v!.toLowerCase().includes(s)))
    );
  }, [quotes, q, status]);

  const statuses = Array.from(new Set(quotes.map(r => r.status)));

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search quote #, client, campaign…"
            className="input pl-9"
          />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)} className="input max-w-[200px]">
          <option value="">All statuses</option>
          {statuses.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
        <div className="text-sm text-label ml-auto">{filtered.length} of {quotes.length}</div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-label uppercase tracking-wide bg-bg">
              <th className="px-4 py-3">Quote #</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Campaign</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-t border-line hover:bg-bg">
                <td className="px-4 py-3">
                  <Link href={`/quote/${r.id}`} className="text-ink hover:text-green font-medium">
                    {r.quote_number}
                  </Link>
                </td>
                <td className="px-4 py-3">{r.client_name}</td>
                <td className="px-4 py-3 text-label">{r.campaign || '—'}</td>
                <td className="px-4 py-3 text-label text-xs">{r.owner_email || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`chip ${statusColor(r.status)}`}>{statusLabel(r.status)}</span>
                </td>
                <td className="px-4 py-3 text-label text-xs">
                  {new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3 text-right font-medium">{fmtMoney(r.total, r.currency)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-label">No quotes match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
