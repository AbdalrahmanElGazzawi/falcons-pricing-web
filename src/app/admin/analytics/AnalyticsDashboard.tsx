'use client';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { formatDistanceToNow } from 'date-fns';
import { Circle, Clock, Eye, TrendingUp, Users, Zap } from 'lucide-react';

type OnlineRow = {
  id: string; email: string; full_name: string | null; role: string;
  last_seen_at: string | null; current_path: string | null; is_online: boolean | null;
};
type Visit = { id: number; user_id: string | null; user_email: string | null; path: string; visited_at: string; session_id: string | null };
type Action = { id: number; actor_id: string | null; actor_email: string | null; action: string; entity_type: string; entity_id: string | null; created_at: string };
type Profile = { id: string; email: string; full_name: string | null; role: string; is_active: boolean };

const ONLINE_WINDOW_MS = 60_000;

export function AnalyticsDashboard({
  initialOnline, initialVisits, initialActions, profiles,
}: {
  initialOnline: OnlineRow[];
  initialVisits: Visit[];
  initialActions: Action[];
  profiles: Profile[];
}) {
  const [online, setOnline] = useState<OnlineRow[]>(initialOnline);
  const [visits, setVisits] = useState<Visit[]>(initialVisits);
  const [actions, setActions] = useState<Action[]>(initialActions);
  const [now, setNow] = useState(() => Date.now());
  const [filterUser, setFilterUser] = useState<string>('');

  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 5_000); return () => clearInterval(id); }, []);

  useEffect(() => {
    const supabase = createClient();

    const presenceChannel = supabase
      .channel('user_presence_admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_presence' }, (payload) => {
        const row = (payload.new ?? payload.old) as any;
        if (!row?.user_id) return;
        setOnline((prev) => {
          const profile = profiles.find((p) => p.id === row.user_id);
          const next = prev.filter((r) => r.id !== row.user_id);
          if (payload.eventType === 'DELETE') return next;
          return [{
            id: row.user_id,
            email: profile?.email ?? '(unknown)',
            full_name: profile?.full_name ?? null,
            role: profile?.role ?? 'viewer',
            last_seen_at: row.last_seen_at,
            current_path: row.current_path,
            is_online: true,
          }, ...next];
        });
      })
      .subscribe();

    const visitsChannel = supabase
      .channel('page_visits_admin')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'page_visits' }, (payload) => {
        const v = payload.new as Visit;
        setVisits((prev) => [v, ...prev].slice(0, 500));
      })
      .subscribe();

    const auditChannel = supabase
      .channel('audit_log_admin')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_log' }, (payload) => {
        const a = payload.new as Action;
        setActions((prev) => [a, ...prev].slice(0, 300));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(presenceChannel);
      supabase.removeChannel(visitsChannel);
      supabase.removeChannel(auditChannel);
    };
  }, [profiles]);

  const onlineNow = useMemo(
    () => online.filter(r => r.last_seen_at && now - new Date(r.last_seen_at).getTime() < ONLINE_WINDOW_MS),
    [online, now]
  );

  const lastSeen = useMemo(() => {
    const map = new Map<string, OnlineRow>();
    for (const r of online) {
      const cur = map.get(r.id);
      if (!cur || (r.last_seen_at ?? '') > (cur.last_seen_at ?? '')) map.set(r.id, r);
    }
    return Array.from(map.values()).sort((a, b) => (b.last_seen_at ?? '').localeCompare(a.last_seen_at ?? ''));
  }, [online]);

  const topPages = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of visits) counts.set(v.path, (counts.get(v.path) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [visits]);

  const filteredVisits = useMemo(
    () => filterUser ? visits.filter(v => v.user_id === filterUser) : visits,
    [visits, filterUser]
  );
  const filteredActions = useMemo(
    () => filterUser ? actions.filter(a => a.actor_id === filterUser) : actions,
    [actions, filterUser]
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Stat icon={<Circle className="w-5 h-5 fill-emerald-500 text-emerald-500" />} label="Online now" value={onlineNow.length} sub={`of ${profiles.length} active users`} />
        <Stat icon={<Eye className="w-5 h-5 text-sky-500" />} label="Visits (7d)" value={visits.length} sub={`${new Set(visits.map(v => v.user_id)).size} unique users`} />
        <Stat icon={<Zap className="w-5 h-5 text-amber-500" />} label="Actions (7d)" value={actions.length} sub={`${new Set(actions.map(a => a.actor_id)).size} actors`} />
        <Stat icon={<TrendingUp className="w-5 h-5 text-violet-500" />} label="Top page" value={topPages[0]?.[0] ?? '—'} sub={topPages[0] ? `${topPages[0][1]} visits` : 'no data yet'} mono />
      </div>

      <div className="card card-p">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4" />
          <h2 className="font-semibold">Online now</h2>
          <span className="text-xs text-mute">(live)</span>
        </div>
        {onlineNow.length === 0 ? (
          <p className="text-sm text-mute">Nobody's online right now.</p>
        ) : (
          <ul className="divide-y divide-line">
            {onlineNow.map((u) => (
              <li key={u.id} className="py-2 flex items-center gap-3">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{u.full_name || u.email}</div>
                  <div className="text-xs text-mute truncate">
                    {u.email} · viewing <span className="font-mono">{u.current_path ?? '—'}</span>
                  </div>
                </div>
                <span className="text-xs text-mute whitespace-nowrap">
                  {u.last_seen_at ? formatDistanceToNow(new Date(u.last_seen_at), { addSuffix: true }) : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card card-p">
        <div className="flex items-center gap-2 mb-3"><Clock className="w-4 h-4" /><h2 className="font-semibold">Last seen</h2></div>
        <table className="w-full text-sm">
          <thead className="text-left text-mute text-xs uppercase tracking-wide">
            <tr><th className="py-2">User</th><th>Role</th><th>Last opened</th><th>Last seen</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {lastSeen.map((u) => (
              <tr key={u.id}>
                <td className="py-2"><div className="font-medium">{u.full_name || u.email}</div><div className="text-xs text-mute">{u.email}</div></td>
                <td className="capitalize">{u.role}</td>
                <td className="font-mono text-xs">{u.current_path ?? '—'}</td>
                <td className="text-xs">{u.last_seen_at ? formatDistanceToNow(new Date(u.last_seen_at), { addSuffix: true }) : 'never'}</td>
              </tr>
            ))}
            {lastSeen.length === 0 && <tr><td colSpan={4} className="py-3 text-mute">No presence data yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card card-p">
        <div className="flex items-center gap-2 mb-3"><TrendingUp className="w-4 h-4" /><h2 className="font-semibold">Top pages (last 7 days)</h2></div>
        <ul className="space-y-1">
          {topPages.map(([path, count]) => {
            const pct = topPages[0] ? (count / topPages[0][1]) * 100 : 0;
            return (
              <li key={path} className="text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-mono truncate">{path}</span>
                  <span className="text-mute">{count}</span>
                </div>
                <div className="h-1.5 rounded bg-line overflow-hidden">
                  <div className="h-full bg-sky-500" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
          {topPages.length === 0 && <li className="text-sm text-mute">No visits yet.</li>}
        </ul>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card card-p">
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <div className="flex items-center gap-2"><Eye className="w-4 h-4" /><h2 className="font-semibold">Page visits</h2><span className="text-xs text-mute">({filteredVisits.length})</span></div>
            <select className="input text-xs" value={filterUser} onChange={(e) => setFilterUser(e.target.value)}>
              <option value="">All users</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
            </select>
          </div>
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-mute text-xs uppercase tracking-wide sticky top-0 bg-bg">
                <tr><th className="py-2">When</th><th>User</th><th>Path</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredVisits.slice(0, 200).map((v) => (
                  <tr key={v.id}>
                    <td className="py-1.5 text-xs whitespace-nowrap">{formatDistanceToNow(new Date(v.visited_at), { addSuffix: true })}</td>
                    <td className="text-xs">{v.user_email ?? '—'}</td>
                    <td className="font-mono text-xs">{v.path}</td>
                  </tr>
                ))}
                {filteredVisits.length === 0 && <tr><td colSpan={3} className="py-3 text-mute">No visits.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card card-p">
          <div className="flex items-center gap-2 mb-3"><Zap className="w-4 h-4" /><h2 className="font-semibold">Actions taken</h2><span className="text-xs text-mute">({filteredActions.length})</span></div>
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-mute text-xs uppercase tracking-wide sticky top-0 bg-bg">
                <tr><th className="py-2">When</th><th>Actor</th><th>Action</th><th>Entity</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredActions.slice(0, 200).map((a) => (
                  <tr key={a.id}>
                    <td className="py-1.5 text-xs whitespace-nowrap">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</td>
                    <td className="text-xs">{a.actor_email ?? '—'}</td>
                    <td className="text-xs font-mono">{a.action}</td>
                    <td className="text-xs text-mute">{a.entity_type}{a.entity_id ? `:${a.entity_id.slice(0,8)}` : ''}</td>
                  </tr>
                ))}
                {filteredActions.length === 0 && <tr><td colSpan={4} className="py-3 text-mute">No actions in window.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, sub, mono }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; mono?: boolean }) {
  return (
    <div className="card card-p">
      <div className="flex items-center gap-2 text-xs text-mute"><span>{icon}</span><span className="uppercase tracking-wide">{label}</span></div>
      <div className={`mt-2 text-2xl font-semibold ${mono ? 'font-mono text-base truncate' : ''}`}>{value}</div>
      {sub && <div className="text-xs text-mute mt-0.5">{sub}</div>}
    </div>
  );
}
