'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { Save } from 'lucide-react';

export function InquiryForm() {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  // Required
  const [brand, setBrand] = useState('');
  // Optional
  const [agency, setAgency] = useState('');
  const [campaign, setCampaign] = useState('');
  const [source, setSource] = useState('email');
  const [sourceHandle, setSourceHandle] = useState('');
  const [region, setRegion] = useState('');
  const [type, setType] = useState<'brand' | 'press' | 'partnership' | 'other'>('brand');
  const [talents, setTalents] = useState('');
  const [deliverables, setDeliverables] = useState('');
  const [budgetHint, setBudgetHint] = useState('');
  const [body, setBody] = useState('');

  async function save() {
    if (!brand.trim()) { toast.error('Brand required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: brand.trim(),
          agency: agency.trim() || null,
          campaign: campaign.trim() || null,
          source,
          source_handle: sourceHandle.trim() || null,
          region: region.trim() || null,
          type,
          talents: talents.split(',').map(s => s.trim()).filter(Boolean),
          deliverables: deliverables.trim() || null,
          budget_hint: budgetHint.trim() || null,
          body: body.trim() || null,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Save failed');
      toast.success('Inquiry logged', j.inquiry_number);
      router.push(`/inquiries/${j.id}`);
    } catch (e: any) {
      toast.error('Save failed', e.message);
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr,360px] gap-6 items-start">
      <div className="card card-p space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Brand *</label>
            <input value={brand} onChange={e => setBrand(e.target.value)} className="input" placeholder="e.g. Axe" />
          </div>
          <div>
            <label className="label">Agency (optional)</label>
            <input value={agency} onChange={e => setAgency(e.target.value)} className="input" placeholder="e.g. HuManagement" />
          </div>
          <div>
            <label className="label">Campaign</label>
            <input value={campaign} onChange={e => setCampaign(e.target.value)} className="input" placeholder="e.g. Axe x FIFA WC 2026" />
          </div>
          <div>
            <label className="label">Region</label>
            <input value={region} onChange={e => setRegion(e.target.value)} className="input" placeholder="MENA / Global / GCC" />
          </div>
          <div>
            <label className="label">Source channel</label>
            <select value={source} onChange={e => setSource(e.target.value)} className="input">
              <option value="email">Email</option>
              <option value="instagram">Instagram</option>
              <option value="twitter">X / Twitter</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="tiktok">TikTok</option>
              <option value="discord">Discord</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="label">From (handle / email)</label>
            <input value={sourceHandle} onChange={e => setSourceHandle(e.target.value)} className="input" placeholder="@andini  /  Salwa@hu.management" />
          </div>
          <div>
            <label className="label">Type</label>
            <select value={type} onChange={e => setType(e.target.value as any)} className="input">
              <option value="brand">Brand campaign (paid)</option>
              <option value="press">Press / media interview</option>
              <option value="partnership">Long-term partnership / affiliate</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="label">Budget hint (free text)</label>
            <input value={budgetHint} onChange={e => setBudgetHint(e.target.value)} className="input" placeholder="$1,000+ / PHP 450K / TBD" />
          </div>
        </div>

        <div>
          <label className="label">Talents requested (comma-separated, optional)</label>
          <input value={talents} onChange={e => setTalents(e.target.value)} className="input" placeholder="Peterbot, Spy, K22N8" />
        </div>

        <div>
          <label className="label">Deliverables asked for</label>
          <textarea
            value={deliverables}
            onChange={e => setDeliverables(e.target.value)}
            rows={2}
            className="input resize-none"
            placeholder="3x IG Reel (mirrored on TikTok), 3x IG Story, 2-month usage rights"
          />
        </div>

        <div>
          <label className="label">Original message (paste it)</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={8}
            className="input resize-y"
            placeholder="Paste the email / DM / WhatsApp text here so the original wording is preserved."
          />
        </div>
      </div>

      <aside className="lg:sticky lg:top-6 space-y-3">
        <div className="card card-p">
          <div className="kpi-label mb-2">Quick tips</div>
          <ul className="text-xs text-label space-y-2 leading-relaxed">
            <li>• Just <strong className="text-ink">Brand</strong> is required — log it now and fill the rest later.</li>
            <li>• Pasting the original message preserves wording for audit (useful when the brand changes their ask later).</li>
            <li>• Pick <strong className="text-ink">Type</strong> carefully — Press inquiries don't need quotes, they need a comms response.</li>
            <li>• Once logged, you can transition status (Open → Replied → Quoted → Won/Lost/Declined) from the detail page.</li>
          </ul>
        </div>
        <button onClick={save} disabled={saving || !brand.trim()}
          className="btn btn-primary w-full justify-center disabled:opacity-50">
          <Save size={14} /> {saving ? 'Saving…' : 'Save inquiry'}
        </button>
      </aside>
    </div>
  );
}
