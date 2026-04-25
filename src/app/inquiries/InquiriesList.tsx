'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Mail, Instagram, Twitter, Phone, Globe } from 'lucide-react';
import { SearchInput } from '@/components/SearchInput';
import { EmptyState } from '@/components/EmptyState';

type Row = {
  id: string;
  inquiry_number: string;
  brand: string;
  agency: string | null;
  campaign: string | null;
  source: string;
  type: 'brand' | 'press' | 'partnership' | 'other';
  status: 'open' | 'replied' | 'quoted' | 'won' | 'lost' | 'declined';
  deliverables: string | null;
  created_at: string;
  quote_id: string | null;
};

const SOURCE_ICON: Record<string, any> = {
  email: Mail, instagram: Instagram, twitter: Twitter, whatsapp: Phone,
  tiktok: MessageSquare, discord: MessageSquare, other: Globe,
};

const STATUS_TONE: Record<string, string> = {
  open: 'chip-peach', replied: 'chip-sky', quoted: 'chip-mint',
  won: 'chip-mint', lost: 'chip-grey', declined: 'chip-grey',
};

const TYPE_TONE: Record<string, string> = {
  brand: 'chip-mint', press: 'chip-sky', partnership: 'chip-gold', other: 'chip-grey',
};

export function InquiriesList({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter(r =>
      (!statusFilter || r.status === statusFilter) &&
      (!typeFilter || r.type === typeFilter) &&
      (!s || [r.brand, r.agency, r.campaign, r.deliverables, r.inquiry_number]
        .filter(Boolean).some(v => v!.toLowerCase().includes(s)))
    );
  }, [rows, q, statusFilter, typeFilter]);

  return (
    <>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Search brand, agency, campaign, deliverable…"
          className="flex-1 min-w-[220px] max-w-md"
        />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input max-w-[140px]">
          <option value="">All types</option>
          <option value="brand">Brand campaign</option>
          <option value="press">Press / media</option>
          <option value="partnership">Partnership</option>
          <option value="other">Other</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input max-w-[140px]">
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="replied">Replied</option>
          <option value="quoted">Quoted</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
          <option value="declined">Declined</option>
        </select>
        <div className="text-sm text-label ml-auto whitespace-nowrap">
          {filtered.length} of {rows.length}
        </div>
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No inquiries match"
            body={q || statusFilter || typeFilter
              ? 'Try clearing your filters.'
              : 'No inbound inquiries logged yet — paste an email or DM into the form to start.'}
            action={!q && !statusFilter && !typeFilter
              ? { label: 'Log inbound', href: '/inquiries/new' }
              : undefined}
          />
        ) : (
          <div className="overflow-x-auto max-h-[75vh]">
            <table className="data-table density-comfortable">
              <thead>
                <tr>
                  <th>Inquiry #</th>
                  <th>Brand</th>
                  <th>Campaign</th>
                  <th>Source</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Asks</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const SrcIcon = SOURCE_ICON[r.source] || Globe;
                  return (
                    <tr key={r.id}>
                      <td>
                        <Link href={`/inquiries/${r.id}`} className="text-ink hover:text-greenDark font-medium font-mono text-xs">
                          {r.inquiry_number}
                        </Link>
                      </td>
                      <td>
                        <div className="font-medium text-ink">{r.brand}</div>
                        {r.agency && <div className="text-xs text-mute">via {r.agency}</div>}
                      </td>
                      <td className="text-label">{r.campaign || '—'}</td>
                      <td>
                        <span className="inline-flex items-center gap-1.5 text-xs text-label">
                          <SrcIcon size={12} /> {r.source}
                        </span>
                      </td>
                      <td>
                        <span className={`chip ${TYPE_TONE[r.type]} text-[10px]`}>
                          {r.type}
                        </span>
                      </td>
                      <td>
                        <span className={`chip ${STATUS_TONE[r.status]} text-[10px] uppercase`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="text-xs text-label max-w-[280px] truncate">
                        {r.deliverables || '—'}
                      </td>
                      <td className="text-xs text-label whitespace-nowrap">
                        {new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
