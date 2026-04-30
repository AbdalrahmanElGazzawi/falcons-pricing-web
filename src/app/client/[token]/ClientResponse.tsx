'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Building2 } from 'lucide-react';

export function ClientResponse({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [decision, setDecision] = useState<'approved' | 'rejected' | null>(null);

  // Required: signer
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Required for invoice (only on approval)
  const [legalName, setLegalName] = useState('');
  const [crNumber, setCrNumber] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingCountry, setBillingCountry] = useState('Saudi Arabia');
  const [poNumber, setPoNumber] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('50/50');

  const [comment, setComment] = useState('');
  const [agree, setAgree] = useState(false);

  async function submit(d: 'approved' | 'rejected') {
    setErr(null);
    if (!name.trim()) {
      setErr('Please enter your full name to record your decision.');
      return;
    }
    if (d === 'approved') {
      if (!agree) {
        setErr('Please confirm that you have authority to accept on behalf of the client and agree to the terms.');
        return;
      }
      if (!legalName.trim() || !billingAddress.trim()) {
        setErr('Legal company name and billing address are required for invoice issuance.');
        return;
      }
    }
    setDecision(d);
    setBusy(true);
    try {
      const res = await fetch(`/api/client/${token}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: d,
          name: name.trim(),
          email: email.trim() || null,
          comment: comment.trim() || null,
          // Invoice details (sent only on approval; backend should persist)
          billing: d === 'approved' ? {
            signer_title: title.trim() || null,
            signer_phone: phone.trim() || null,
            legal_name:   legalName.trim(),
            cr_number:    crNumber.trim() || null,
            vat_number:   vatNumber.trim() || null,
            address:      billingAddress.trim(),
            city:         billingCity.trim() || null,
            country:      billingCountry.trim() || null,
            po_number:    poNumber.trim() || null,
            payment_terms: paymentTerms,
          } : null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Submission failed');
      }
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="card card-p">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-greenSoft text-greenDark grid place-items-center flex-shrink-0">
          <Check size={18} />
        </div>
        <div>
          <h3 className="font-semibold text-ink">Your response</h3>
          <p className="text-sm text-label mt-0.5">
            Please confirm whether you'd like to proceed. If accepting, complete the billing details
            below — required by our finance team to issue the invoice.
          </p>
        </div>
      </div>

      {/* ─── Signer block (required either way) ─────────────────── */}
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-wider text-mute font-bold mb-2">Authorised signer</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Full name <span className="text-red-500">*</span></label>
            <input value={name} onChange={e => setName(e.target.value)} className="input" placeholder="e.g. Sarah Johnson" required />
          </div>
          <div>
            <label className="label">Title / role</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="input" placeholder="e.g. Marketing Director" />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="sarah@brand.com" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} className="input" placeholder="+966 5x xxx xxxx" />
          </div>
        </div>
      </div>

      {/* ─── Billing block (required on approval) ──────────────── */}
      <div className="mb-4 pt-4 border-t border-line">
        <div className="flex items-center gap-2 mb-2">
          <Building2 size={12} className="text-mute" />
          <div className="text-[10px] uppercase tracking-wider text-mute font-bold">Billing details (for invoice)</div>
        </div>
        <p className="text-[11px] text-mute mb-3 leading-relaxed">
          Required by our finance team to issue the official tax invoice. Skip if declining.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="label">Legal company name <span className="text-red-500">*</span></label>
            <input value={legalName} onChange={e => setLegalName(e.target.value)} className="input" placeholder="e.g. Brand Holdings LLC" />
          </div>
          <div>
            <label className="label">CR / Commercial Registration</label>
            <input value={crNumber} onChange={e => setCrNumber(e.target.value)} className="input" placeholder="e.g. 1010123456" />
          </div>
          <div>
            <label className="label">VAT number</label>
            <input value={vatNumber} onChange={e => setVatNumber(e.target.value)} className="input" placeholder="e.g. 300000000003" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Billing address <span className="text-red-500">*</span></label>
            <input value={billingAddress} onChange={e => setBillingAddress(e.target.value)} className="input" placeholder="Street, building, floor" />
          </div>
          <div>
            <label className="label">City</label>
            <input value={billingCity} onChange={e => setBillingCity(e.target.value)} className="input" placeholder="Riyadh" />
          </div>
          <div>
            <label className="label">Country</label>
            <input value={billingCountry} onChange={e => setBillingCountry(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">PO number (if applicable)</label>
            <input value={poNumber} onChange={e => setPoNumber(e.target.value)} className="input" placeholder="Internal PO reference" />
          </div>
          <div>
            <label className="label">Payment terms</label>
            <select value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} className="input">
              <option value="50/50">50% upfront / 50% on delivery (default)</option>
              <option value="100% upfront">100% upfront</option>
              <option value="Net 14">Net 14 days from invoice</option>
              <option value="Net 30">Net 30 days from invoice</option>
              <option value="Custom">Custom — discuss with account manager</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── Optional comment ───────────────────────────────────── */}
      <div className="mb-4">
        <label className="label">Comment (optional)</label>
        <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
          className="input resize-none"
          placeholder="Preferred go-live date, edits required, special requests…" />
      </div>

      {/* ─── Authority confirmation ─────────────────────────────── */}
      <label className="flex items-start gap-2 text-sm text-label mb-4 cursor-pointer">
        <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} className="mt-0.5" />
        <span>
          I confirm that I have authority to accept this quotation on behalf of the named client,
          agree to the terms &amp; conditions presented, and authorise Team Falcons to issue an
          official tax invoice using the billing details above.
        </span>
      </label>

      {/* ─── Action buttons ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button onClick={() => submit('approved')} disabled={busy}
          className="btn btn-primary flex-1 justify-center">
          <Check size={16} /> {busy && decision === 'approved' ? 'Recording…' : 'Accept quotation'}
        </button>
        <button onClick={() => submit('rejected')} disabled={busy}
          className="btn btn-ghost flex-1 justify-center">
          <X size={16} /> {busy && decision === 'rejected' ? 'Recording…' : 'Decline'}
        </button>
      </div>

      {err && <div className="text-xs text-red-600 mt-3">{err}</div>}

      <p className="text-[10px] text-mute mt-4 leading-relaxed">
        By accepting, you create a digital record with your name, title, billing details, timestamp,
        and IP. This serves as written confirmation alongside the signed agreement and is retained
        in the Falcons audit log per our records-retention policy.
      </p>
    </div>
  );
}
