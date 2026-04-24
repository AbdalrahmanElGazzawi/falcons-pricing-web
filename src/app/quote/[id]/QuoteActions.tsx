'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { UserRole, QuoteStatus } from '@/lib/types';
import { Send, Check, X, Lock, Trophy, Frown } from 'lucide-react';

const NEXT_STATUSES: Record<QuoteStatus, { status: QuoteStatus; label: string; icon: any; cls: string; staffOnly?: boolean; adminOnly?: boolean }[]> = {
  draft: [
    { status: 'pending_approval', label: 'Submit for approval', icon: Send, cls: 'btn-primary' },
  ],
  pending_approval: [
    { status: 'approved', label: 'Approve', icon: Check, cls: 'btn-primary', adminOnly: true },
    { status: 'draft', label: 'Send back to draft', icon: X, cls: 'btn-ghost', adminOnly: true },
  ],
  approved: [
    { status: 'sent_to_client', label: 'Mark as sent to client', icon: Send, cls: 'btn-primary' },
  ],
  sent_to_client: [
    { status: 'closed_won', label: 'Closed-Won', icon: Trophy, cls: 'btn-primary' },
    { status: 'closed_lost', label: 'Closed-Lost', icon: Frown, cls: 'btn-ghost' },
  ],
  client_approved: [
    { status: 'closed_won', label: 'Closed-Won', icon: Trophy, cls: 'btn-primary' },
  ],
  client_rejected: [
    { status: 'draft', label: 'Re-open as draft', icon: X, cls: 'btn-ghost' },
  ],
  closed_won: [],
  closed_lost: [
    { status: 'draft', label: 'Re-open as draft', icon: X, cls: 'btn-ghost', adminOnly: true },
  ],
};

export function QuoteActions({ quoteId, status, role }: { quoteId: string; status: QuoteStatus; role: UserRole }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const transitions = (NEXT_STATUSES[status] || []).filter(t => {
    if (t.adminOnly && role !== 'admin') return false;
    return true;
  });

  async function go(next: QuoteStatus) {
    setErr(null); setBusy(true);
    try {
      const res = await fetch(`/api/quote/${quoteId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Update failed');
      }
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card card-p">
      <div className="text-xs text-label uppercase tracking-wide mb-3">Workflow</div>
      {transitions.length === 0 ? (
        <div className="text-sm text-mute flex items-center gap-2">
          <Lock size={14} /> No further actions available.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {transitions.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.status}
                disabled={busy}
                onClick={() => go(t.status)}
                className={`btn ${t.cls} w-full justify-center`}>
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>
      )}
      {err && <div className="text-xs text-red-600 mt-2">{err}</div>}
    </div>
  );
}
