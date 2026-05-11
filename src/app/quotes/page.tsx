import Link from 'next/link';
import { requireStaff, isSuperAdminEmail } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { QuotesTable } from './QuotesTable';
import { PlusCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function QuotesPage() {
  const { denied, profile, supabase } = await requireStaff();
  if (denied) return <AccessDenied />;

  const { data: quotes } = await supabase
    .from('quotes')
    .select('id, quote_number, client_name, campaign, status, total, currency, usd_rate, owner_email, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <PageHeader
        title="Quote Log"
        subtitle={`${quotes?.length ?? 0} quotes — most recent first`}
        action={
          <Link href="/quote/new" className="btn btn-primary">
            <PlusCircle size={16} /> New quote
          </Link>
        }
      />
      {(() => {
        const groups: Record<string, any[]> = { draft: [], pending_approval: [], sent_to_client: [], approved: [], closed_won: [], closed_lost: [] };
        // Fold quote_status enum's terminal client states into the matching pipeline bucket
        // so no quote disappears from the dashboard view. The enum has 8 states; the pipeline
        // shows 6 columns. client_approved is effectively a 'won' state (client said yes,
        // booking pending); client_rejected is effectively 'lost' (client said no).
        const STATUS_BUCKET: Record<string, string> = {
          draft: 'draft',
          pending_approval: 'pending_approval',
          sent_to_client: 'sent_to_client',
          approved: 'approved',
          client_approved: 'closed_won',   // fold
          client_rejected: 'closed_lost',  // fold
          closed_won: 'closed_won',
          closed_lost: 'closed_lost',
        };
        for (const q of (quotes ?? []) as any[]) {
          const raw = (q.status as string) || 'draft';
          const key = STATUS_BUCKET[raw] ?? 'draft';
          if (groups[key]) groups[key].push(q);
        }
        const total = (quotes ?? []).length || 1;
        const wonValue = groups.closed_won.reduce((s, q) => s + Number(q.total ?? 0), 0);
        const sentValue = groups.sent_to_client.reduce((s, q) => s + Number(q.total ?? 0), 0);
        return (
          <section className="rounded-xl border border-line bg-bg/40 p-4 mb-5">
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-label">Pipeline view</h2>
              <div className="text-[11px] text-mute tabular-nums">
                Won: {Math.round(wonValue).toLocaleString()} SAR · In flight: {Math.round(sentValue).toLocaleString()} SAR
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
              {([
                ['draft','Draft','bg-zinc-50 text-zinc-700 border-zinc-200'],
                ['pending_approval','Pending','bg-amber-50 text-amber-900 border-amber-200'],
                ['sent_to_client','Sent','bg-blue-50 text-blue-900 border-blue-200'],
                ['approved','Approved','bg-greenSoft text-greenDark border-green/30'],
                ['closed_won','Won','bg-green/15 text-greenDark border-green/40','Includes client_approved + closed_won'],
                ['closed_lost','Lost','bg-rose-50 text-rose-900 border-rose-200','Includes client_rejected + closed_lost'],
              ] as Array<[string,string,string,string?]>).map(([key, label, cls, tip]) => {
                const list = groups[key] || [];
                const pct = Math.round((list.length / total) * 100);
                return (
                  <div key={key} className={`rounded-lg border ${cls} p-2.5`} title={tip}>
                    <div className="text-[10px] uppercase tracking-wider font-semibold opacity-80">{label}</div>
                    <div className="text-2xl font-extrabold tabular-nums mt-1">{list.length}</div>
                    <div className="text-[10px] opacity-70">{pct}% of {total}</div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })()}
      <QuotesTable quotes={quotes ?? []} canDelete={isSuperAdminEmail(profile.email)} />
    </Shell>
  );
}
