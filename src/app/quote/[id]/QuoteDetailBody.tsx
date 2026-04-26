'use client';
import { useMemo } from 'react';
import { ExternalLink, Download, AlertTriangle, AlertCircle } from 'lucide-react';
import { fmtCurrency, fmtPct, statusColor, statusLabel } from '@/lib/utils';
import { useDisplayCurrency } from '@/lib/use-display-currency';
import { QuoteActions } from './QuoteActions';
import { ShareLinkBox } from './ShareLinkBox';
import { EngagementCard } from './EngagementCard';

/**
 * Client-side body of /quote/[id]. Holds the SAR/USD pill state and routes
 * EVERY money render through fmtCurrency(sar, ccy, usd_rate). Quotes are
 * stored canonically in SAR; this layer is presentation-only.
 *
 * The pill writes to localStorage so flipping currency on one quote (or
 * elsewhere in the app) persists across pages — management can pick a
 * currency once and the demo stays consistent.
 */
export function QuoteDetailBody({
  quote, lines, addons, profile, canDelete,
}: {
  quote: any;
  lines: any[];
  addons: any[];
  profile: { email: string; full_name?: string; role: string };
  canDelete: boolean;
}) {
  // Shared cross-page currency preference. Defaults to whatever the user
  // picked the last time they toggled the pill anywhere in the app.
  const [ccy, setCcy] = useDisplayCurrency();

  const usdRate = Number(quote.usd_rate) > 0 ? Number(quote.usd_rate) : 3.75;
  const M = (sar: number) => fmtCurrency(Number(sar) || 0, ccy, usdRate);

  // ── Defensive validation. World best practice: surface what's wrong before
  // the rep sends to a client, never silently price something at 0.
  const validation = useMemo(() => {
    const issues: Array<{ severity: 'error' | 'warn'; message: string }> = [];
    if (!lines || lines.length === 0) {
      issues.push({ severity: 'error', message: 'This quote has no line items.' });
    }
    const zeroBase = (lines || []).filter(l => Number(l.base_rate) === 0);
    if (zeroBase.length) {
      issues.push({
        severity: 'error',
        message: `${zeroBase.length} line${zeroBase.length === 1 ? '' : 's'} have a base rate of 0 — talent likely doesn't have a rate set for that platform: ${zeroBase.map((l: any) => `${l.talent_name} / ${l.platform}`).join(', ')}.`,
      });
    }
    const zeroFinal = (lines || []).filter(l => Number(l.final_amount) === 0 && Number(l.base_rate) > 0);
    if (zeroFinal.length) {
      issues.push({
        severity: 'error',
        message: `${zeroFinal.length} line${zeroFinal.length === 1 ? '' : 's'} priced at 0 despite a non-zero base — check axes.`,
      });
    }
    if (quote.measurement_confidence === 'pending') {
      issues.push({
        severity: 'warn',
        message: "Measurement confidence is 'pending' — pricing engine applied a 0.75× cap. Set a higher confidence after roster data is verified.",
      });
    }
    const allNeutral =
      Number(quote.eng_factor) === 1 && Number(quote.audience_factor) === 1 &&
      Number(quote.seasonality_factor) === 1 && Number(quote.content_type_factor) === 1 &&
      Number(quote.language_factor) === 1 && Number(quote.authority_factor) === 1;
    if (allNeutral) {
      issues.push({
        severity: 'warn',
        message: 'All campaign axes are at 1.00× (neutral). The Brand Brief may not have been filled in — review on the Campaign tab before sending.',
      });
    }
    const subtotalNum = Number(quote.subtotal) || 0;
    const totalNum = Number(quote.total) || 0;
    if (totalNum < subtotalNum) {
      issues.push({
        severity: 'error',
        message: 'Total is less than subtotal — the saved totals may be stale. Re-save this quote.',
      });
    }
    return issues;
  }, [lines, quote]);

  const errorCount = validation.filter(v => v.severity === 'error').length;
  const warnCount  = validation.filter(v => v.severity === 'warn').length;

  return (
    <>
      {/* Header action bar (currency pill + PDF + preview) */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className={`chip ${statusColor(quote.status)} text-sm`}>{statusLabel(quote.status)}</span>
        <a href={`/client/${quote.client_token}`} className="btn btn-ghost" target="_blank" rel="noreferrer" title="View as client">
          <ExternalLink size={14} /> Preview quotation
        </a>
        <CurrencyPill ccy={ccy} setCcy={setCcy} />
        <a
          href={`/api/quote/${quote.id}/pdf?ccy=${ccy}`}
          target="_blank"
          rel="noreferrer"
          className="btn btn-primary"
          title={`Download as ${ccy}`}
        >
          <Download size={14} /> Download PDF ({ccy})
        </a>
      </div>

      {/* Validation banner */}
      {validation.length > 0 && (
        <div className="space-y-2 mb-4">
          {validation.map((v, i) => (
            <div
              key={i}
              className={
                'flex items-start gap-2 p-3 rounded-lg border ' +
                (v.severity === 'error'
                  ? 'bg-red-50 border-red-200 text-red-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900')
              }
              role={v.severity === 'error' ? 'alert' : 'status'}
            >
              {v.severity === 'error'
                ? <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                : <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />}
              <div className="text-sm leading-snug">{v.message}</div>
            </div>
          ))}
          <div className="text-[11px] text-mute">
            {errorCount > 0 && <span className="text-red-700 font-semibold mr-2">{errorCount} error{errorCount === 1 ? '' : 's'}</span>}
            {warnCount > 0 && <span className="text-amber-700 font-semibold">{warnCount} warning{warnCount === 1 ? '' : 's'}</span>}
          </div>
        </div>
      )}

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
              <Field label="Currency" value={`${ccy} ${ccy !== quote.currency ? `(stored as ${quote.currency})` : ''}`} />
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
              <Field
                label="Confidence"
                value={String(quote.measurement_confidence).replace(/^\w/, c => c.toUpperCase())}
                warn={quote.measurement_confidence === 'pending'}
              />
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
                    <td className="px-4 py-3"><PlatformLabel platform={l.platform} /></td>
                    <td className="px-4 py-3 text-right text-label">
                      {Number(l.base_rate) === 0
                        ? <span className="text-red-600 font-semibold" title="Talent has no rate set for this platform">no rate</span>
                        : M(l.base_rate)}
                    </td>
                    <td className="px-4 py-3 text-right">{l.qty}</td>
                    <td className="px-4 py-3 text-right">{M(l.final_unit)}</td>
                    <td className="px-4 py-3 text-right font-medium">{M(l.final_amount)}</td>
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
              <Row label="Subtotal" value={M(quote.subtotal)} />
              {quote.addons_uplift_pct > 0 && (
                <Row label={`Add-on uplift (+${fmtPct(quote.addons_uplift_pct, 0)})`} value="baked into lines" muted />
              )}
              <Row label={`VAT (${fmtPct(quote.vat_rate, 0)})`} value={M(quote.vat_amount)} />
              <div className="border-t border-line pt-2 mt-2">
                <Row label="TOTAL" value={M(quote.total)} bold />
              </div>
              {ccy === 'USD' && (
                <div className="text-[10px] text-mute pt-1">
                  Converted from SAR at 1 USD = {usdRate.toFixed(2)} SAR.
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <QuoteActions
            quoteId={quote.id}
            status={quote.status}
            role={profile.role as any}
            canDelete={canDelete}
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
    </>
  );
}

function CurrencyPill({ ccy, setCcy }: { ccy: 'SAR' | 'USD'; setCcy: (v: 'SAR' | 'USD') => void }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-line overflow-hidden bg-white" title="Toggle display currency. SAR is canonical; USD converts at the saved rate.">
      {(['SAR', 'USD'] as const).map((c, i) => (
        <button
          key={c}
          type="button"
          onClick={() => setCcy(c)}
          className={[
            'px-2.5 py-1.5 text-xs font-medium transition',
            i > 0 ? 'border-l border-line' : '',
            ccy === c ? 'bg-green text-white' : 'text-label hover:text-ink',
          ].join(' ')}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

/**
 * Renders a platform label with a coloured "FALCONS" / "CLIENT" chip when
 * the platform name comes from the creator side ambiguous TikTok pair.
 * The original labels (TikTok Our-side / TikTok Client Vids) confused reps;
 * the chip surfaces ownership at a glance.
 */
function PlatformLabel({ platform }: { platform: string }) {
  const p = String(platform || '');
  // Match both old and new labels so historical quotes still render the chip
  const isOurs   = /our[\s-]?side|falcons account/i.test(p);
  const isClient = /client (vids|account)/i.test(p);
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span>{p}</span>
      {isOurs && (
        <span
          className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold bg-red-600 text-white"
          title="Posted on the FALCONS-owned TikTok account. Pricing reflects audience access via Falcons."
        >
          Falcons
        </span>
      )}
      {isClient && (
        <span
          className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold bg-blue-600 text-white"
          title="Posted on the CLIENT brand's TikTok account. Pricing reflects content production + handover."
        >
          Client
        </span>
      )}
    </div>
  );
}

function Field({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <div className="text-xs text-label">{label}</div>
      <div className={warn ? 'text-amber-700 font-semibold' : 'text-ink'}>{value}</div>
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
