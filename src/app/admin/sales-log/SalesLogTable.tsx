'use client';
import { useLocale } from '@/lib/i18n/Locale';
import { useMemo, useState } from 'react';
import { useDisplayCurrency } from '@/lib/use-display-currency';
import { CurrencyPill } from '@/components/CurrencyPill';
import { fmtCurrency } from '@/lib/utils';
import { Plus, Pencil, Trash2, X, Check, Search } from 'lucide-react';
import type { SalesEntry, SalesStatus } from '@/lib/types';

const STATUS_LABEL: Record<SalesStatus, string> = {
  in_progress: 'In progress',
  waiting_for_payment: 'Awaiting payment',
  payment_collected: 'Collected',
  cancelled: 'Cancelled',
};

const STATUS_CHIP: Record<SalesStatus, string> = {
  in_progress: 'bg-amber-100 text-amber-700',
  waiting_for_payment: 'bg-blue-100 text-blue-700',
  payment_collected: 'bg-green/15 text-greenDark',
  cancelled: 'bg-gray-100 text-gray-600',
};

function fmtSAR(n: number) { return Math.round(n).toLocaleString('en-US') + ' SAR'; }
function fmtUSD(n: number) { return '$' + Math.round(n).toLocaleString('en-US'); }

export function SalesLogTable({ initial }: { initial: SalesEntry[] }) {
  const { t } = useLocale();
  const [ccy] = useDisplayCurrency();
  // Helper: convert canonical SAR amount through the shared currency pill.
  // Sales log totals are stored as SAR (with VAT baked in) — fmtCurrency
  // handles the SAR→USD division at the Saudi peg.
  const fmtMoney = (sarAmount: number) => fmtCurrency(Number(sarAmount) || 0, ccy, 3.75);
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<SalesEntry | null>(null);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<'all' | SalesStatus>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (filter !== 'all' && r.status !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = [r.talent_name, r.brand_name, r.description, r.platform].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, filter, search]);

  const totals = useMemo(() => {
    const collected = filtered.filter(r => r.status === 'payment_collected');
    const pipeline = filtered.filter(r => r.status === 'in_progress' || r.status === 'waiting_for_payment');
    return {
      count: filtered.length,
      collectedSar: collected.reduce((s, r) => s + Number(r.total_with_vat_sar), 0),
      pipelineSar: pipeline.reduce((s, r) => s + Number(r.total_with_vat_sar), 0),
    };
  }, [filtered]);

  async function save(entry: Partial<SalesEntry>, isNew: boolean) {
    const url = isNew ? '/api/admin/sales-log' : `/api/admin/sales-log/${entry.id}`;
    const res = await fetch(url, {
      method: isNew ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    if (!res.ok) { alert('Save failed'); return; }
    const data = await res.json();
    if (isNew) setRows(prev => [data, ...prev]);
    else setRows(prev => prev.map(r => r.id === data.id ? data : r));
    setEditing(null); setCreating(false);
  }

  async function remove(id: string) {
    if (!confirm('Delete this sales entry?')) return;
    const res = await fetch(`/api/admin/sales-log/${id}`, { method: 'DELETE' });
    if (!res.ok) { alert('Delete failed'); return; }
    setRows(prev => prev.filter(r => r.id !== id));
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('sales.search')}
            className="input pl-9" />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value as any)} className="input sm:w-48">
          <option value="all">{t('sales.filter.all')}</option>
          <option value="payment_collected">Collected</option>
          <option value="waiting_for_payment">Awaiting payment</option>
          <option value="in_progress">In progress</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <CurrencyPill />
        <button onClick={() => setCreating(true)} className="btn btn-primary">
          <Plus size={14} /> {t('sales.new')}
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        <Kpi label="Entries" value={totals.count.toString()} />
        <Kpi label="Collected" value={fmtMoney(totals.collectedSar)} accent="green" />
        <Kpi label="Open pipeline" value={fmtMoney(totals.pipelineSar)} accent="blue" />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table w-full text-sm">
            <thead>
              <tr>
                <th>Date</th>
                <th>Talent</th>
                <th>Brand</th>
                <th>Description</th>
                <th>Platform</th>
                <th className="text-right">USD</th>
                <th className="text-right">{ccy === 'USD' ? 'USD + VAT' : 'SAR + VAT'}</th>
                <th>Status</th>
                <th>Inv</th>
                <th>Paid</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap text-label">{r.deal_date.slice(0, 7)}</td>
                  <td className="font-medium text-ink" dir="auto">{r.talent_name}</td>
                  <td dir="auto">{r.brand_name || '—'}</td>
                  <td className="text-mute text-xs" dir="auto">{r.description || '—'}</td>
                  <td className="text-xs">{r.platform || '—'}</td>
                  <td className="text-right text-label tabular-nums">{fmtUSD(Number(r.amount_usd))}</td>
                  <td className="text-right font-medium text-ink tabular-nums">{fmtMoney(Number(r.total_with_vat_sar))}</td>
                  <td>
                    <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded ${STATUS_CHIP[r.status]}`}>
                      {STATUS_LABEL[r.status]}
                    </span>
                  </td>
                  <td>{r.invoice_issued ? <Check size={12} className="text-greenDark" /> : <X size={12} className="text-mute" />}</td>
                  <td>{r.payment_collected ? <Check size={12} className="text-greenDark" /> : <X size={12} className="text-mute" />}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditing(r)} className="p-1 text-label hover:text-ink"><Pencil size={12} /></button>
                      <button onClick={() => remove(r.id)} className="p-1 text-mute hover:text-red-600"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={11} className="text-center py-10 text-mute">No entries match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(editing || creating) && (
        <SalesLogModal
          entry={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={(e, isNew) => save(e, isNew)}
        />
      )}
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: 'green' | 'blue' }) {
  const tint = accent === 'green' ? 'text-greenDark' : accent === 'blue' ? 'text-blue-700' : 'text-ink';
  return (
    <div className="card card-p">
      <div className="text-[10px] uppercase tracking-wider text-label font-semibold mb-1">{label}</div>
      <div className={`text-xl font-bold ${tint} tabular-nums`}>{value}</div>
    </div>
  );
}

function SalesLogModal({
  entry, onClose, onSave,
}: {
  entry: SalesEntry | null;
  onClose: () => void;
  onSave: (e: Partial<SalesEntry>, isNew: boolean) => void;
}) {
  const isNew = !entry;
  const [form, setForm] = useState<Partial<SalesEntry>>(entry ?? {
    deal_date: new Date().toISOString().slice(0, 10),
    status: 'in_progress',
    vat_rate: 0.15,
    amount_usd: 0,
    amount_sar: 0,
    total_with_vat_sar: 0,
    invoice_issued: false,
    payment_collected: false,
    claim_filed: false,
    cc_pay: false,
  });

  function update<K extends keyof SalesEntry>(k: K, v: any) {
    setForm(s => {
      const next: any = { ...s, [k]: v };
      // Auto-compute total_with_vat from SAR
      if (k === 'amount_sar') {
        next.total_with_vat_sar = +(Number(v) * (1 + (next.vat_rate ?? 0.15))).toFixed(2);
      }
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm">
      <div className="card overflow-hidden w-full max-w-2xl">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <h3 className="font-semibold">{isNew ? 'New sales entry' : 'Edit sales entry'}</h3>
          <button onClick={onClose} className="p-1 text-mute hover:text-ink"><X size={16} /></button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto">
          <Field label="Date">
            <input type="date" value={form.deal_date ?? ''} onChange={e => update('deal_date', e.target.value)} className="input" />
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={e => update('status', e.target.value as SalesStatus)} className="input">
              <option value="in_progress">In progress</option>
              <option value="waiting_for_payment">Awaiting payment</option>
              <option value="payment_collected">Collected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </Field>
          <Field label="Talent" wide>
            <input dir="auto" value={form.talent_name ?? ''} onChange={e => update('talent_name', e.target.value)} className="input" placeholder="e.g. Spyerfrog (Arabic name supported)" />
          </Field>
          <Field label="Brand">
            <input dir="auto" value={form.brand_name ?? ''} onChange={e => update('brand_name', e.target.value)} className="input" placeholder="Logitech, Samsung…" />
          </Field>
          <Field label="Platform">
            <input value={form.platform ?? ''} onChange={e => update('platform', e.target.value)} className="input" placeholder="TikTok / IG Reels / Multi-plats" />
          </Field>
          <Field label="Description" wide>
            <input dir="auto" value={form.description ?? ''} onChange={e => update('description', e.target.value)} className="input" />
          </Field>
          <Field label="USD">
            <input type="number" step="0.01" value={form.amount_usd ?? 0} onChange={e => update('amount_usd', Number(e.target.value))} className="input" />
          </Field>
          <Field label="SAR (pre-VAT)">
            <input type="number" step="0.01" value={form.amount_sar ?? 0} onChange={e => update('amount_sar', Number(e.target.value))} className="input" />
          </Field>
          <Field label="Total + VAT (SAR)">
            <input type="number" step="0.01" value={form.total_with_vat_sar ?? 0} onChange={e => update('total_with_vat_sar', Number(e.target.value))} className="input" />
          </Field>
          <Field label="VAT rate">
            <input type="number" step="0.01" value={form.vat_rate ?? 0.15} onChange={e => update('vat_rate', Number(e.target.value))} className="input" />
          </Field>
          <Field label="Flags" wide>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              <Toggle label="Invoice issued" v={!!form.invoice_issued} on={v => update('invoice_issued', v)} />
              <Toggle label="Paid" v={!!form.payment_collected} on={v => update('payment_collected', v)} />
              <Toggle label="Claimed" v={!!form.claim_filed} on={v => update('claim_filed', v)} />
              <Toggle label="CC pay" v={!!form.cc_pay} on={v => update('cc_pay', v)} />
            </div>
          </Field>
          <Field label="Notes" wide>
            <textarea value={form.notes ?? ''} onChange={e => update('notes', e.target.value)} className="input min-h-[60px]" />
          </Field>
        </div>
        <div className="px-5 py-3 border-t border-line flex items-center justify-end gap-2 bg-bg">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={() => onSave(form, isNew)} className="btn btn-primary">
            {isNew ? 'Create entry' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <div className="label">{label}</div>
      {children}
    </div>
  );
}

function Toggle({ label, v, on }: { label: string; v: boolean; on: (v: boolean) => void }) {
  return (
    <label className={['flex items-center gap-2 px-2 py-1.5 rounded border cursor-pointer', v ? 'border-green bg-green/5' : 'border-line'].join(' ')}>
      <input type="checkbox" checked={v} onChange={e => on(e.target.checked)} />
      <span className="text-xs">{label}</span>
    </label>
  );
}
