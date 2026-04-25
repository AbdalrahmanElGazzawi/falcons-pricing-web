import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff, isSuperAdminEmail } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { fmtMoney, fmtPct, statusColor, statusLabel } from '@/lib/utils';
import { QuoteActions } from './QuoteActions';
import { ArrowLeft, Download, ExternalLink, Copy } from 'lucide-react';
import { ShareLinkBox } from './ShareLinkBox';
import { EngagementCard } from './EngagementCard';

export const dynamic = 'force-dynamic';

export default async function QuoteDetail({ params }: { params: { id: string } }) {
  const { denied, profile, supabase } = await requireStaff();
  if (denied) return <AccessDenied />;

  const { data: quote } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!quote) notFound();

  const { data: lines } = await supabase
    .from('quote_lines')
    .select('*')
    .eq('quote_id', quote.id)
    .order('sort_order');

  const { data: addons } = await supabase
    .from('quote_addons')
    .select('addon_id, uplift_pct, addons(label)')
    .eq('quote_id', quote.id);

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <Link href="/quotes" className="inline-flex items-center gap-1 text-sm text-label hover:text-ink mb-3">
        <ArrowLeft size={14} /> Quote Log
      </Link>

      <PageHeader
        title={quote.quote_number}
        subtitle={`${quote.client_name}${quote.campaign ? ` · ${quote.campaign}` : ''}`}
        action={
          <div className="flex items-center gap-2">
            <span className={`chip ${statusColor(quote.status)} text-sm`}>{statusLabel(quote.status)}</span>
            <a href={`/client/${quote.client_token}`} className="btn btn-ghost" target="_blank" rel="noreferrer" title="View as client">
              <ExternalLink size={14} /> Preview quotation
            </a>
            <a href={`/api/quote/${quote.id}/pdf`} className="btn btn-primary" target="_blank" rel="noreferrer">
              <Download size={14} /> Download PDF
            </a>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {/* Header card */}
          <div className="card card-p">
            <h2 className="font-semibold mb-4">Details</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Field label="Client" value={quote.client_name} />
              <Field label="Client email" value={quote.client_email || '—'} />
              <Field label="Campaign" value={quote.campaign || '—'} />
              <Field label="Owner" value={quote.owner_email || '—'} />
              <Field label="Currency" value={quote.currency} />
              <Field label="VAT" value={fmtPct(quote.vat_rate, 0)} />
              <Field label="Created" value={new Date(quote.created_at).toLocaleString('en-GB')} />
              <Field label="Last update" value={new Date(quote.updated_at).toLocaleString('en-GB')} />
            </div>
          </div>

          {/* Axes */}
          <div className="card card-p">
            <h2 className="font-semibold mb-4">Pricing axes</h2>
            <div className="grid grid-cols-4 gap-x-6 gap-y-3 text-sm">
              <Field label="Content type" value={`×${quote.content_type_factor}`} />
              <Field label="Engagement" value={`×${quote.eng_factor}`} />
              <Field label="Audience" value={`×${quote.audience_factor}`} />
              <Field label="Seasonality" value={`×${quote.seasonality_factor}`} />
              <Field label="Language" value={`×${quote.language_factor}`} />
              <Field label="Authority" value={`×${quote.authority_factor}`} />
              <Field label="Objective wt" value={`${quote.objective_weight}`} />
              <Field label="Confidence" value={String(quote.measurement_confidence).replace(/^\w/, c => c.toUpperCase())} />
            </div>
          </div>

          {/* Lines */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-line">
              <h2 className="font-semibold">Lines ({lines?.length ?? 0})</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-label uppercase tracking-wide bg-bg">
                  <th className="px-4 py-3">Talent</th>
                  <th className="px-4 py-3">Platform</th>
                  <th className="px-4 py-3 text-right">Base</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Unit</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {(lines || []).map(l => (
                  <tr key={l.id} className="border-t border-line">
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">{l.talent_name}</div>
                      <div className="text-xs text-mute capitalize">{l.talent_type}</div>
                    </td>
                    <td className="px-4 py-3">{l.platform}</td>
                    <td className="px-4 py-3 text-right text-label">{fmtMoney(l.base_rate, quote.currency)}</td>
                    <td className="px-4 py-3 text-right">{l.qty}</td>
                    <td className="px-4 py-3 text-right">{fmtMoney(l.final_unit, quote.currency)}</td>
                    <td className="px-4 py-3 text-right font-medium">{fmtMoney(l.final_amount, quote.currency)}</td>
                  </tr>
                ))}
                {(!lines || lines.length === 0) && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-label">No lines.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Add-ons */}
          {addons && addons.length > 0 && (
            <div className="card card-p">
              <h2 className="font-semibold mb-4">Add-on rights</h2>
              <ul className="space-y-1 text-sm">
                {addons.map((a: any) => (
                  <li key={a.addon_id} className="flex justify-between">
                    <span className="text-ink">{a.addons?.label || `Addon #${a.addon_id}`}</span>
                    <span className="text-green">+{fmtPct(a.uplift_pct, 0)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Notes */}
          {(quote.notes || quote.internal_notes) && (
            <div className="card card-p">
              <h2 className="font-semibold mb-3">Notes</h2>
              {quote.notes && <p className="text-sm text-ink whitespace-pre-wrap">{quote.notes}</p>}
              {quote.internal_notes && (
                <div className="mt-4 p-3 bg-bg rounded-lg">
                  <div className="text-xs text-label uppercase tracking-wide mb-1">Internal</div>
                  <p className="text-sm text-ink whitespace-pre-wrap">{quote.internal_notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Totals */}
          <div className="card card-p">
            <div className="text-xs text-label uppercase tracking-wide mb-3">Totals</div>
            <div className="space-y-2 text-sm">
              <Row label="Subtotal" value={fmtMoney(quote.subtotal, quote.currency)} />
              {quote.addons_uplift_pct > 0 && (
                <Row label={`Add-on uplift (+${fmtPct(quote.addons_uplift_pct, 0)})`} value="baked into lines" muted />
              )}
              <Row label={`VAT (${fmtPct(quote.vat_rate, 0)})`} value={fmtMoney(quote.vat_amount, quote.currency)} />
              <div className="border-t border-line pt-2 mt-2">
                <Row label="TOTAL" value={fmtMoney(quote.total, quote.currency)} bold />
              </div>
            </div>
          </div>

          {/* Actions */}
          <QuoteActions
            quoteId={quote.id}
            status={quote.status}
            role={profile.role}
            canDelete={isSuperAdminEmail(profile.email)}
          />

          {/* Client engagement (views, accept, decline) */}
          <EngagementCard
            viewedAt={quote.viewed_at}
            lastViewedAt={quote.last_viewed_at}
            viewedCount={quote.viewed_count ?? 0}
            acceptedAt={quote.accepted_at}
            acceptedByName={quote.accepted_by_name}
            acceptedByEmail={quote.accepted_by_email}
            declinedAt={quote.declined_at}
            declineReason={quote.decline_reason}
            status={quote.status}
          />

          {/* Client share */}
          <ShareLinkBox token={quote.client_token} />
        </div>
      </div>
    </Shell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-label">{label}</div>
      <div className="text-ink">{value}</div>
    </div>
  );
}

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? 'text-mute text-xs' : 'text-label'}>{label}</span>
      <span className={bold ? 'font-bold text-ink text-base' : 'text-ink'}>{value}</span>
    </div>
  );
}
