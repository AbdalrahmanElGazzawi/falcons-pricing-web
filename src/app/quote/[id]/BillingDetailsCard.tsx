'use client';
import { Building2, Mail, Phone, MapPin, FileText, Hash, Calendar, Wallet, Copy, Check } from 'lucide-react';
import { useState } from 'react';

type Billing = {
  signer_title?: string | null;
  signer_phone?: string | null;
  legal_name?: string | null;
  cr_number?: string | null;
  vat_number?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  po_number?: string | null;
  payment_terms?: string | null;
  captured_at?: string | null;
};

/**
 * Card surfaced on /quote/[id] AFTER the client has accepted and submitted
 * billing details. Finance team uses this to issue the official invoice —
 * everything they need lives in one block, copy-buttons on every field.
 */
export function BillingDetailsCard({ billing, acceptedByName, acceptedByEmail }: {
  billing: Billing;
  acceptedByName?: string | null;
  acceptedByEmail?: string | null;
}) {
  return (
    <div className="card card-p border-l-4 border-l-greenDark">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-greenDark font-bold mb-1">
            For finance · Issue invoice using
          </div>
          <h2 className="font-semibold text-ink flex items-center gap-2">
            <Building2 size={16} /> Client billing details
          </h2>
        </div>
        {billing.captured_at && (
          <div className="text-[10px] text-mute text-right">
            <div>Captured</div>
            <div className="font-medium">{new Date(billing.captured_at).toLocaleString('en-GB')}</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <Field icon={Building2} label="Legal company name" value={billing.legal_name} highlight />
        <Field icon={Hash} label="CR / Commercial Reg." value={billing.cr_number} mono />
        <Field icon={FileText} label="VAT number" value={billing.vat_number} mono />
        <Field icon={Hash} label="PO number" value={billing.po_number} mono />
        <Field icon={MapPin} label="Billing address" value={billing.address}
               extra={[billing.city, billing.country].filter(Boolean).join(', ')}
               wide />
        <Field icon={Calendar} label="Payment terms" value={billing.payment_terms} highlight />
      </div>

      <div className="mt-4 pt-4 border-t border-line">
        <div className="text-[10px] uppercase tracking-wider text-mute font-bold mb-2">Authorised signer</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <Field icon={Building2} label="Name" value={acceptedByName ?? null} />
          <Field icon={FileText} label="Title" value={billing.signer_title} />
          <Field icon={Mail} label="Email" value={acceptedByEmail ?? null} mono />
          <Field icon={Phone} label="Phone" value={billing.signer_phone} mono />
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, value, mono, highlight, extra, wide }: {
  icon: any; label: string; value?: string | null; mono?: boolean; highlight?: boolean; extra?: string; wide?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  if (!value) return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-mute font-bold mb-1">
        <Icon size={11} /> {label}
      </div>
      <div className="text-mute italic text-xs">— not provided</div>
    </div>
  );
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-mute font-bold mb-1">
        <Icon size={11} /> {label}
      </div>
      <div className="flex items-center gap-2 group">
        <span className={[
          highlight ? 'font-bold text-ink' : 'text-ink',
          mono ? 'font-mono text-xs' : '',
        ].join(' ')}>{value}</span>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="opacity-0 group-hover:opacity-100 transition text-mute hover:text-greenDark"
          title="Copy"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      </div>
      {extra && <div className="text-xs text-label mt-0.5">{extra}</div>}
    </div>
  );
}
