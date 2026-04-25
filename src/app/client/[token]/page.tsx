import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase-server';
import { fmtCurrency, fmtMoney, fmtPct, statusLabel } from '@/lib/utils';
import { ClientResponse } from './ClientResponse';

export const dynamic = 'force-dynamic';

export default async function ClientPortal({ params }: { params: { token: string } }) {
  const supabase = createServiceClient();

  const { data: quote } = await supabase
    .from('quotes')
    .select('*')
    .eq('client_token', params.token)
    .single();

  if (!quote) notFound();

  const [{ data: lines }, { data: addons }] = await Promise.all([
    supabase.from('quote_lines').select('*').eq('quote_id', quote.id).order('sort_order'),
    supabase.from('quote_addons').select('addon_id, uplift_pct, addons(label)').eq('quote_id', quote.id),
  ]);

  // Restrict client view: hide drafts / approved-but-not-sent
  const visible = ['sent_to_client', 'client_approved', 'client_rejected', 'closed_won'].includes(quote.status);

  // Log this view (fire-and-forget — don't block the render on it)
  if (visible) {
    const now = new Date().toISOString();
    void supabase
      .from('quotes')
      .update({
        viewed_at: quote.viewed_at ?? now,
        last_viewed_at: now,
        viewed_count: (quote.viewed_count ?? 0) + 1,
      })
      .eq('id', quote.id)
      .then(() => null);

    // First view → audit-log entry. Subsequent views just bump the counter.
    if (!quote.viewed_at) {
      void supabase.from('audit_log').insert({
        actor_email: 'client@portal',
        actor_kind: 'system',
        action: 'quote.client.viewed',
        entity_type: 'quote',
        entity_id: quote.id,
        diff: { quote_number: quote.quote_number, client_name: quote.client_name },
      }).then(() => null);
    }
  }
  if (!visible) {
    return (
      <PublicShell>
        <div className="card card-p text-center max-w-md mx-auto mt-20">
          <h2 className="text-lg font-semibold text-ink mb-2">This quote isn't ready yet</h2>
          <p className="text-sm text-label">Your account manager will share it once it's been finalised.</p>
        </div>
      </PublicShell>
    );
  }

  const responded = !!quote.client_responded_at;

  return (
    <PublicShell>
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <div className="card overflow-hidden mb-6">
          <div className="bg-navy text-white p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-green grid place-items-center text-white font-bold">F</div>
              <div>
                <div className="font-semibold leading-none">Team Falcons</div>
                <div className="text-white/60 text-xs mt-1">Pricing OS · Quotation</div>
              </div>
            </div>

            <div className="text-xs uppercase tracking-wide text-white/60">{quote.quote_number}</div>
            <h1 className="text-2xl font-semibold mt-1">{quote.client_name}</h1>
            {quote.campaign && <div className="text-white/70 text-sm mt-1">Campaign: {quote.campaign}</div>}

            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10 text-sm">
              <div>
                <div className="text-white/60 text-xs">Currency</div>
                <div>{quote.currency}</div>
              </div>
              <div>
                <div className="text-white/60 text-xs">Issued</div>
                <div>{quote.sent_at ? new Date(quote.sent_at).toLocaleDateString('en-GB') : new Date(quote.created_at).toLocaleDateString('en-GB')}</div>
              </div>
              <div>
                <div className="text-white/60 text-xs">Status</div>
                <div>{statusLabel(quote.status)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Lines */}
        <div className="card overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-line">
            <h2 className="font-semibold text-ink">Line items</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-label uppercase tracking-wide bg-bg">
                <th className="px-6 py-3">Talent</th>
                <th className="px-6 py-3">Deliverable</th>
                <th className="px-6 py-3 text-right">Qty</th>
                <th className="px-6 py-3 text-right">Unit</th>
                <th className="px-6 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {(lines || []).map(l => (
                <tr key={l.id} className="border-t border-line">
                  <td className="px-6 py-3">
                    <div className="font-medium text-ink">{l.talent_name}</div>
                    <div className="text-xs text-mute capitalize">{l.talent_type}</div>
                  </td>
                  <td className="px-6 py-3">{l.platform}</td>
                  <td className="px-6 py-3 text-right">{l.qty}</td>
                  <td className="px-6 py-3 text-right">{fmtCurrency(l.final_unit, quote.currency, quote.usd_rate ?? 3.75)}</td>
                  <td className="px-6 py-3 text-right font-medium">{fmtCurrency(l.final_amount, quote.currency, quote.usd_rate ?? 3.75)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {addons && addons.length > 0 && (
            <div className="px-6 py-4 border-t border-line bg-bg">
              <div className="text-xs text-label uppercase tracking-wide mb-2">Includes rights packages</div>
              <ul className="text-sm space-y-1">
                {addons.map((a: any) => (
                  <li key={a.addon_id} className="flex justify-between">
                    <span>{a.addons?.label || `Package #${a.addon_id}`}</span>
                    <span className="text-green">+{fmtPct(a.uplift_pct, 0)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="col-span-2 card card-p">
            <h3 className="font-semibold mb-3">Notes</h3>
            <p className="text-sm text-ink whitespace-pre-wrap">
              {quote.notes || 'No additional notes.'}
            </p>
          </div>

          <div className="card card-p">
            <div className="text-xs text-label uppercase tracking-wide mb-3">Summary</div>
            <div className="space-y-2 text-sm">
              <Row label="Subtotal" value={fmtCurrency(quote.subtotal, quote.currency, quote.usd_rate ?? 3.75)} />
              <Row label={`VAT (${fmtPct(quote.vat_rate, 0)})`} value={fmtCurrency(quote.vat_amount, quote.currency, quote.usd_rate ?? 3.75)} />
              <div className="border-t border-line pt-2 mt-2">
                <Row label="TOTAL" value={fmtCurrency(quote.total, quote.currency, quote.usd_rate ?? 3.75)} bold />
              </div>
            </div>
          </div>
        </div>

        {/* Approve / Reject — client-side response is disabled for now.
            All approvals are handled internally by Team Falcons staff. */}
        {quote.status === 'sent_to_client' && !responded ? (
          <ClientResponse token={params.token} />
        ) : responded ? (
          <div className="card card-p text-center">
            <div className="text-sm text-label mb-1">Response received</div>
            <div className="text-lg font-semibold text-ink">
              {quote.client_response === 'approved' ? '✓ Approved' :
               quote.client_response === 'rejected' ? '✗ Rejected' :
               statusLabel(quote.status)}
            </div>
            <div className="text-xs text-mute mt-1">
              {quote.client_responded_at && new Date(quote.client_responded_at).toLocaleString('en-GB')}
            </div>
          </div>
        ) : null}

        <div className="text-center text-xs text-mute mt-8 mb-4">
          Generated by Team Falcons · Pricing OS · {quote.quote_number}
        </div>
      </div>
    </PublicShell>
  );
}

function PublicShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-bg p-6">{children}</div>;
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-label">{label}</span>
      <span className={bold ? 'font-bold text-ink text-base' : 'text-ink'}>{value}</span>
    </div>
  );
}
