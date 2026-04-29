'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { ChevronDown, ChevronRight, Bot, User, Cpu } from 'lucide-react';

type Row = {
  id: number;
  created_at: string;
  actor_email: string | null;
  actor_kind: 'human' | 'ai' | 'system';
  action: string;
  entity_type: string;
  entity_id: string | null;
  diff: any;
};

export function AuditLogTable({
  rows, entityTypes, currentActor, currentAction, currentEntity,
}: {
  rows: Row[];
  entityTypes: string[];
  currentActor: string;
  currentAction: string;
  currentEntity: string;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const [openId, setOpenId] = useState<number | null>(null);

  function setParam(key: string, val: string) {
    const next = new URLSearchParams(
      Array.from(search?.entries() ?? []) as [string, string][]
    );
    if (val) next.set(key, val); else next.delete(key);
    router.push(`/admin/audit-log${next.toString() ? '?' + next.toString() : ''}`);
  }

  return (
    <div className="space-y-4">
      <div className="card card-p flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Actor kind</label>
          <select
            value={currentActor}
            onChange={e => setParam('actor', e.target.value)}
            className="input"
          >
            <option value="">All</option>
            <option value="human">Human</option>
            <option value="ai">AI</option>
            <option value="system">System</option>
          </select>
        </div>
        <div>
          <label className="label">Entity type</label>
          <select
            value={currentEntity}
            onChange={e => setParam('entity', e.target.value)}
            className="input"
          >
            <option value="">All</option>
            {entityTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="label">Action contains</label>
          <input
            value={currentAction}
            onChange={e => setParam('action', e.target.value)}
            placeholder="e.g. layout, tier.update, user."
            className="input"
          />
        </div>
        <div className="text-xs text-label whitespace-nowrap">
          {rows.length} {rows.length === 1 ? 'entry' : 'entries'} (capped at 100)
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-label uppercase tracking-wide bg-bg">
              <th className="px-4 py-3 w-10"></th>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Target ID</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-mute text-sm">
                  No audit entries match these filters.
                </td>
              </tr>
            )}
            {rows.map(r => {
              const open = openId === r.id;
              return (
                <ExpandableRow
                  key={r.id}
                  row={r}
                  open={open}
                  onToggle={() => setOpenId(open ? null : r.id)}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExpandableRow({ row, open, onToggle }: {
  row: Row; open: boolean; onToggle: () => void;
}) {
  const dt = new Date(row.created_at);
  const when = dt.toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const Icon = row.actor_kind === 'ai' ? Bot : row.actor_kind === 'system' ? Cpu : User;
  const tone =
    row.actor_kind === 'ai' ? 'text-blue-600 bg-blue-50' :
    row.actor_kind === 'system' ? 'text-slate-600 bg-slate-100' :
    'text-greenDark bg-green/10';

  return (
    <>
      <tr className="border-t border-line hover:bg-bg/60">
        <td className="px-4 py-3">
          <button onClick={onToggle} className="text-mute hover:text-ink" aria-label={open ? 'Collapse' : 'Expand'}>
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </td>
        <td className="px-4 py-3 text-mute whitespace-nowrap">{when}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full grid place-items-center ${tone}`}>
              <Icon size={12} />
            </span>
            <div className="text-sm">
              <div className="text-ink">{row.actor_email ?? <em className="text-mute">unknown</em>}</div>
              <div className="text-[10px] text-mute uppercase tracking-wide">{row.actor_kind}</div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 font-medium text-ink whitespace-nowrap">{row.action}</td>
        <td className="px-4 py-3 text-mute">{row.entity_type}</td>
        <td className="px-4 py-3 text-mute font-mono text-xs">{row.entity_id ?? '—'}</td>
      </tr>
      {open && (
        <tr className="border-t border-line bg-bg/40">
          <td></td>
          <td colSpan={5} className="px-4 py-3">
            <pre className="text-xs text-ink bg-white border border-line rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
              {row.diff ? JSON.stringify(row.diff, null, 2) : <span className="text-mute italic">no diff recorded</span>}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}
