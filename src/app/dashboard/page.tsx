import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { fmtMoney, statusColor, statusLabel } from '@/lib/utils';
import { PlusCircle, Users, Sparkles, FileText, TrendingUp } from 'lucide-react';

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
    supabase.from('quotes').select('status,total'),
  ]);

  const pipelineValue = (pipelineData || [])
    .filter(q => !['closed_lost', 'client_rejected', 'draft'].includes(q.status))
    .reduce((sum, q) => sum + (q.total || 0), 0);

  const tiles = [
    { label: 'Active Quotes', value: (pipelineData || []).filter(q => !['closed_lost','closed_won','client_rejected'].includes(q.status)).length, icon: FileText },
    { label: 'Pipeline Value', value: fmtMoney(pipelineValue), icon: TrendingUp },
    { label: 'Players', value: playerCount || 0, icon: Users },
    { label: 'Creators', value: creatorCount || 0, icon: Sparkles },
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

      <div className="grid grid-cols-4 gap-4 mb-8">
        {tiles.map(t => {
          const Icon = t.icon;
          return (
            <div key={t.label} className="card card-p">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-label uppercase tracking-wide">{t.label}</div>
                  <div className="text-2xl font-semibold text-ink mt-1">{t.value}</div>
                </div>
                <Icon size={20} className="text-green" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <h2 className="font-semibold">Recent quotes</h2>
          <Link href="/quotes" className="text-xs text-green hover:underline">View all →</Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-label uppercase tracking-wide">
              <th className="px-5 py-3">Quote #</th>
              <th className="px-5 py-3">Client</th>
              <th className="px-5 py-3">Campaign</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {(recentQuotes || []).map(q => (
              <tr key={q.id} className="border-t border-line hover:bg-bg">
                <td className="px-5 py-3">
                  <Link href={`/quote/${q.id}`} className="text-ink hover:text-green font-medium">{q.quote_number}</Link>
                </td>
                <td className="px-5 py-3">{q.client_name}</td>
                <td className="px-5 py-3 text-label">{q.campaign || '—'}</td>
                <td className="px-5 py-3">
                  <span className={`chip ${statusColor(q.status)}`}>{statusLabel(q.status)}</span>
                </td>
                <td className="px-5 py-3 text-right font-medium">{fmtMoney(q.total, q.currency)}</td>
              </tr>
            ))}
            {(!recentQuotes || recentQuotes.length === 0) && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-label">
                No quotes yet. <Link href="/quote/new" className="text-green hover:underline">Create your first →</Link>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
