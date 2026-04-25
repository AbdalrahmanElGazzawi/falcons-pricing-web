'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Addon } from '@/lib/types';
import { fmtPct } from '@/lib/utils';
import { Save, Plus } from 'lucide-react';
import { useToast } from '@/components/Toast';

export function AddonsTable({ addons }: { addons: Addon[] }) {
  const router = useRouter();
  const toast = useToast();
  const [edits, setEdits] = useState<Record<number, Partial<Addon>>>({});
  const [saving, setSaving] = useState<number | string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newRow, setNewRow] = useState<Partial<Addon>>({ label: '', uplift_pct: 0.05, description: '', is_active: true });

  function patch(id: number, p: Partial<Addon>) {
    setEdits(e => ({ ...e, [id]: { ...e[id], ...p } }));
  }

  async function save(id: number) {
    if (!edits[id]) return;
    setSaving(id);
    try {
      const res = await fetch(`/api/admin/addons/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(edits[id]),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({})); toast.error('Save failed', j.error);
      } else {
        setEdits(e => { const n = { ...e }; delete n[id]; return n; });
        router.refresh();
      }
    } finally { setSaving(null); }
  }

  async function create() {
    if (!newRow.label) { toast.error('Label required'); return; }
    setSaving('new');
    try {
      const res = await fetch(`/api/admin/addons`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRow),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({})); toast.error('Create failed', j.error);
      } else {
        setNewRow({ label: '', uplift_pct: 0.05, description: '', is_active: true });
        setNewOpen(false);
        router.refresh();
      }
    } finally { setSaving(null); }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-label">{addons.length} packages</div>
        <button onClick={() => setNewOpen(o => !o)} className="btn btn-primary"><Plus size={16} /> New add-on</button>
      </div>

      {newOpen && (
        <div className="card card-p mb-4">
          <h3 className="font-semibold mb-3">New add-on package</h3>
          <div className="grid grid-cols-4 gap-3 items-end">
            <div className="col-span-2">
              <label className="label">Label *</label>
              <input value={newRow.label} onChange={e => setNewRow({ ...newRow, label: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Uplift %</label>
              <input type="number" step="0.01" value={newRow.uplift_pct}
                onChange={e => setNewRow({ ...newRow, uplift_pct: parseFloat(e.target.value) })} className="input" />
            </div>
            <button onClick={create} disabled={saving === 'new'} className="btn btn-primary">
              {saving === 'new' ? 'Saving…' : 'Add'}
            </button>
            <div className="col-span-4">
              <label className="label">Description</label>
              <input value={newRow.description ?? ''} onChange={e => setNewRow({ ...newRow, description: e.target.value })} className="input" />
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-label uppercase tracking-wide bg-bg">
              <th className="px-4 py-3">Label</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-right">Uplift %</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {addons.map(a => {
              const dirty = !!edits[a.id];
              const v = { ...a, ...edits[a.id] };
              return (
                <tr key={a.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <input value={v.label} onChange={e => patch(a.id, { label: e.target.value })}
                      className="input py-1 px-2 text-sm w-56" />
                  </td>
                  <td className="px-4 py-3">
                    <input value={v.description ?? ''} onChange={e => patch(a.id, { description: e.target.value })}
                      className="input py-1 px-2 text-sm w-full" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input type="number" step="0.01" value={v.uplift_pct}
                      onChange={e => patch(a.id, { uplift_pct: parseFloat(e.target.value) })}
                      className="input py-1 px-2 text-right w-20" />
                    <span className="text-xs text-mute ml-1">{fmtPct(v.uplift_pct, 0)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => patch(a.id, { is_active: !v.is_active })}
                      className={`chip ${v.is_active ? 'chip-mint' : 'chip-grey'} text-xs`}>
                      {v.is_active ? 'Active' : 'Hidden'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {dirty && (
                      <button onClick={() => save(a.id)} disabled={saving === a.id}
                        className="btn btn-primary text-xs">
                        <Save size={12} /> {saving === a.id ? '…' : 'Save'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {addons.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-label">No add-ons yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
