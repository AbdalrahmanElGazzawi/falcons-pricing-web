'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import {
  Mail, Instagram, Twitter, Phone, MessageSquare, Globe,
  CheckCircle2, X as XIcon, Send, Trophy, Frown, Trash2, FileText,
} from 'lucide-react';

type Inquiry = {
  id: string;
  inquiry_number: string;
  source: string;
  source_handle: string | null;
  brand: string;
  agency: string | null;
  campaign: string | null;
  region: string | null;
  talents: string[];
  deliverables: string | null;
  budget_hint: string | null;
  body: string | null;
  type: 'brand' | 'press' | 'partnership' | 'other';
  status: 'open' | 'replied' | 'quoted' | 'won' | 'lost' | 'declined';
  internal_notes: string | null;
  quote_id: string | null;
  created_at: string;
};

const SOURCE_ICON: Record<string, any> = {
  email: Mail, instagram: Instagram, twitter: Twitter, whatsapp: Phone,
  tiktok: MessageSquare, discord: MessageSquare, other: Globe,
};

const STATUS_FLOW: Array<{ status: Inquiry['status']; label: string; icon: any; cls: string }> = [
  { status: 'replied',  label: 'Mark as Replied',  icon: Send,         cls: 'btn-ghost' },
  { status: 'quoted',   label: 'Mark as Quoted',   icon: FileText,     cls: 'btn-primary' },
  { status: 'won',      label: 'Closed-Won',       icon: Trophy,       cls: 'btn-primary' },
  { status: 'lost',     label: 'Closed-Lost',      icon: Frown,        cls: 'btn-ghost' },
  { status: 'declined', label: 'Decline politely', icon: XIcon,        cls: 'btn-ghost' },
];

export function InquiryDetail({ inquiry, linkedQuote, canDelete }: {
  inquiry: Inquiry;
  linkedQuote: { id: string; quote_number: string; status: string } | null;
  canDelete: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState(inquiry.internal_notes || '');

  async function patch(patch: Record<string, any>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/inquiries/${inquiry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Update failed');
      }
      router.refresh();
      toast.success('Saved');
    } catch (e: any) {
      toast.error('Save failed', e.message);
    } finally { setBusy(false); }
  }

  async function deleteIt() {
    if (!confirm(`Delete inquiry ${inquiry.inquiry_number}? This cannot be undone (audit log keeps a record).`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/inquiries/${inquiry.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Delete failed');
      }
      window.location.href = '/inquiries';
    } catch (e: any) {
      toast.error('Delete failed', e.message);
      setBusy(false);
    }
  }

  const SrcIcon = SOURCE_ICON[inquiry.source] || Globe;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-6 items-start">
      <div className="space-y-4">
        {/* Status banner */}
        <div className="card card-p flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="kpi-label">Status</div>
            <div className="text-lg font-semibold text-ink capitalize mt-1">{inquiry.status}</div>
          </div>
          {linkedQuote && (
            <Link href={`/quote/${linkedQuote.id}`} className="text-sm text-greenDark hover:underline flex items-center gap-1.5">
              <FileText size={14} /> Linked to {linkedQuote.quote_number} ({linkedQuote.status})
            </Link>
          )}
        </div>

        {/* Meta block */}
        <div className="card card-p">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <KV label="Brand" value={inquiry.brand} bold />
            {inquiry.agency && <KV label="Agency" value={inquiry.agency} />}
            {inquiry.campaign && <KV label="Campaign" value={inquiry.campaign} />}
            {inquiry.region && <KV label="Region" value={inquiry.region} />}
            <KV label="Source" value={
              <span className="inline-flex items-center gap-1.5">
                <SrcIcon size={12} /> {inquiry.source}{inquiry.source_handle ? ` · ${inquiry.source_handle}` : ''}
              </span>
            } />
            <KV label="Type" value={<span className="capitalize">{inquiry.type}</span>} />
            {inquiry.budget_hint && <KV label="Budget hint" value={inquiry.budget_hint} />}
            {inquiry.talents && inquiry.talents.length > 0 && (
              <KV label="Talents requested" value={inquiry.talents.join(', ')} />
            )}
            {inquiry.deliverables && (
              <div className="sm:col-span-2">
                <div className="kpi-label">Deliverables asked for</div>
                <div className="text-sm text-ink mt-1 whitespace-pre-wrap">{inquiry.deliverables}</div>
              </div>
            )}
          </div>
        </div>

        {/* Original message */}
        {inquiry.body && (
          <div className="card card-p">
            <div className="kpi-label mb-2">Original message</div>
            <pre className="text-xs text-ink whitespace-pre-wrap font-sans leading-relaxed">{inquiry.body}</pre>
          </div>
        )}

        {/* Internal notes */}
        <div className="card card-p">
          <label className="label">Internal notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onBlur={() => notes !== (inquiry.internal_notes || '') && patch({ internal_notes: notes })}
            rows={3}
            className="input resize-y"
            placeholder="Triage notes, who's owning this, follow-up reminders…"
          />
        </div>
      </div>

      {/* Workflow rail */}
      <aside className="lg:sticky lg:top-6 space-y-3">
        <div className="card card-p">
          <div className="text-xs text-label uppercase tracking-wide mb-3">Workflow</div>
          <div className="flex flex-col gap-2">
            {STATUS_FLOW.filter(t => t.status !== inquiry.status).map(t => {
              const Icon = t.icon;
              return (
                <button key={t.status} disabled={busy}
                  onClick={() => patch({ status: t.status })}
                  className={`btn ${t.cls} w-full justify-center text-sm disabled:opacity-50`}>
                  <Icon size={14} /> {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="card card-p">
          <div className="text-xs text-label uppercase tracking-wide mb-2">Build quote</div>
          <p className="text-xs text-mute mb-3">
            Use the inquiry as a starting point — the quote builder opens with the campaign name pre-filled.
          </p>
          <Link
            href={`/quote/new?brand=${encodeURIComponent(inquiry.brand)}&campaign=${encodeURIComponent(inquiry.campaign || inquiry.brand)}&fromInquiry=${inquiry.id}`}
            className="btn btn-primary w-full justify-center text-sm"
          >
            <FileText size={14} /> Build quote from this
          </Link>
        </div>

        {canDelete && (
          <div className="card card-p">
            <div className="text-[10px] uppercase tracking-wider text-mute mb-2">Super admin</div>
            <button onClick={deleteIt} disabled={busy}
              className="btn btn-danger w-full justify-center text-sm disabled:opacity-50">
              <Trash2 size={14} /> Delete inquiry
            </button>
          </div>
        )}

        <div className="text-xs text-mute text-center">
          Logged {new Date(inquiry.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      </aside>
    </div>
  );
}

function KV({ label, value, bold }: { label: string; value: React.ReactNode; bold?: boolean }) {
  return (
    <div>
      <div className="kpi-label">{label}</div>
      <div className={`text-sm mt-0.5 ${bold ? 'font-semibold text-ink' : 'text-ink'}`}>{value}</div>
    </div>
  );
}
