'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';

export function ClientResponse({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [comment, setComment] = useState('');

  async function respond(decision: 'approved' | 'rejected') {
    setErr(null); setBusy(true);
    try {
      const res = await fetch(`/api/client/${token}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, comment: comment.trim() || null }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Submission failed');
      }
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="card card-p">
      <h3 className="font-semibold mb-2">Your response</h3>
      <p className="text-sm text-label mb-4">
        Please confirm whether you'd like to proceed with this quotation.
        Your account manager will be notified immediately.
      </p>
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        rows={3}
        className="input resize-none mb-3"
        placeholder="Optional comment (e.g. preferred go-live date, edits required)…"
      />
      <div className="flex gap-3">
        <button onClick={() => respond('approved')} disabled={busy}
          className="btn btn-primary flex-1 justify-center">
          <Check size={16} /> Approve quote
        </button>
        <button onClick={() => respond('rejected')} disabled={busy}
          className="btn btn-ghost flex-1 justify-center">
          <X size={16} /> Decline
        </button>
      </div>
      {err && <div className="text-xs text-red-600 mt-3">{err}</div>}
    </div>
  );
}
