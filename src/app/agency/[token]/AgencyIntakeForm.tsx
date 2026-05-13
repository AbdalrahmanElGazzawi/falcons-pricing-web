'use client';

import { useState } from 'react';

type Player = {
  id: number; nickname: string; full_name: string | null;
  game: string | null; team: string | null; role: string | null;
  // Mig 088 — current clause-type record so agency can confirm / amend
  independent_sponsorship_clause_type?: string | null;
  independent_sponsorship_notice_days?: number | null;
  independent_sponsorship_clause_text?: string | null;
  contract_source_doc_link?: string | null;
};
type ContractTerms = {
  clause_type: '' | 'open_with_consent' | 'open_with_notice' | 'pre_approved_categories' | 'schedule_1_carveouts' | 'none';
  notice_days: string;
  clause_text: string;
  source_doc_link: string;
};
function freshTerms(p: Player): ContractTerms {
  return {
    clause_type: (p.independent_sponsorship_clause_type as ContractTerms['clause_type']) || '',
    notice_days: p.independent_sponsorship_notice_days != null ? String(p.independent_sponsorship_notice_days) : '',
    clause_text: p.independent_sponsorship_clause_text || '',
    source_doc_link: p.contract_source_doc_link || '',
  };
}
type Existing = { id: number; talent_id: number; brand: string; brand_parent: string | null; category_id: number; sub_category: string | null; exclusivity_scope: string | null; exclusivity_type: string | null; term_start: string | null; term_end: string | null; status: string };
type Cat = { id: number; code: string; name: string; parent_code: string | null };

type NewCommitment = {
  brand: string; brand_parent: string;
  category_id: number | '';
  sub_category: string;
  exclusivity_scope: string;
  exclusivity_type: string;
  competitor_blocklist: string; // comma-separated
  territory: string;
  term_start: string; term_end: string;
  deal_value_sar: string; currency: string;
  agency_commission_pct_override: string;
  talent_share_pct_override: string;
  flow_model: string; phase_code: string; track_code: string;
  // Best-practice fields (Mig 084)
  rofr: boolean; rofr_window_days: string; rofn: boolean; mfn: boolean;
  image_rights_scope: string; sublicense_allowed: boolean; training_data_use: boolean;
  non_disparagement: boolean; morality_clause: string;
  // Usage rights + obligations
  paid_amplification_allowed: boolean; dark_posts_allowed: boolean;
  irl_appearances_count: string; peripheral_usage_required: boolean;
  source_doc_link: string; notes: string;
};

function freshCommitment(): NewCommitment {
  return {
    brand: '', brand_parent: '', category_id: '', sub_category: '',
    exclusivity_scope: 'Worldwide', exclusivity_type: 'Exclusive',
    competitor_blocklist: '', territory: '',
    term_start: '', term_end: '',
    deal_value_sar: '', currency: 'SAR',
    agency_commission_pct_override: '', talent_share_pct_override: '',
    flow_model: '', phase_code: '', track_code: '',
    rofr: false, rofr_window_days: '', rofn: false, mfn: false,
    image_rights_scope: '', sublicense_allowed: false, training_data_use: false,
    non_disparagement: false, morality_clause: '',
    paid_amplification_allowed: false, dark_posts_allowed: false,
    irl_appearances_count: '', peripheral_usage_required: false,
    source_doc_link: '', notes: '',
  };
}

