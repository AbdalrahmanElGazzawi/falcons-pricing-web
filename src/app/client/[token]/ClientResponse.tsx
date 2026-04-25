'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';

export function ClientResponse({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [agree, setAgree] = useState(false);
  const [decision, setDecision] = useState<'approved' | 'rejected' | null>(null);

  async function submit(d: 'approved' | 'rejected') {
    setErr(null);
    if (!name.trim()) {
      setErr('Please enter your full name to record your decision.');
      return;
    }
    if (d === 'approved' && !agree) {
      setErr('Please confirm that you agree to the quotation terms.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/client/${token}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: d,
          name: name.trim(),
          email: email.trim() || null,
          comment: comment.trim() || null,
        }),
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
      <h3 className="font-semibold text-ink mb-1">Your response</h3>
      <p className="text-sm text-label mb-4">
        Please confirm whether you&apos;d like to proceed with this quotation. Your account
        manager will be notified the moment you submit.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="label">Your full name <span className="text-red-500">*</span></label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="input"
            placeholder="e.g. Sarah Johnson"
            required
          />
        </div>
        <div>
          <label className="label">Email (optional)</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="input"
            placeholder="sarah@brand.com"
          />
        </div>
      </div>

      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        rows={3}
        className="input resize-none mb-3"
        placeholder="Optional comment (preferred go-live date, edits required, etc.)…"
      />

      <label className="flex items-start gap-2 text-sm text-label mb-4 cursor-pointer">
        <input
          type="checkbox"
          checked={agree}
          onChange={e => setAgree(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          I confirm that I have authority to accept this quotation on behalf of the named client
          and agree to the terms presented.
        </span>
      </label>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => { setDecision('approved'); submit('approved'); }}
          disabled={busy}
          className="btn btn-primary flex-1 justify-center"
        >
          <Check size={16} /> {busy && decision === 'approved' ? 'Recording…' : 'Accept quotation'}
        </button>
        <button
          onClick={() => { setDecision('rejected'); submit('rejected'); }}
          disabled={busy}
          className="btn btn-ghost flex-1 justify-center"
        >
          <X size={16} /> {busy && decision === 'rejected' ? 'Recording…' : 'Decline'}
        </button>
      </div>

      {err && <div className="text-xs text-red-600 mt-3">{err}</div>}

      <p className="text-[10px] text-mute mt-4">
        By accepting, you create a digital record with your name, timestamp, and IP. This serves
        as written confirmation and is retained alongside the signed agreement.
      </p>
    </div>
  );
}
