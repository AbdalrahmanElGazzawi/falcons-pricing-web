'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Trash2, KeyRound, Copy, Check as CheckIcon } from 'lucide-react';
import type { UserRole } from '@/lib/types';
import { isSuperAdminEmail } from '@/lib/super-admin';
import { useToast } from '@/components/Toast';

type Row = {
  id: string;
  email: string;
  full_name?: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
};

const ROLES: UserRole[] = ['admin', 'sales', 'finance', 'viewer'];

export function UsersTable({ users, currentUserId }: { users: Row[]; currentUserId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('sales');
  const [inviteErr, setInviteErr] = useState<string | null>(null);
  const [inviteOk, setInviteOk] = useState<{ email: string; password: string } | null>(null);
  const [resetResult, setResetResult] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function patch(id: string, body: any) {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error('Update failed', j.error || 'Please try again.');
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function resetPassword(id: string, email: string) {
    const ok = confirm(
      `Reset password for ${email}?\n\nA new temporary password will be generated and shown to you. You'll need to share it with the user through your preferred channel (Slack, WhatsApp, etc.). Their old password stops working immediately.`
    );
    if (!ok) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/users/${id}/reset-password`, { method: 'POST' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error('Reset failed', j.error || 'Please try again.'); return; }
      setResetResult({ email: j.email, password: j.temp_password });
    } finally {
      setBusy(null);
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Copy failed', 'Please select and copy the password manually.');
    }
  }

  async function remove(id: string, email: string) {
    const ok = confirm(
      `Remove ${email}?\n\nThis deletes the account, clears them from the invite allowlist, and ends all their sessions. Their historic quotes are kept. To restore, send a fresh invite.`
    );
    if (!ok) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error('Remove failed', j.error || 'Please try again.');
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function invite() {
    setInviteErr(null); setInviteOk(null);
    if (!inviteEmail.trim()) { setInviteErr('Email is required'); return; }
    setBusy('invite');
    try {
      const res = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          full_name: inviteName.trim() || null,
          role: inviteRole,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Invite failed');
      setInviteOk({ email: j.email || inviteEmail, password: j.temp_password });
      setInviteEmail(''); setInviteName('');
      router.refresh();
    } catch (e: any) {
      setInviteErr(e.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-label">{users.length} accounts</div>
        <button onClick={() => setInviteOpen(o => !o)} className="btn btn-primary">
          <UserPlus size={16} /> Invite user
        </button>
      </div>

      {inviteOpen && (
        <div className="card card-p mb-4 space-y-3">
          <h3 className="font-semibold">Invite a new user</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Email *</label>
              <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="input" placeholder="user@falcons.gg" />
            </div>
            <div>
              <label className="label">Full name</label>
              <input value={inviteName} onChange={e => setInviteName(e.target.value)} className="input" placeholder="Jane Doe" />
            </div>
            <div>
              <label className="label">Role</label>
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value as UserRole)} className="input">
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={invite} disabled={busy === 'invite'} className="btn btn-primary">
              {busy === 'invite' ? 'Sending…' : 'Send invite'}
            </button>
            <button onClick={() => setInviteOpen(false)} className="btn btn-ghost">Cancel</button>
          </div>
          {inviteErr && <div className="text-xs text-red-600">{inviteErr}</div>}
        </div>
      )}

      {inviteOk && (
        <TempPasswordCard
          title="User invited — share this password"
          email={inviteOk.email}
          password={inviteOk.password}
          onDismiss={() => setInviteOk(null)}
          onCopy={copyToClipboard}
          copied={copied}
        />
      )}

      {resetResult && (
        <TempPasswordCard
          title="Password reset — share this new password"
          email={resetResult.email}
          password={resetResult.password}
          onDismiss={() => setResetResult(null)}
          onCopy={copyToClipboard}
          copied={copied}
        />
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-label uppercase tracking-wide bg-bg">
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const isSelf = u.id === currentUserId;
              const superAdmin = isSuperAdminEmail(u.email);
              return (
                <tr key={u.id} className="border-t border-line">
                  <td className="px-4 py-3 font-medium text-ink">
                    {u.email} {isSelf && <span className="text-xs text-mute">(you)</span>}
                  </td>
                  <td className="px-4 py-3 text-label">
                    <NameCell
                      key={u.id + ':' + (u.full_name ?? '')}
                      userId={u.id}
                      initial={u.full_name ?? ''}
                      busy={busy === u.id}
                      onSave={async (val) => {
                        await patch(u.id, { full_name: val.trim() || null });
                      }}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <select
                        value={u.role}
                        disabled={isSelf || busy === u.id}
                        onChange={e => patch(u.id, { role: e.target.value })}
                        className="input py-1 px-2 text-sm w-32"
                      >
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      {superAdmin && (
                        <span
                          className="chip chip-mint text-[10px] uppercase tracking-wider w-fit"
                          title="Super admin — hardcoded by email. Only this user can edit page layouts."
                        >
                          Super admin
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      disabled={isSelf || busy === u.id}
                      onClick={() => patch(u.id, { is_active: !u.is_active })}
                      className={`chip ${u.is_active ? 'chip-mint' : 'chip-grey'} text-xs`}>
                      {u.is_active ? 'Active' : 'Disabled'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-label text-xs">
                    {new Date(u.created_at).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {!isSelf && (
                      <div className="inline-flex items-center gap-1">
                        <button
                          disabled={busy === u.id}
                          onClick={() => resetPassword(u.id, u.email)}
                          title="Generate a new temp password"
                          className="inline-flex items-center gap-1 text-xs text-label hover:text-ink hover:bg-bg px-2 py-1 rounded-md transition">
                          <KeyRound size={13} /> Reset pw
                        </button>
                        <button
                          disabled={busy === u.id}
                          onClick={() => remove(u.id, u.email)}
                          title="Remove user"
                          className="inline-flex items-center gap-1 text-xs text-danger hover:bg-red-50 px-2 py-1 rounded-md transition">
                          <Trash2 size={13} /> Remove
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-label">No users yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function TempPasswordCard({
  title, email, password, onDismiss, onCopy, copied,
}: {
  title: string;
  email: string;
  password: string;
  onDismiss: () => void;
  onCopy: (s: string) => void;
  copied: boolean;
}) {
  const shareBlock = `Team Falcons Pricing OS\nURL: https://falcons-pricing-web.vercel.app\nEmail: ${email}\nTemp password: ${password}\n\nPlease change your password after first login (sidebar → Change password).`;
  return (
    <div className="card card-p mb-4 border-green/40 bg-green/5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-ink">{title}</h3>
        <button onClick={onDismiss} className="text-xs text-label hover:text-ink">Dismiss</button>
      </div>
      <div className="text-xs text-label mb-3">
        This password is shown <strong>once</strong>. Copy it and share with the user through your preferred channel (WhatsApp, Slack, etc.). They should change it on first login.
      </div>
      <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 items-center mb-3 text-sm">
        <span className="text-label">Email</span>
        <span className="font-medium text-ink">{email}</span>
        <span className="text-label">Temp password</span>
        <code className="font-mono font-semibold text-ink bg-white border border-line rounded-md px-2 py-1 inline-block w-fit">{password}</code>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onCopy(password)}
          className="btn btn-ghost text-sm"
          title="Copy just the password">
          {copied ? <CheckIcon size={14} /> : <Copy size={14} />} {copied ? 'Copied!' : 'Copy password'}
        </button>
        <button
          onClick={() => onCopy(shareBlock)}
          className="btn btn-ghost text-sm"
          title="Copy the full share message with URL + email + password">
          <Copy size={14} /> Copy share message
        </button>
      </div>
    </div>
  );
}

// ─── Inline editable name cell ─────────────────────────────────────────────
function NameCell({
  userId, initial, busy, onSave,
}: {
  userId: string;
  initial: string;
  busy: boolean;
  onSave: (val: string) => Promise<void>;
}) {
  const [val, setVal] = useState(initial);
  const [showCheck, setShowCheck] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!showCheck) return;
    const t = setTimeout(() => setShowCheck(false), 1500);
    return () => clearTimeout(t);
  }, [showCheck]);

  async function commit() {
    if (val === initial) return;        // nothing changed
    if (saving) return;
    setSaving(true);
    try {
      await onSave(val);
      setShowCheck(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') { setVal(initial); (e.target as HTMLInputElement).blur(); }
        }}
        placeholder="—"
        disabled={busy || saving}
        className="input py-1 px-2 text-sm w-44"
        title={`User ${userId}`}
      />
      {saving && <span className="text-[10px] text-mute">saving…</span>}
      {showCheck && <CheckIcon size={14} className="text-green" />}
    </div>
  );
}

