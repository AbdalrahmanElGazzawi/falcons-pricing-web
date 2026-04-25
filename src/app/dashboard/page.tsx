import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { EmptyState } from '@/components/EmptyState';
import { StatusPill } from '@/components/Status';
import { fmtMoney } from '@/lib/utils';
import { PlusCircle, Users, Sparkles, FileText, TrendingUp, Trophy, FilePlus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { denied, profile, supabase } = await requireStaff();
  if (denied) return <AccessDenied />;

  const [
    { count: playerCount },
    { count: creatorCount },
    { data: recentQuotes },
    { data: pipelineData },
  ] = await Promise.all([
    supabase.from('players').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('creators').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('quotes').select('id,quote_number,client_name,campaign,status,total,currency,created_at').order('created_at', { ascending: false }).limit(8),
    supabase.from('quotes').select('status,total,created_at'),
  ]);

  const pipelineValue = (pipelineData || [])
    .filter((q: any) => !['closed_lost', 'client_rejected', 'draft'].includes(q.status))
    .reduce((sum: number, q: any) => sum + (q.total || 0), 0);

  const wonValue = (pipelineData || [])
    .filter((q: any) => q.status === 'closed_won')
    .reduce((sum: number, q: any) => sum + (q.total || 0), 0);

  const activeQuotes = (pipelineData || []).filter(
    (q: any) => !['closed_lost', 'closed_won', 'client_rejected'].includes(q.status)
  ).length;

  const pendingApproval = (pipelineData || []).filter(
    (q: any) => q.status === 'pending_approval'
  ).length;

  const kpis: Array<{ label: string; value: string | number; sub?: string; icon: any; tone?: 'green' | 'amber' | 'navy'; href?: string }> = [
    { label: 'Pipeline value', value: fmtMoney(pipelineValue), sub: `${activeQuotes} active quote${activeQuotes === 1 ? '' : 's'}`, icon: TrendingUp, tone: 'green' },
    { label: 'Won this period', value: fmtMoney(wonValue), sub: 'closed_won total', icon: Trophy, tone: 'green' },
    { label: 'Pending your approval', value: pendingApproval, sub: pendingApproval > 0 ? 'needs attention' : 'all clear', icon: FileText, tone: pendingApproval > 0 ? 'amber' : 'navy', href: '/quotes?status=pending_approval' },
    { label: 'Roster', value: `${playerCount ?? 0}`, sub: `${creatorCount ?? 0} creators`, icon: Users, tone: 'navy', href: '/roster/players' },
  ];

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <PageHeader
        title={`Welcome, ${profile.full_name || profile.email.split('@')[0]}`}
        subtitle="Team Falcons · Pricing OS"
        action={
          <Link href="/quote/new" className="btn btn-primary">
            <PlusCircle size={16} /> New quote
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map(k => {
          const Icon = k.icon;
          const accentClass =
            k.tone === 'amber' ? 'bg-amber/15 text-amber' :
            k.tone === 'navy'  ? 'bg-navy/10 text-navy' :
                                 'bg-green/10 text-greenDark';
          const Inner = (
            <div className="kpi h-full">
              <div className={`kpi-accent ${accentClass}`}>
                <Icon size={18} />
              </div>
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value">{k.value}</div>
              {k.sub && <div className="kpi-sub mt-1">{k.sub}</div>}
            </div>
          );
          return k.href
            ? <Link key={k.label} href={k.href} className="block hover:-translate-y-0.5 transition-transform">{Inner}</Link>
            : <div key={k.label}>{Inner}</div>;
        })}
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <h2 className="font-semibold">Recent quotes</h2>
          <Link href="/quotes" className="text-xs text-greenDark hover:underline font-medium">View all →</Link>
        </div>

        {(!recentQuotes || recentQuotes.length === 0) ? (
          <EmptyState
            icon={FilePlus}
            title="No quotes yet"
            body="Build your first campaign quote with the live pricing wizard."
            action={{ label: 'New quote', href: '/quote/new' }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table density-comfortable">
              <thead>
                <tr>
                  <th>Quote #</th>
                  <th>Client</th>
                  <th>Campaign</th>
                  <th>Status</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentQuotes.map((q: any) => (
                  <tr key={q.id}>
                    <td>
                      <Link href={`/quote/${q.id}`} className="text-ink hover:text-greenDark font-medium">
                        {q.quote_number}
                      </Link>
                    </td>
                    <td>{q.client_name}</td>
                    <td className="text-label">{q.campaign || '—'}</td>
                    <td><StatusPill status={q.status} /></td>
                    <td className="text-right font-medium">{fmtMoney(q.total, q.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Shell>
  );
}
