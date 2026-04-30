import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase-server';
import { fmtCurrency, fmtPct, statusLabel } from '@/lib/utils';
import { ClientResponse } from './ClientResponse';
import { Phone, Mail, MapPin, Building2, FileText, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

// ─── Falcons company details for the official quotation header/footer ───────
// TODO: pull these from a `company_settings` table when finance shares the
// official CR / VAT numbers. Hardcoded for now.
const FALCONS = {
  legal_name:    'Team Falcons LLC',
  trading_name:  'Team Falcons',
  cr_number:     'CR 1010XXXXXX',          // TODO: replace with actual
  vat_number:    'VAT 3000XXXXXXXXXXX',    // TODO: replace with actual
  address_lines: ['Falcons HQ', 'Riyadh Boulevard City', 'Riyadh, Saudi Arabia'],
  email:         'Sales@falcons.sa',
  phone:         '+966 53 370 4233',
  website:       'www.falcons.sa',
  bank: {
    bank_name:   'Saudi National Bank (SNB)',
    account_name:'Team Falcons LLC',
    iban:        'SA00 0000 0000 0000 0000 0000',  // TODO replace
    swift:       'NCBKSAJEXXX',                    // TODO replace
    currency_acct: 'SAR / USD multi-currency',
  },
};

// ─── Default terms (override by adding `terms` JSON to the quote later) ─────
const DEFAULT_TERMS = [
  { title: 'Validity', body: 'This quotation is valid for 30 days from the issue date. Pricing is subject to talent availability at booking time.' },
  { title: 'Payment terms', body: '50% upon signature; 50% upon content delivery. Net 14 days from invoice date. Bank transfer or letter of credit accepted.' },
  { title: 'VAT', body: 'All amounts are exclusive of 15% Saudi VAT unless explicitly noted. VAT will be applied per current regulations on the issued invoice.' },
  { title: 'Content rights', body: 'Organic content remains property of Team Falcons. Paid usage rights, exclusivity, and whitelisting are scoped per add-on; durations begin on first publication.' },
  { title: 'Cancellation', body: 'Cancellation within 7 days of go-live: 50% kill fee. Within 48 hours: 100% kill fee. Force majeure clauses apply.' },
  { title: 'Confidentiality', body: 'This quotation and all rates contained herein are confidential. Onward distribution requires written consent.' },
];

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

  const visible = ['sent_to_client', 'client_approved', 'client_rejected', 'closed_won'].includes(quote.status);

  if (visible) {
    const now = new Date().toISOString();
    void supabase.from('quotes').update({
      viewed_at: quote.viewed_at ?? now, last_viewed_at: now,
      viewed_count: (quote.viewed_count ?? 0) + 1,
    }).eq('id', quote.id).then(() => null);

    if (!quote.viewed_at) {
      void supabase.from('audit_log').insert({
        actor_email: 'client@portal', actor_kind: 'system',
        action: 'quote.client.viewed', entity_type: 'quote', entity_id: quote.id,
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
  const issueDate = quote.sent_at ? new Date(quote.sent_at) : new Date(quote.created_at);
  const validUntil = new Date(issueDate); validUntil.setDate(validUntil.getDate() + 30);
  const fmtDate = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <PublicShell>
      <div className="max-w-5xl mx-auto">
        {/* ─── HERO with real Falcons branding ──────────────────────── */}
        <div className="card overflow-hidden mb-6 print:shadow-none">
          <div className="bg-navy text-white px-8 py-7 relative">
            <div className="flex items-start justify-between gap-6 mb-6">
              <div className="flex items-center gap-3">
                <img src="/team-falcons-logo.png" alt="Team Falcons" className="h-12 w-auto object-contain" />
                <div>
                  <div className="text-white/60 text-[10px] uppercase tracking-[0.2em]">Official Quotation</div>
                  <div className="font-bold text-lg leading-none mt-1">{FALCONS.trading_name}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white/60 text-[10px] uppercase tracking-wider">Quote No.</div>
                <div className="font-mono text-base text-gold">{quote.quote_number}</div>
              </div>
            </div>

            <h1 className="text-2xl font-semibold mt-2">{quote.client_name}</h1>
            {quote.campaign && <div className="text-white/70 text-sm mt-1">{quote.campaign}</div>}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10 text-sm">
              <div>
                <div className="text-white/60 text-[10px] uppercase tracking-wider">Issued</div>
                <div className="font-medium mt-0.5">{fmtDate(issueDate)}</div>
              </div>
              <div>
                <div className="text-white/60 text-[10px] uppercase tracking-wider">Valid until</div>
                <div className="font-medium mt-0.5">{fmtDate(validUntil)}</div>
              </div>
              <div>
                <div className="text-white/60 text-[10px] uppercase tracking-wider">Currency</div>
                <div className="font-medium mt-0.5">{quote.currency}</div>
              </div>
              <div>
                <div className="text-white/60 text-[10px] uppercase tracking-wider">Status</div>
                <div className="font-medium mt-0.5">{statusLabel(quote.status)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── FROM / TO bar (official quotation pattern) ─────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="card card-p">
            <div className="text-[10px] uppercase tracking-wider text-mute font-bold mb-3">From</div>
            <div className="font-semibold text-ink">{FALCONS.legal_name}</div>
            <div className="text-xs text-label mt-1 space-y-0.5">
              {FALCONS.address_lines.map(l => <div key={l}>{l}</div>)}
            </div>
            <div className="mt-3 pt-3 border-t border-line text-xs space-y-1">
              <div className="flex items-center gap-2 text-label"><Building2 size={11} /> {FALCONS.cr_number}</div>
              <div className="flex items-center gap-2 text-label"><FileText size={11} /> {FALCONS.vat_number}</div>
              <div className="flex items-center gap-2 text-label"><Mail size={11} /> {FALCONS.email}</div>
              <div className="flex items-center gap-2 text-label"><Phone size={11} /> {FALCONS.phone}</div>
            </div>
          </div>
          <div className="card card-p">
            <div className="text-[10px] uppercase tracking-wider text-mute font-bold mb-3">Billed to</div>
            <div className="font-semibold text-ink">{quote.client_name}</div>
            {quote.client_email && (
              <div className="text-xs text-label mt-1 flex items-center gap-2"><Mail size={11} /> {quote.client_email}</div>
            )}
            {quote.campaign && (
              <div className="text-xs text-label mt-1">Campaign: {quote.campaign}</div>
            )}
            <div className="mt-3 pt-3 border-t border-line text-[11px] text-mute italic leading-relaxed">
              Please confirm your billing details below. Required for invoice issuance:
              legal name, CR number, VAT number, billing address, and authorised signer.
            </div>
          </div>
        </div>

        {/* ─── LINE ITEMS ───────────────────────────────────────────── */}
        <div className="card overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-line flex items-center justify-between">
            <h2 className="font-semibold text-ink">Line items</h2>
            <div className="text-xs text-mute">{(lines || []).length} deliverable{(lines || []).length === 1 ? '' : 's'}</div>
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
                    <span className="text-greenDark">+{fmtPct(a.uplift_pct, 0)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ─── NOTES + TOTALS ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="md:col-span-2 card card-p">
            <h3 className="font-semibold mb-3">Notes from your account manager</h3>
            <p className="text-sm text-ink whitespace-pre-wrap">
              {quote.notes || 'No additional notes for this quotation.'}
            </p>
            {quote.prepared_by_name && (
              <div className="mt-4 pt-4 border-t border-line text-xs text-label">
                <div>Prepared by: <strong className="text-ink">{quote.prepared_by_name}</strong>{quote.prepared_by_title ? `, ${quote.prepared_by_title}` : ''}</div>
                {quote.prepared_by_email && <div className="mt-0.5"><a href={`mailto:${quote.prepared_by_email}`} className="text-greenDark hover:underline">{quote.prepared_by_email}</a></div>}
              </div>
            )}
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

        {/* ─── BANK DETAILS for transfer ─────────────────────────────── */}
        <div className="card card-p mb-6">
          <div className="flex items-start gap-3">
            <ShieldCheck size={18} className="text-greenDark mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-ink mb-2">Bank transfer details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                <Field label="Bank" value={FALCONS.bank.bank_name} />
                <Field label="Account name" value={FALCONS.bank.account_name} />
                <Field label="IBAN" value={FALCONS.bank.iban} mono />
                <Field label="SWIFT / BIC" value={FALCONS.bank.swift} mono />
                <Field label="Account currency" value={FALCONS.bank.currency_acct} />
                <Field label="Reference" value={`Quote ${quote.quote_number}`} mono />
              </div>
              <div className="mt-3 text-[11px] text-mute italic">
                Use the quote number above as the payment reference. Wires received without a reference may be delayed for reconciliation.
              </div>
            </div>
          </div>
        </div>

        {/* ─── TERMS & CONDITIONS ───────────────────────────────────── */}
        <div className="card card-p mb-6">
          <h3 className="font-semibold text-ink mb-4">Terms &amp; Conditions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {DEFAULT_TERMS.map(t => (
              <div key={t.title} className="border-l-2 border-greenDark/30 pl-3 py-1">
                <div className="font-bold text-ink mb-1">{t.title}</div>
                <p className="text-label leading-relaxed">{t.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ─── CLIENT RESPONSE / SIGNATURE ──────────────────────────── */}
        {quote.status === 'sent_to_client' && !responded ? (
          <ClientResponse token={params.token} />
        ) : responded ? (
          <div className="card card-p">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <div className="text-xs text-label uppercase tracking-wider mb-2">Client response</div>
                <div className="text-lg font-semibold text-ink">
                  {quote.client_response === 'approved' ? '✓ Approved' :
                   quote.client_response === 'rejected' ? '✗ Rejected' :
                   statusLabel(quote.status)}
                </div>
                {quote.accepted_by_name && (
                  <div className="text-sm text-label mt-1">By {quote.accepted_by_name}</div>
                )}
                {quote.client_responded_at && (
                  <div className="text-xs text-mute mt-1">
                    {new Date(quote.client_responded_at).toLocaleString('en-GB')}
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs text-label uppercase tracking-wider mb-2">Falcons confirmation</div>
                <div className="text-sm text-ink">
                  {quote.prepared_by_name || 'Team Falcons'}
                  {quote.prepared_by_title ? `, ${quote.prepared_by_title}` : ''}
                </div>
                <div className="text-xs text-mute mt-1">{FALCONS.email}</div>
              </div>
            </div>
          </div>
        ) : null}

        {/* ─── FOOTER ───────────────────────────────────────────────── */}
        <div className="text-center text-[10px] text-mute mt-8 mb-4 leading-relaxed">
          {FALCONS.legal_name} · {FALCONS.cr_number} · {FALCONS.vat_number}<br />
          {FALCONS.address_lines.join(' · ')} · {FALCONS.email} · {FALCONS.phone}<br />
          <span className="text-[9px]">Generated by Team Falcons Pricing OS · Quote {quote.quote_number} · {new Date().toLocaleDateString('en-GB')}</span>
        </div>
      </div>
    </PublicShell>
  );
}

function PublicShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-bg p-4 sm:p-6">{children}</div>;
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-label">{label}</span>
      <span className={bold ? 'font-bold text-ink text-base' : 'text-ink'}>{value}</span>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-mute font-bold">{label}</div>
      <div className={['text-ink', mono ? 'font-mono text-[11px]' : 'text-xs'].join(' ')}>{value}</div>
    </div>
  );
}
