'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { KeyRound, CheckCircle2, Eye, EyeOff } from 'lucide-react';

const MIN_LEN = 8;

export function ChangePasswordForm({ email }: { email: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function validate(): string | null {
    if (!currentPw) return 'Current password is required.';
    if (newPw.length < MIN_LEN) return `New password must be at least ${MIN_LEN} characters.`;
    if (newPw === currentPw) return 'New password must be different from current.';
    if (newPw !== confirmPw) return 'New password and confirmation do not match.';
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const v = validate();
    if (v) { setErr(v); return; }

    setBusy(true);
    try {
      // 1) Verify current password by re-authenticating with it.
      //    Supabase's updateUser doesn't require current pw, so we check it ourselves.
      const { error: sigErr } = await supabase.auth.signInWithPassword({ email, password: currentPw });
      if (sigErr) {
        setErr('Current password is incorrect.');
        return;
      }

      // 2) Update to the new password.
      const { error: updErr } = await supabase.auth.updateUser({ password: newPw });
      if (updErr) {
        setErr(updErr.message);
        return;
      }

      setOk(true);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setTimeout(() => router.push('/dashboard'), 1800);
    } finally {
      setBusy(false);
    }
  }

  if (ok) {
    return (
      <div className="card card-p max-w-lg">
        <div className="flex items-center gap-3 text-green">
          <CheckCircle2 size={28} />
          <div>
            <div className="font-semibold text-ink">Password updated</div>
            <div className="text-sm text-label">Redirecting to dashboard…</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card card-p max-w-lg space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b border-line">
        <div className="w-10 h-10 rounded-lg bg-green/10 grid place-items-center text-green">
          <KeyRound size={18} />
        </div>
        <div>
          <div className="text-sm text-label">Signed in as</div>
          <div className="font-medium text-ink">{email}</div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label !mb-0">Current password</label>
          <button type="button" onClick={() => setShow(s => !s)}
            className="text-xs text-label hover:text-ink inline-flex items-center gap-1">
            {show ? <EyeOff size={12} /> : <Eye size={12} />} {show ? 'Hide' : 'Show'}
          </button>
        </div>
        <input
          type={show ? 'text' : 'password'}
          required autoFocus autoComplete="current-password"
          value={currentPw}
          onChange={e => setCurrentPw(e.target.value)}
          className="input"
          placeholder="••••••••"
        />
      </div>

      <div>
        <label className="label">New password</label>
        <input
          type={show ? 'text' : 'password'}
          required autoComplete="new-password"
          value={newPw}
          onChange={e => setNewPw(e.target.value)}
          className="input"
          placeholder={`Min ${MIN_LEN} characters`}
        />
        <div className="mt-1 text-[11px] text-label">
          Use at least {MIN_LEN} characters. Mix letters, numbers, and a symbol for strength.
        </div>
      </div>

      <div>
        <label className="label">Confirm new password</label>
        <input
          type={show ? 'text' : 'password'}
          required autoComplete="new-password"
          value={confirmPw}
          onChange={e => setConfirmPw(e.target.value)}
          className="input"
          placeholder="Retype the new password"
        />
      </div>

      {err && <div className="text-xs text-danger">{err}</div>}

      <div className="flex items-center justify-end gap-2 pt-2">
        <button type="button" onClick={() => router.push('/dashboard')} className="btn btn-ghost">
          Cancel
        </button>
        <button type="submit" disabled={busy} className="btn btn-primary">
          {busy ? 'Updating…' : 'Update password'}
        </button>
      </div>
    </form>
  );
}
