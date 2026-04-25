import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { fmtMoney } from '@/lib/utils';
import { PlusCircle, TrendingUp, Trophy, Users, Sparkles, DollarSign, ArrowUpRight, FileBarChart } from 'lucide-react';
import { DashboardCharts } from './DashboardCharts';

export const dynamic = 'force-dynamic';

interface MonthBucket { month: string; collected: number; pipeline: number; quotes: number; }

export default async function DashboardPage() {
  const { denied, profile, supabase } = await requireStaff();
  if (denied) return <AccessDenied />;

  const [
    { count: playerCount },
    { count: creatorCount },
    { data: salesRows },
    { data: quotes },
    { data: recentQuotes },
  ] = await Promise.all([
    supabase.from('players').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('creators').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('sales_log').select('*'),
    supabase.from('quotes').select('id, status, total, currency, created_at, viewed_at, accepted_at'),
    supabase.from('quotes').select('id,quote_number,client_name,campaign,status,total,currency,created_at')
      .order('created_at', { ascending: false }).limit(6),
  ]);

  const sales = salesRows ?? [];
  const allQuotes = quotes ?? [];

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const collected = sales.filter(r => r.status === 'payment_collected');
  const pipelineSales = sales.filter(r => r.status === 'in_progress' || r.status === 'waiting_for_payment');
  const collectedSar = collected.reduce((s, r) => s + Number(r.total_with_vat_sar), 0);
  const pipelineSar = pipelineSales.reduce((s, r) => s + Number(r.total_with_vat_sar), 0);
  const avgDealSar = sales.length ? sales.reduce((s, r) => s + Number(r.total_with_vat_sar), 0) / sales.length : 0;

  // Quote pipeline (forward-looking)
  const liveStatuses = ['draft','pending_approval','approved','sent_to_client'];
  const wonStatuses = ['client_approved','closed_won'];
  const quotePipelineSar = allQuotes
    .filter(q => liveStatuses.includes(q.status))
    .reduce((s, q) => s + Number(q.total ?? 0), 0);
  const quoteWonSar = allQuotes
    .filter(q => wonStatuses.includes(q.status))
    .reduce((s, q) => s + Number(q.total ?? 0), 0);

  // ── Monthly trend (sales-log driven) ─────────────────────────────────────
  const buckets = new Map<string, MonthBucket>();
  for (const r of sales) {
    const m = String(r.deal_date).slice(0, 7); // YYYY-MM
    if (!buckets.has(m)) buckets.set(m, { month: m, collected: 0, pipeline: 0, quotes: 0 });
    const b = buckets.get(m)!;
    if (r.status === 'payment_collected') b.collected += Number(r.total_with_vat_sar);
    else if (r.status === 'in_progress' || r.status === 'waiting_for_payment') b.pipeline += Number(r.total_with_vat_sar);
  }
  for (const q of allQuotes) {
    const m = String(q.created_at).slice(0, 7);
    if (!buckets.has(m)) buckets.set(m, { month: m, collected: 0, pipeline: 0, quotes: 0 });
    buckets.get(m)!.quotes += 1;
  }
  const monthlyTrend = [...buckets.values()].sort((a, b) => a.month.localeCompare(b.month));

  // ── Top creators ─────────────────────────────────────────────────────────
  const creatorMap = new Map<string, { name: string; revenue: number; deals: number }>();
  for (const r of sales) {
    const name = (r as any).talent_name_en || r.talent_name;
    if (!creatorMap.has(name)) creatorMap.set(name, { name, revenue: 0, deals: 0 });
    creatorMap.get(name)!.revenue += Number(r.total_with_vat_sar);
    creatorMap.get(name)!.deals += 1;
  }
  const topCreators = [...creatorMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6);

  // ── Brand mix ────────────────────────────────────────────────────────────
  type BrandAgg = { name: string; revenue: number; domain: string | null };
  const brandMap = new Map<string, BrandAgg>();
  for (const r of sales) {
    const name = (r as any).brand_name_en || r.brand_name || 'Unknown';
    const domain = (r as any).brand_domain ?? null;
    if (!brandMap.has(name)) brandMap.set(name, { name, revenue: 0, domain });
    brandMap.get(name)!.revenue += Number(r.total_with_vat_sar);
    if (!brandMap.get(name)!.domain && domain) brandMap.get(name)!.domain = domain;
  }
  const topBrands = [...brandMap.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  // ── Platform mix ─────────────────────────────────────────────────────────
  const platMap = new Map<string, number>();
  for (const r of sales) {
    const k = (r.platform || 'Other').trim();
    platMap.set(k, (platMap.get(k) ?? 0) + Number(r.total_with_vat_sar));
  }
  const platformMix = [...platMap.entries()]
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue);

  // ── Funnel (quote → cash) ────────────────────────────────────────────────
  const funnel = [
    { stage: 'Quotes drafted', value: allQuotes.length },
    { stage: 'Sent to client', value: allQuotes.filter(q => ['sent_to_client','client_approved','closed_won'].includes(q.status)).length },
    { stage: 'Viewed', value: allQuotes.filter(q => q.viewed_at).length },
    { stage: 'Accepted', value: allQuotes.filter(q => q.accepted_at).length },
    { stage: 'Invoiced', value: sales.filter(r => r.invoice_issued).length },
    { stage: 'Collected', value: collected.length },
  ];

  // ── AR aging ─────────────────────────────────────────────────────────────
  const today = new Date();
  const overdueBuckets = { current: 0, b30: 0, b60: 0, b90: 0 };
  for (const r of sales.filter(s => s.invoice_issued && !s.payment_collected)) {
    const days = Math.floor((today.getTime() - new Date(r.deal_date).getTime()) / (1000 * 60 * 60 * 24));
    const amt = Number(r.total_with_vat_sar);
    if (days <= 30) overdueBuckets.current += amt;
    else if (days <= 60) overdueBuckets.b30 += amt;
    else if (days <= 90) overdueBuckets.b60 += amt;
    else overdueBuckets.b90 += amt;
  }
  const aging = [
    { bucket: 'Current (≤30d)', amount: overdueBuckets.current },
    { bucket: '31–60 days',     amount: overdueBuckets.b30 },
    { bucket: '61–90 days',     amount: overdueBuckets.b60 },
    { bucket: '> 90 days',      amount: overdueBuckets.b90 },
  ];

  // ── Status mix donut (sales) ─────────────────────────────────────────────
  const statusMix = [
    { name: 'Collected',        value: sales.filter(r => r.status === 'payment_collected').length },
    { name: 'Awaiting payment', value: sales.filter(r => r.status === 'waiting_for_payment').length },
    { name: 'In progress',      value: sales.filter(r => r.status === 'in_progress').length },
    { name: 'Cancelled',        value: sales.filter(r => r.status === 'cancelled').length },
  ].filter(s => s.value > 0);

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <PageHeader
        title={`Welcome, ${profile.full_name || profile.email.split('@')[0]}`}
        subtitle="Team Falcons · Pricing OS"
        action={
          <div className="flex items-center gap-2">
            <Link href="/dashboard/ops" className="btn btn-ghost">
              <FileBarChart size={14} /> Operations view
            </Link>
            <Link href="/quote/new" className="btn btn-primary">
              <PlusCircle size={16} /> New quote
            </Link>
          </div>
        }
      />

      {/* Hero strip — three statement numbers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <HeroCard
          icon={DollarSign}
          tint="green"
          label="Revenue collected"
          value={`${Math.round(collectedSar).toLocaleString('en-US')} SAR`}
          sub={`${collected.length} deal${collected.length === 1 ? '' : 's'} · $${Math.round(collected.reduce((s,r)=>s+Number(r.amount_usd),0)).toLocaleString('en-US')} USD`}
        />
        <HeroCard
          icon={TrendingUp}
          tint="navy"
          label="Open pipeline"
          value={`${Math.round(pipelineSar + quotePipelineSar).toLocaleString('en-US')} SAR`}
          sub={`${pipelineSales.length} in-flight · ${allQuotes.filter(q => liveStatuses.includes(q.status)).length} live quotes`}
        />
        <HeroCard
          icon={Trophy}
          tint="amber"
          label="Avg deal size"
          value={`${Math.round(avgDealSar).toLocaleString('en-US')} SAR`}
          sub={`across ${sales.length} ledger entries`}
        />
      </div>

      {/* Charts canvas — client-rendered with Recharts */}
      <DashboardCharts
        monthly={monthlyTrend}
        creators={topCreators}
        brands={topBrands}
        platforms={platformMix}
        funnel={funnel}
        aging={aging}
        statusMix={statusMix}
      />

      {/* Roster + recent quotes — supplementary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="card card-p">
          <div className="text-xs text-label uppercase tracking-wider mb-2">Roster</div>
          <div className="flex items-center gap-4">
            <div>
              <div className="text-3xl font-bold text-ink tabular-nums">{playerCount ?? 0}</div>
              <div className="text-xs text-mute flex items-center gap-1.5"><Users size={12} /> Active players</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-ink tabular-nums">{creatorCount ?? 0}</div>
              <div className="text-xs text-mute flex items-center gap-1.5"><Sparkles size={12} /> Active creators</div>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <Link href="/roster/players" className="text-xs text-greenDark hover:underline">Players →</Link>
            <Link href="/roster/creators" className="text-xs text-greenDark hover:underline">Creators →</Link>
          </div>
        </div>

        <div className="card card-p lg:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-label uppercase tracking-wider">Recent quotes</div>
            <Link href="/quotes" className="text-xs text-greenDark hover:underline">View all →</Link>
          </div>
          {(recentQuotes ?? []).length === 0 ? (
            <div className="text-sm text-mute py-6 text-center">No quotes yet.</div>
          ) : (
            <ul className="divide-y divide-line">
              {(recentQuotes ?? []).map((q: any) => (
                <li key={q.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/quote/${q.id}`} className="text-sm font-medium text-ink hover:text-greenDark truncate block">
                      {q.quote_number} · {q.client_name}
                    </Link>
                    {q.campaign && <div className="text-xs text-mute truncate">{q.campaign}</div>}
                  </div>
                  <div className="text-sm font-medium text-ink tabular-nums whitespace-nowrap">
                    {fmtMoney(q.total ?? 0, q.currency)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Shell>
  );
}

function HeroCard({
  icon: Icon, tint, label, value, sub,
}: { icon: any; tint: 'green' | 'navy' | 'amber'; label: string; value: string; sub: string }) {
  const tintMap = {
    green: 'from-green/10 to-greenSoft/40 text-greenDark',
    navy:  'from-navy/10 to-navy/5 text-navy',
    amber: 'from-amber-100 to-amber-50 text-amber-700',
  } as const;
  return (
    <div className={`card overflow-hidden relative bg-gradient-to-br ${tintMap[tint]}`}>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="text-[11px] uppercase tracking-widest font-semibold opacity-70">{label}</div>
          <Icon size={20} className="opacity-60" />
        </div>
        <div className="mt-3 text-3xl sm:text-4xl font-bold tabular-nums text-ink">{value}</div>
        <div className="mt-1 text-xs text-label flex items-center gap-1">
          <ArrowUpRight size={12} /> {sub}
        </div>
      </div>
    </div>
  );
}
