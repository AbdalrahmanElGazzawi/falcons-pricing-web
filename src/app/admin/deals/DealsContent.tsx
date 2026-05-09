'use client';
import { useState } from 'react';
import { fmtCurrency } from '@/lib/utils';

interface Deal {
  id: number;
  brand_name: string;
  brand_category: string | null;
  player_id: number | null;
  quoted_price_sar: number;
  final_price_sar: number | null;
  status: string;
  reason_lost: string | null;
  discount_percent: number | null;
  sales_owner_email: string | null;
  created_at: string;
  closed_at: string | null;
  notes: string | null;
}

const STATUS_COLOR: Record<string, string> = {
  pending:       'bg-zinc-100 text-zinc-700',
  accepted:      'bg-greenSoft text-greenDark',
  rejected:      'bg-rose-100 text-rose-900',
  expired:       'bg-amber-100 text-amber-900',
  renegotiated:  'bg-blue-100 text-blue-900',
};

export function DealsContent({ deals, metrics }: { deals: Deal[]; metrics: any[] }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-3 gap-3 flex-1 mr-4">
          {metrics.slice(0, 3).map((m: any, i: number) => (
            <div key={i} className="rounded-lg border border-line bg-bg p-3">
              <div className="text-[10px] uppercase tracking-wider text-mute font-semibold">{m.brand_category ?? 'all'}</div>
              <div className="text-2xl font-bold tabular-nums mt-1">{m.deal_count}</div>
              <div className="text-[10px] text-mute">{m.accepted}/{m.deal_count} accepted · avg discount {m.avg_discount_pct ?? 0}%</div>
            </div>
          ))}
          {metrics.length === 0 && (
            <div className="col-span-3 text-sm text-mute italic py-3">No closed deals logged yet — first 30 deals build the elasticity baseline.</div>
          )}
        </div>
        <button onClick={() => setShowForm(s => !s)} className="btn btn-primary text-sm">
          {showForm ? 'Cancel' : '+ Log a deal'}
        </button>
      </div>

      {showForm && <DealForm onClose={() => setShowForm(false)} />}

      <div className="rounded-lg border border-line overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg">
            <tr>
              <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-mute">Brand</th>
              <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-mute">Category</th>
              <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider text-mute">Quoted</th>
              <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider text-mute">Closed</th>
              <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider text-mute">Disc.</th>
              <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-mute">Status</th>
              <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-mute">Owner</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {deals.map(d => (
              <tr key={d.id} className="hover:bg-bg/50">
                <td className="px-3 py-2 font-medium">{d.brand_name}</td>
                <td className="px-3 py-2 text-mute">{d.brand_category ?? '—'}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtCurrency(Number(d.quoted_price_sar), 'SAR', 3.75)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{d.final_price_sar ? fmtCurrency(Number(d.final_price_sar), 'SAR', 3.75) : '—'}</td>
                <td className="px-3 py-2 text-right tabular-nums">{d.discount_percent ?? '—'}%</td>
                <td className="px-3 py-2"><span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[d.status]}`}>{d.status}</span></td>
                <td className="px-3 py-2 text-mute text-[11px]">{d.sales_owner_email ?? '—'}</td>
              </tr>
            ))}
            {deals.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-mute italic">No deals yet — log the first one with the button above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DealForm({ onClose }: { onClose: () => void }) {
  const [v, setV] = useState({
    brand_name: '', brand_category: 'gaming', quoted_price_sar: 0, final_price_sar: 0,
    status: 'pending', sales_owner_email: '', notes: '', reason_lost: '',
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch('/api/admin/deals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) });
    setSaving(false);
    if (res.ok) { onClose(); window.location.reload(); }
    else alert('Save failed');
  }

  return (
    <div className="rounded-lg border border-green/40 bg-greenSoft/40 p-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><label className="label">Brand name</label><input className="input" value={v.brand_name} onChange={e => setV(s => ({...s, brand_name: e.target.value}))} /></div>
        <div><label className="label">Category</label>
          <select className="input" value={v.brand_category} onChange={e => setV(s => ({...s, brand_category: e.target.value}))}>
            <option value="gaming">Gaming</option><option value="tech">Tech</option><option value="telco">Telco</option>
            <option value="fmcg">FMCG</option><option value="luxury">Luxury</option><option value="sovereign">Sovereign / Vision 2030</option>
            <option value="finance">Finance</option><option value="other">Other</option>
          </select>
        </div>
        <div><label className="label">Quoted SAR</label><input type="number" className="input" value={v.quoted_price_sar} onChange={e => setV(s => ({...s, quoted_price_sar: Number(e.target.value)}))} /></div>
        <div><label className="label">Closed SAR (if applicable)</label><input type="number" className="input" value={v.final_price_sar} onChange={e => setV(s => ({...s, final_price_sar: Number(e.target.value)}))} /></div>
        <div><label className="label">Status</label>
          <select className="input" value={v.status} onChange={e => setV(s => ({...s, status: e.target.value}))}>
            <option value="pending">Pending</option><option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option><option value="expired">Expired</option><option value="renegotiated">Renegotiated</option>
          </select>
        </div>
        <div><label className="label">Sales owner email</label><input className="input" value={v.sales_owner_email} onChange={e => setV(s => ({...s, sales_owner_email: e.target.value}))} placeholder="koge@falcons.sa" /></div>
        {v.status === 'rejected' && (
          <div className="col-span-2"><label className="label">Reason lost</label><input className="input" value={v.reason_lost} onChange={e => setV(s => ({...s, reason_lost: e.target.value}))} placeholder="Brand chose competitor / budget / timing / ..." /></div>
        )}
        <div className="col-span-2"><label className="label">Notes</label><textarea className="input" rows={2} value={v.notes} onChange={e => setV(s => ({...s, notes: e.target.value}))} /></div>
      </div>
      <div className="flex justify-end gap-2 mt-3">
        <button onClick={onClose} className="btn btn-ghost text-sm">Cancel</button>
        <button onClick={save} disabled={saving || !v.brand_name || !v.quoted_price_sar} className="btn btn-primary text-sm">{saving ? 'Saving…' : 'Save deal'}</button>
      </div>
    </div>
  );
}
