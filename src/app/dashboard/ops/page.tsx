import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { ArrowLeft, AlertCircle, Clock, FileText, Inbox } from 'lucide-react';

export const dynamic = 'force-dynamic';

function fmtSar(n: number) { return Math.round(Number(n)).toLocaleString('en-US') + ' SAR'; }
function daysBetween(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24));
}

export default async function OpsDashboard() {
  const { denied, profile, supabase } = await requireStaff();
  if (denied) return <AccessDenied />;

  const [{ data: sales }, { data: openQuotes }, { data: openInquiries }] = await Promise.all([
    supabase.from('sales_log').select('*'),
    supabase.from('quotes')
      .select('id, quote_number, client_name, campaign, status, total, currency, created_at, viewed_at, sent_at')
      .in('status', ['draft','sent_to_client','client_approved','approved'])
      .order('created_at', { ascending: false })
      .limit(40),
    supabase.from('inquiries')
      .select('id, brand_name, contact_name, status, created_at')
      .neq('status', 'archived')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const openInvoices = (sales ?? [])
    .filter(r => r.invoice_issued && !r.payment_collected && r.status !== 'cancelled')
    .map(r => ({ ...r, daysOpen: daysBetween(r.deal_date) }))
    .sort((a, b) => b.daysOpen - a.daysOpen);

  const openInvoicesTotal = openInvoices.reduce((s, r) => s + Number(r.total_with_vat_sar), 0);
  const overdue30 = openInvoices.filter(r => r.daysOpen > 30);
  const overdue60 = openInvoices.filter(r => r.daysOpen > 60);

  // Quotes that have been sent but not yet viewed in 48h+
  const stale = (openQuotes ?? []).filter(q =>
    q.status === 'sent_to_client' && !q.viewed_at && q.sent_at && daysBetween(q.sent_at) >= 2
  );

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-label hover:text-ink mb-3">
        <ArrowLeft size={14} /> Executive view
      </Link>

      <PageHeader
        title="Operations"
        subtitle="Collections, stale follow-ups, and unhandled inquiries — what to chase today"
      />

      {/* Open invoices KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Tile
          tint="blue"
          icon={Clock}
          label="Open invoices (issued, unpaid)"
          value={fmtSar(openInvoicesTotal)}
          sub={`${openInvoices.length} invoice${openInvoices.length === 1 ? '' : 's'}`}
        />
        <Tile
          tint="amber"
          icon={AlertCircle}
          label="Overdue > 30 days"
          value={`${overdue30.length}`}
          sub={fmtSar(overdue30.reduce((s, r) => s + Number(r.total_with_vat_sar), 0))}
        />
        <Tile
          tint="rose"
          icon={AlertCircle}
          label="Overdue > 60 days"
          value={`${overdue60.length}`}
          sub={fmtSar(overdue60.reduce((s, r) => s + Number(r.total_with_vat_sar), 0))}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Open invoices table */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-line">
            <h2 className="font-semibold flex items-center gap-2"><Clock size={14} /> Open invoices</h2>
            <p className="text-xs text-mute mt-0.5">Sorted by oldest first — chase the top of the list.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table density-compact w-full text-sm">
              <thead>
                <tr><th>Days</th><th>Brand</th><th>Talent</th><th className="text-right">Amount</th></tr>
              </thead>
              <tbody>
                {openInvoices.slice(0, 10).map(r => (
                  <tr key={r.id}>
                    <td>
                      <span className={[
                        'text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded',
                        r.daysOpen > 60 ? 'bg-rose-100 text-rose-700' :
                        r.daysOpen > 30 ? 'bg-amber-100 text-amber-700' :
                                          'bg-blue-100 text-blue-700',
                      ].join(' ')}>{r.daysOpen}d</span>
                    </td>
                    <td className="text-ink" dir="auto">{r.brand_name || '—'}</td>
                    <td className="text-mute" dir="auto">{r.talent_name}</td>
                    <td className="text-right font-medium tabular-nums">{fmtSar(Number(r.total_with_vat_sar))}</td>
                  </tr>
                ))}
                {openInvoices.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-mute">All clear — no open invoices.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stale quotes — sent but not viewed */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-line">
            <h2 className="font-semibold flex items-center gap-2"><FileText size={14} /> Stale quotes</h2>
            <p className="text-xs text-mute mt-0.5">Sent ≥ 2 days ago and never opened by the client.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table density-compact w-full text-sm">
              <thead>
                <tr><th>Days</th><th>Quote</th><th>Client</th><th className="text-right">Total</th></tr>
              </thead>
              <tbody>
                {stale.slice(0, 10).map((q: any) => (
                  <tr key={q.id}>
                    <td>
                      <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                        {daysBetween(q.sent_at)}d
                      </span>
                    </td>
                    <td>
                      <Link href={`/quote/${q.id}`} className="text-ink hover:text-greenDark font-medium">{q.quote_number}</Link>
                    </td>
                    <td className="text-mute" dir="auto">{q.client_name}</td>
                    <td className="text-right font-medium tabular-nums">{fmtSar(Number(q.total ?? 0))}</td>
                  </tr>
                ))}
                {stale.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-mute">All sent quotes have been opened.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Inquiries snapshot */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-line flex items-center justify-between">
          <div>
            <h2 className="font-semibold flex items-center gap-2"><Inbox size={14} /> Open inquiries</h2>
            <p className="text-xs text-mute mt-0.5">Inbound leads that haven&apos;t been converted yet.</p>
          </div>
          <Link href="/inquiries" className="text-xs text-greenDark hover:underline">All inquiries →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table density-compact w-full text-sm">
            <thead>
              <tr><th>Days</th><th>Brand / Contact</th><th>Status</th></tr>
            </thead>
            <tbody>
              {(openInquiries ?? []).slice(0, 10).map((i: any) => (
                <tr key={i.id}>
                  <td className="text-mute">{daysBetween(i.created_at)}d</td>
                  <td>
                    <div className="font-medium text-ink" dir="auto">{i.brand_name || i.contact_name}</div>
                    {i.brand_name && i.contact_name && <div className="text-xs text-mute" dir="auto">{i.contact_name}</div>}
                  </td>
                  <td className="text-xs uppercase tracking-wide text-label">{i.status}</td>
                </tr>
              ))}
              {(openInquiries ?? []).length === 0 && <tr><td colSpan={3} className="py-6 text-center text-mute">No open inquiries.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}

function Tile({ icon: Icon, tint, label, value, sub }: any) {
  const tintMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
  };
  return (
    <div className="card card-p flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg grid place-items-center flex-shrink-0 ${tintMap[tint]}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-label font-semibold">{label}</div>
        <div className="text-2xl font-bold text-ink mt-1 tabular-nums">{value}</div>
        <div className="text-xs text-mute mt-0.5">{sub}</div>
      </div>
    </div>
  );
}
