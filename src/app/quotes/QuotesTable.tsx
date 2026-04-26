'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { fmtCurrency, statusLabel } from '@/lib/utils';
import { useDisplayCurrency } from '@/lib/use-display-currency';
import { StatusPill } from '@/components/Status';
import { EmptyState } from '@/components/EmptyState';
import { FileX, Rows3, Rows2, Rows4, Trash2 } from 'lucide-react';
import { SearchInput } from '@/components/SearchInput';
import type { QuoteStatus } from '@/lib/types';

type Row = {
  id: string;
  quote_number: string;
  client_name: string;
  campaign?: string | null;
  status: string;
  total: number;
  currency: string;
  usd_rate?: number | null;
  owner_email?: string | null;
  created_at: string;
};

type Density = 'compact' | 'comfortable' | 'spacious';

export function QuotesTable({ quotes, canDelete }: { quotes: Row[]; canDelete?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [deleting, setDeleting] = useState<string | null>(null);
  // Cross-page persistent display currency (toggle anywhere → sticks everywhere).
  const [ccy, setCcy] = useDisplayCurrency();

  async function deleteQuote(id: string, qNumber: string) {
    if (!confirm(`Delete ${qNumber}? This cannot be undone (audit log keeps a record).`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/quote/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Delete failed');
      }
      toast.success('Deleted', qNumber);
      router.refresh();
    } catch (e: any) {
      toast.error('Delete failed', e.message);
    } finally {
      setDeleting(null);
    }
  }

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
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Search quote #, client, campaign…"
          className="flex-1 min-w-[220px] max-w-md"
        />
        <select value={status} onChange={e => setStatus(e.target.value)} className="input max-w-[200px]">
          <option value="">All statuses</option>
          {statuses.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
        <DensityToggle value={density} onChange={setDensity} />
        <div className="inline-flex items-center rounded-lg border border-line overflow-hidden bg-white" title="Display currency. Persists across pages.">
          {(['SAR', 'USD'] as const).map((c, i) => (
            <button
              key={c}
              type="button"
              onClick={() => setCcy(c)}
              className={[
                'px-2.5 py-2 text-xs font-medium transition',
                i > 0 ? 'border-l border-line' : '',
                ccy === c ? 'bg-green text-white' : 'text-label hover:text-ink',
              ].join(' ')}
            >
              {c}
            </button>
          ))}
        </div>
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
                  {canDelete && <th></th>}
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
                    <td className="text-right font-medium">{fmtCurrency(Number(r.total) || 0, ccy, Number(r.usd_rate) > 0 ? Number(r.usd_rate) : 3.75)}</td>
                    {canDelete && (
                      <td className="text-right">
                        <button
                          disabled={deleting === r.id}
                          onClick={() => deleteQuote(r.id, r.quote_number)}
                          className="row-actions p-1.5 text-mute hover:text-red-600 disabled:opacity-50"
                          title="Delete (super admin only)"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
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
