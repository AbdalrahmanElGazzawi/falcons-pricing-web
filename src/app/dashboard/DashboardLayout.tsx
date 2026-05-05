'use client';
import { useState, useTransition } from 'react';
import { Section } from '@/components/Section';
import { Edit3, Check } from 'lucide-react';

const SECTION_TITLES: Record<string, string> = {
  hero:        'Hero strip',
  readiness:   'Pricing readiness',
  owned_media: 'Owned media',
  a_team:      'A-team',
  brain_trust: 'Brain trust',
  charts:      'Charts',
  inventory:   'Deliverable inventory',
};

export function DashboardLayout({
  initialOrder, sectionNodes, isSuperAdmin,
}: {
  initialOrder: string[];
  sectionNodes: Record<string, React.ReactNode>;
  isSuperAdmin: boolean;
}) {
  const [order, setOrder] = useState(initialOrder);
  const [editing, setEditing] = useState(false);
  const [saving, startSave] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function move(id: string, delta: number) {
    setOrder(prev => {
      const idx = prev.indexOf(id);
      if (idx < 0) return prev;
      const next = [...prev];
      const t = idx + delta;
      if (t < 0 || t >= next.length) return prev;
      [next[idx], next[t]] = [next[t], next[idx]];
      return next;
    });
  }

  function save() {
    setErr(null);
    startSave(async () => {
      try {
        const res = await fetch('/api/admin/layout/dashboard', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section_order: order }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || 'Save failed');
        }
        setEditing(false);
      } catch (e: any) {
        setErr(e.message);
      }
    });
  }

  return (
    <>
      {isSuperAdmin && (
        <div className="flex items-center gap-2 mb-4">
          {editing ? (
            <>
              <button onClick={save} disabled={saving} className="btn btn-primary text-xs !py-1.5">
                <Check size={12} /> {saving ? 'Saving…' : 'Save layout'}
              </button>
              <button onClick={() => { setOrder(initialOrder); setEditing(false); }} className="btn btn-ghost text-xs !py-1.5">
                Cancel
              </button>
              <span className="text-xs text-mute">Use the ▲▼ arrows on each section.</span>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="btn btn-ghost text-xs !py-1.5">
              <Edit3 size={12} /> Edit layout
            </button>
          )}
          {err && <span className="text-xs text-red-600">{err}</span>}
        </div>
      )}

      <div className="space-y-6">
        {order.map((id, idx) => (
          <Section
            key={id}
            id={id}
            title={SECTION_TITLES[id] ?? id}
            editable={editing}
            isFirst={idx === 0}
            isLast={idx === order.length - 1}
            onMoveUp={() => move(id, -1)}
            onMoveDown={() => move(id, 1)}
          >
            {sectionNodes[id]}
          </Section>
        ))}
      </div>
    </>
  );
}