export default function AgencyIntakeForm({
  token, agencyName, players, existing, categories,
}: { token: string; agencyName: string; players: Player[]; existing: Existing[]; categories: Cat[] }) {
  const [draft, setDraft] = useState<Record<number, NewCommitment[]>>(() => {
    const m: Record<number, NewCommitment[]> = {};
    for (const p of players) m[p.id] = [];
    return m;
  });
  const [terms, setTerms] = useState<Record<number, ContractTerms>>(() => {
    const m: Record<number, ContractTerms> = {};
    for (const p of players) m[p.id] = freshTerms(p);
    return m;
  });
  function setTerm<K extends keyof ContractTerms>(pid: number, k: K, v: ContractTerms[K]) {
    setTerms(s => ({ ...s, [pid]: { ...s[pid], [k]: v } }));
  }
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField<K extends keyof NewCommitment>(pid: number, idx: number, k: K, v: NewCommitment[K]) {
    setDraft(s => {
      const list = (s[pid] || []).slice();
      list[idx] = { ...list[idx], [k]: v };
      return { ...s, [pid]: list };
    });
  }
  function add(pid: number) {
    setDraft(s => ({ ...s, [pid]: [...(s[pid] || []), freshCommitment()] }));
  }
  function remove(pid: number, idx: number) {
    setDraft(s => ({ ...s, [pid]: (s[pid] || []).filter((_, i) => i !== idx) }));
  }

  async function submit() {
    setError(null); setSubmitting(true);
    try {
      // Flatten to a list of {talent_id, ...fields}
      const commitments: any[] = [];
      for (const p of players) {
        for (const c of (draft[p.id] || [])) {
          if (!c.brand.trim() || c.category_id === '') continue;
          commitments.push({
            talent_id: p.id,
            brand: c.brand.trim(),
            brand_parent: c.brand_parent.trim() || null,
            commercial_category_id: Number(c.category_id),
            sub_category: c.sub_category.trim() || null,
            exclusivity_scope: c.exclusivity_scope,
            exclusivity_type: c.exclusivity_type,
            competitor_blocklist: c.competitor_blocklist.split(',').map(s => s.trim()).filter(Boolean),
            territory: c.territory.trim() || null,
            term_start: c.term_start || null,
            term_end: c.term_end || null,
            deal_value_sar: c.deal_value_sar ? Number(c.deal_value_sar) : null,
            currency: c.currency,
            agency_commission_pct_override: c.agency_commission_pct_override ? Number(c.agency_commission_pct_override) : null,
            talent_share_pct_override: c.talent_share_pct_override ? Number(c.talent_share_pct_override) : null,
            flow_model: c.flow_model || null,
            phase_code: c.phase_code || null,
            track_code: c.track_code || null,
            rofr: c.rofr, rofr_window_days: c.rofr_window_days ? Number(c.rofr_window_days) : null,
            rofn: c.rofn, mfn: c.mfn,
            image_rights_scope: c.image_rights_scope.trim() || null,
            sublicense_allowed: c.sublicense_allowed,
            training_data_use: c.training_data_use,
            non_disparagement: c.non_disparagement,
            morality_clause: c.morality_clause.trim() || null,
            paid_amplification_allowed: c.paid_amplification_allowed,
            dark_posts_allowed: c.dark_posts_allowed,
            irl_appearances_count: c.irl_appearances_count ? Number(c.irl_appearances_count) : null,
            peripheral_usage_required: c.peripheral_usage_required,
            source_doc_link: c.source_doc_link.trim() || null,
            notes: c.notes.trim() || null,
          });
        }
      }
      // Pre-compute terms count to short-circuit the validation
      let pendingTermsCount = 0;
      for (const pl of players) {
        const t = terms[pl.id];
        if (!t) continue;
        if (t.clause_type || t.notice_days || t.clause_text.trim() || t.source_doc_link.trim()) pendingTermsCount++;
      }
      if (commitments.length === 0 && pendingTermsCount === 0) {
        setError('Add at least one commitment or contract-terms entry before submitting.');
        setSubmitting(false);
        return;
      }
      // Build contract_terms array per talent (only include filled rows)
      const contract_terms: any[] = [];
      for (const pl of players) {
        const t = terms[pl.id];
        if (!t) continue;
        if (!t.clause_type && !t.notice_days && !t.clause_text.trim() && !t.source_doc_link.trim()) continue;
        contract_terms.push({
          talent_id: pl.id,
          clause_type: t.clause_type || null,
          notice_days: t.notice_days ? Number(t.notice_days) : null,
          clause_text: t.clause_text.trim() || null,
          source_doc_link: t.source_doc_link.trim() || null,
        });
      }

      const r = await fetch(`/api/agency-intake/${token}/submit`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ commitments, contract_terms }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || 'Submission failed'); return; }
      setDone(true);
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-lg border border-emerald-300/40 bg-emerald-500/5 px-4 py-6 text-center">
        <h2 className="text-lg font-semibold text-emerald-700 mb-1">Thank you — submission received</h2>
        <p className="text-sm text-mute">
          Team Falcons commercial has been notified. The data is now live in our collision-check system.
        </p>
      </div>
    );
  }

  const totalDrafted = Object.values(draft).reduce((s, list) => s + list.length, 0);

  return (
    <div className="space-y-6">
      {players.map((p) => {
        const existingForPlayer = existing.filter(e => e.talent_id === p.id);
        const drafts = draft[p.id] || [];
        return (
          <section key={p.id} className="rounded-lg border border-line p-4 space-y-3">
            <header>
              <h2 className="font-semibold">{p.nickname} <span className="text-mute font-normal">· {p.full_name || ''} · {p.game} {p.team ? `(${p.team})` : ''} · {p.role}</span></h2>
            </header>

            {existingForPlayer.length > 0 && (
              <div className="rounded border border-line/60 bg-bg/30 px-3 py-2 text-xs">
                <div className="font-medium mb-1 text-mute">Already on file — please confirm or note differences:</div>
                <ul className="space-y-0.5">
                  {existingForPlayer.map(e => {
                    const cat = categories.find(c => c.id === e.category_id);
                    return (
                      <li key={e.id}>
                        <span className={e.status === 'current' ? 'text-emerald-700' : e.status === 'future' ? 'text-amber-700' : 'text-mute'}>
                          {e.status?.toUpperCase()}
                        </span>{' '}
                        — {e.brand}{e.brand_parent ? ` (parent: ${e.brand_parent})` : ''} · {cat?.name || `cat#${e.category_id}`} · {e.exclusivity_type} {e.exclusivity_scope}
                        {e.term_start ? ` · from ${e.term_start}` : ''}{e.term_end ? ` to ${e.term_end}` : ''}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="rounded border border-purple-300/40 bg-purple-50/30 p-3 mb-2">
              <div className="text-xs font-semibold text-purple-900 mb-2">Contract terms — independent-sponsorship clause</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-mute block mb-0.5">Clause type</label>
                  <select
                    value={terms[p.id]?.clause_type || ''}
                    onChange={e => setTerm(p.id, 'clause_type', e.target.value as ContractTerms['clause_type'])}
                    className="input text-sm py-1 w-full"
                  >
                    <option value="">— unspecified —</option>
                    <option value="open_with_consent">Open with consent</option>
                    <option value="open_with_notice">Open with notice</option>
                    <option value="pre_approved_categories">Pre-approved categories</option>
                    <option value="schedule_1_carveouts">Schedule-1 carveouts</option>
                    <option value="none">None (fully exclusive to Team)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-mute block mb-0.5">Notice days (if applicable)</label>
                  <input
                    type="number" min={0} max={365}
                    value={terms[p.id]?.notice_days || ''}
                    onChange={e => setTerm(p.id, 'notice_days', e.target.value)}
                    className="input text-sm py-1 w-full tabular-nums"
                    placeholder="e.g. 5 or 14"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] text-mute block mb-0.5">Clause text (paste from contract)</label>
                  <textarea
                    rows={3}
                    value={terms[p.id]?.clause_text || ''}
                    onChange={e => setTerm(p.id, 'clause_text', e.target.value)}
                    className="input text-sm py-1 w-full"
                    placeholder="Paste the relevant Section / clause language. Helps Falcons commercial reference the exact wording when negotiating."
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] text-mute block mb-0.5">Source doc link (Doc ID, Drive URL, etc.)</label>
                  <input
                    type="text"
                    value={terms[p.id]?.source_doc_link || ''}
                    onChange={e => setTerm(p.id, 'source_doc_link', e.target.value)}
                    className="input text-sm py-1 w-full"
                    placeholder="optional"
                  />
                </div>
              </div>
            </div>

            {drafts.map((c, idx) => (
              <CommitmentCard
                key={idx}
                c={c} idx={idx} categories={categories}
                set={(k, v) => setField(p.id, idx, k, v)}
                remove={() => remove(p.id, idx)}
              />
            ))}

            <button type="button" onClick={() => add(p.id)} className="rounded border border-line px-3 py-1.5 text-sm hover:bg-bg/30">
              + Add commitment for {p.nickname}
            </button>
          </section>
        );
      })}

      <div className="sticky bottom-0 bg-bg border-t border-line py-3 flex items-center justify-between gap-4">
        <div className="text-sm text-mute">
          {totalDrafted} commitment{totalDrafted === 1 ? '' : 's'} across {Object.keys(draft).filter(k => (draft[Number(k)] || []).length > 0).length} player{Object.keys(draft).filter(k => (draft[Number(k)] || []).length > 0).length === 1 ? '' : 's'}
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-sm text-rose-600">{error}</span>}
          <button onClick={submit} disabled={submitting}
            className="rounded bg-emerald-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50">
            {submitting ? 'Submitting…' : `Submit (${totalDrafted} commit${totalDrafted === 1 ? '' : 's'} + contract terms)`}
          </button>
        </div>
      </div>
    </div>
  );
}

function CommitmentCard({
  c, idx, categories, set, remove,
}: {
  c: NewCommitment; idx: number; categories: Cat[];
  set: <K extends keyof NewCommitment>(k: K, v: NewCommitment[K]) => void;
  remove: () => void;
}) {
  return (
    <div className="rounded border border-line p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-mute font-medium">Commitment #{idx + 1}</div>
        <button type="button" onClick={remove} className="text-[11px] underline text-rose-600">remove</button>
      </div>

      {/* Identity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="label">Brand <span className="text-rose-600">*</span></label>
          <input value={c.brand} onChange={e => set('brand', e.target.value)} className="input" placeholder="e.g. Autofull" />
        </div>
        <div>
          <label className="label">Brand parent / holding-co</label>
          <input value={c.brand_parent} onChange={e => set('brand_parent', e.target.value)} className="input" placeholder="optional" />
        </div>
        <div>
          <label className="label">Category <span className="text-rose-600">*</span></label>
          <select value={c.category_id} onChange={e => set('category_id', e.target.value ? Number(e.target.value) : '')} className="input">
            <option value="">— pick —</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.parent_code ? '  ' : ''}{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Exclusivity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="label">Exclusivity scope</label>
          <select value={c.exclusivity_scope} onChange={e => set('exclusivity_scope', e.target.value)} className="input">
            <option value="Worldwide">Worldwide</option><option value="MENA">MENA</option><option value="APAC">APAC</option>
            <option value="PH">PH</option><option value="Competition-only">Competition-only</option>
            <option value="Streams-only">Streams-only</option><option value="Social-only">Social-only</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label className="label">Exclusivity type</label>
          <select value={c.exclusivity_type} onChange={e => set('exclusivity_type', e.target.value)} className="input">
            <option>Exclusive</option><option>Sub-exclusive</option><option>Non-exclusive</option>
          </select>
        </div>
        <div>
          <label className="label">Competitor blocklist <span className="text-mute font-normal">(comma-separated)</span></label>
          <input value={c.competitor_blocklist} onChange={e => set('competitor_blocklist', e.target.value)} className="input" placeholder="DXRacer, Secretlab, …" />
        </div>
      </div>

      {/* Dates + economics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div><label className="label">Term start</label><input type="date" value={c.term_start} onChange={e => set('term_start', e.target.value)} className="input" /></div>
        <div><label className="label">Term end</label><input type="date" value={c.term_end} onChange={e => set('term_end', e.target.value)} className="input" /></div>
        <div><label className="label">Deal value</label><input type="number" min={0} value={c.deal_value_sar} onChange={e => set('deal_value_sar', e.target.value)} className="input" placeholder="optional" /></div>
        <div>
          <label className="label">Currency</label>
          <select value={c.currency} onChange={e => set('currency', e.target.value)} className="input">
            <option>SAR</option><option>USD</option><option>EUR</option><option>PHP</option><option>IDR</option><option>JPY</option><option>GBP</option>
          </select>
        </div>
      </div>

      {/* Renewal optionality (Mig 084) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={c.rofr} onChange={e => set('rofr', e.target.checked)} /> ROFR (right of first refusal)</label>
        <div><label className="label">ROFR window (days)</label><input type="number" min={0} value={c.rofr_window_days} onChange={e => set('rofr_window_days', e.target.value)} className="input" placeholder="e.g. 60" /></div>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={c.rofn} onChange={e => set('rofn', e.target.checked)} /> ROFN (first negotiation)</label>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={c.mfn} onChange={e => set('mfn', e.target.checked)} /> MFN (most favoured nation)</label>
      </div>

      {/* Image rights (Mig 084) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="label">Image rights scope</label>
          <input value={c.image_rights_scope} onChange={e => set('image_rights_scope', e.target.value)} className="input" placeholder="e.g. social + retail point-of-sale only" />
        </div>
        <div className="flex flex-wrap gap-3 items-end pb-2">
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={c.sublicense_allowed} onChange={e => set('sublicense_allowed', e.target.checked)} /> Sublicensing allowed</label>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={c.training_data_use} onChange={e => set('training_data_use', e.target.checked)} /> AI/training-data use</label>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={c.non_disparagement} onChange={e => set('non_disparagement', e.target.checked)} /> Non-disparagement</label>
        </div>
      </div>

      {/* Usage + obligations */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={c.paid_amplification_allowed} onChange={e => set('paid_amplification_allowed', e.target.checked)} /> Paid amplification</label>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={c.dark_posts_allowed} onChange={e => set('dark_posts_allowed', e.target.checked)} /> Dark posts</label>
        <div><label className="label">IRL appearances (count)</label><input type="number" min={0} value={c.irl_appearances_count} onChange={e => set('irl_appearances_count', e.target.value)} className="input" /></div>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={c.peripheral_usage_required} onChange={e => set('peripheral_usage_required', e.target.checked)} /> Must use during play</label>
      </div>

      {/* Free-text */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div><label className="label">Source contract link</label><input value={c.source_doc_link} onChange={e => set('source_doc_link', e.target.value)} className="input" placeholder="Drive / SharePoint URL" /></div>
        <div><label className="label">Notes</label><input value={c.notes} onChange={e => set('notes', e.target.value)} className="input" /></div>
      </div>
    </div>
  );
}
