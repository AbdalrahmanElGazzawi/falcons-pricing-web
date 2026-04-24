'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Trash2 } from 'lucide-react';
import type { UserRole } from '@/lib/types';

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
  const [busy, setBusy] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('sales');
  const [inviteErr, setInviteErr] = useState<string | null>(null);
  const [inviteOk, setInviteOk] = useState<string | null>(null);

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
        alert(j.error || 'Update failed');
      }
      router.refresh();
    } finally {
      setBusy(null);
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
        alert(j.error || 'Remove failed');
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
      setInviteOk(`Invitation sent to ${inviteEmail}`);
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
          {inviteOk && <div className="text-xs text-green">{inviteOk}</div>}
        </div>
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
              return (
                <tr key={u.id} className="border-t border-line">
                  <td className="px-4 py-3 font-medium text-ink">
                    {u.email} {isSelf && <span className="text-xs text-mute">(you)</span>}
                  </td>
                  <td className="px-4 py-3 text-label">{u.full_name || '—'}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      disabled={isSelf || busy === u.id}
                      onChange={e => patch(u.id, { role: e.target.value })}
                      className="input py-1 px-2 text-sm w-32"
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
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
                  <td className="px-4 py-3 text-right">
                    {!isSelf && (
                      <button
                        disabled={busy === u.id}
                        onClick={() => remove(u.id, u.email)}
                        title="Remove user"
                        className="inline-flex items-center gap-1 text-xs text-danger hover:bg-red-50 px-2 py-1 rounded-md transition">
                        <Trash2 size={13} /> Remove
                      </button>
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
