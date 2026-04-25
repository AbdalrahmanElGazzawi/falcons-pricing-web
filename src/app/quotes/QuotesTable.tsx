'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { fmtMoney, statusLabel } from '@/lib/utils';
import { StatusPill } from '@/components/Status';
import { EmptyState } from '@/components/EmptyState';
import { Search, FileX, Rows3, Rows2, Rows4 } from 'lucide-react';
import type { QuoteStatus } from '@/lib/types';

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

type Density = 'compact' | 'comfortable' | 'spacious';

export function QuotesTable({ quotes }: { quotes: Row[] }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [density, setDensity] = useState<Density>('comfortable');

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
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-md">
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
        <DensityToggle value={density} onChange={setDensity} />
        <div className="text-sm text-label ml-auto whitespace-nowrap">{filtered.length} of {quotes.length}</div>
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={FileX}
            title="No quotes match"
            body={q || status ? 'Try clearing your filters.' : 'No quotes yet — create your first.'}
            action={!q && !status ? { label: 'New quote', href: '/quote/new' } : undefined}
          />
        ) : (
          <div className="overflow-x-auto max-h-[70vh]">
            <table className={`data-table density-${density}`}>
              <thead>
                <tr>
                  <th>Quote #</th>
                  <th>Client</th>
                  <th>Campaign</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/quote/${r.id}`} className="text-ink hover:text-greenDark font-medium">
                        {r.quote_number}
                      </Link>
                    </td>
                    <td>{r.client_name}</td>
                    <td className="text-label">{r.campaign || '—'}</td>
                    <td className="text-label text-xs">{r.owner_email || '—'}</td>
                    <td><StatusPill status={r.status as QuoteStatus} /></td>
                    <td className="text-label text-xs whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="text-right font-medium">{fmtMoney(r.total, r.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function DensityToggle({ value, onChange }: { value: Density; onChange: (d: Density) => void }) {
  const opts: Array<{ k: Density; icon: any; title: string }> = [
    { k: 'compact', icon: Rows4, title: 'Compact' },
    { k: 'comfortable', icon: Rows3, title: 'Comfortable' },
    { k: 'spacious', icon: Rows2, title: 'Spacious' },
  ];
  return (
    <div className="inline-flex rounded-lg border border-line bg-white overflow-hidden">
      {opts.map(o => {
        const Icon = o.icon;
        const active = o.k === value;
        return (
          <button
            key={o.k}
            type="button"
            onClick={() => onChange(o.k)}
            title={o.title}
            className={[
              'px-2.5 py-2 transition',
              active ? 'bg-greenSoft text-greenDark' : 'text-mute hover:text-ink hover:bg-bg',
            ].join(' ')}
          >
            <Icon size={14} />
          </button>
        );
      })}
    </div>
  );
}
