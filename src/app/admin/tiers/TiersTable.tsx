'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Tier } from '@/lib/types';
import { fmtMoney, fmtPct, tierClass } from '@/lib/utils';
import { Save } from 'lucide-react';
import { useToast } from '@/components/Toast';

export function TiersTable({ tiers }: { tiers: Tier[] }) {
  const router = useRouter();
  const toast = useToast();
  const [edits, setEdits] = useState<Record<number, Partial<Tier>>>({});
  const [saving, setSaving] = useState<number | null>(null);

  function patch(id: number, p: Partial<Tier>) {
    setEdits(e => ({ ...e, [id]: { ...e[id], ...p } }));
  }

  async function save(id: number) {
    if (!edits[id]) return;
    setSaving(id);
    try {
      const res = await fetch(`/api/admin/tiers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(edits[id]),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error('Save failed', j.error);
      } else {
        setEdits(e => { const n = { ...e }; delete n[id]; return n; });
        router.refresh();
      }
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-label uppercase tracking-wide bg-bg">
            <th className="px-4 py-3">Tier</th>
            <th className="px-4 py-3">Followers</th>
            <th className="px-4 py-3">Engagement</th>
            <th className="px-4 py-3 text-right">Fee min</th>
            <th className="px-4 py-3 text-right">Fee max</th>
            <th className="px-4 py-3 text-right">Floor share</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {tiers.map(t => {
            const dirty = !!edits[t.id];
            const v = { ...t, ...edits[t.id] };
            return (
              <tr key={t.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <span className={`chip border ${tierClass(t.code)}`}>{t.code}</span>
                  <div className="text-xs text-mute mt-1">{t.label}</div>
                </td>
                <td className="px-4 py-3 text-label">{t.follower_threshold || '—'}</td>
                <td className="px-4 py-3 text-label">{t.engagement_range || '—'}</td>
                <td className="px-4 py-3 text-right">
                  <input type="number" value={v.base_fee_min ?? 0}
                    onChange={e => patch(t.id, { base_fee_min: parseFloat(e.target.value) })}
                    className="input py-1 px-2 text-right w-24" />
                </td>
                <td className="px-4 py-3 text-right">
                  <input type="number" value={v.base_fee_max ?? 0}
                    onChange={e => patch(t.id, { base_fee_max: parseFloat(e.target.value) })}
                    className="input py-1 px-2 text-right w-24" />
                </td>
                <td className="px-4 py-3 text-right">
                  <input type="number" step="0.05" min="0" max="1" value={v.floor_share}
                    onChange={e => patch(t.id, { floor_share: parseFloat(e.target.value) })}
                    className="input py-1 px-2 text-right w-20" />
                </td>
                <td className="px-4 py-3 text-right">
                  {dirty && (
                    <button onClick={() => save(t.id)} disabled={saving === t.id}
                      className="btn btn-primary text-xs">
                      <Save size={12} /> {saving === t.id ? '…' : 'Save'}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
