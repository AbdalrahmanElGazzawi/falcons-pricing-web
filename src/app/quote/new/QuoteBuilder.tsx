'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { computeLine, computeQuoteTotals, AXIS_OPTIONS, type MeasurementConfidence } from '@/lib/pricing';
import { fmtMoney, fmtPct } from '@/lib/utils';
import {
  PLAYER_PLATFORMS, CREATOR_PLATFORMS,
  type Player, type Creator, type Tier, type Addon,
} from '@/lib/types';
import { Trash2, Plus, Save, ArrowLeft, Pencil, Settings, Check } from 'lucide-react';
import Link from 'next/link';
import { PricingWizard } from './PricingWizard';
import type { LineDraft } from './line-draft';
import { Section } from '@/components/Section';

const SECTION_TITLES: Record<string, string> = {
  header: 'Quote header',
  globals: 'Campaign axes',
  addons: 'Add-ons',
  lines: 'Quote lines',
  notes_totals: 'Notes & totals',
};

export function QuoteBuilder({
  players, creators, tiers, addons, ownerEmail,
  initialSectionOrder, canEditLayout,
}: {
  players: Player[];
  creators: Creator[];
  tiers: Tier[];
  addons: Addon[];
  ownerEmail: string;
  initialSectionOrder: string[];
  canEditLayout: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Build/Preview tab
  const [view, setView] = useState<'build' | 'preview'>('build');

  // ── Layout edit mode (super-admin only)
  const [sectionOrder, setSectionOrder] = useState<string[]>(initialSectionOrder);
  const [editingLayout, setEditingLayout] = useState(false);
  const [layoutBusy, setLayoutBusy] = useState(false);
  const [layoutError, setLayoutError] = useState<string | null>(null);

  async function persistOrder(next: string[]) {
    setLayoutBusy(true);
    setLayoutError(null);
    try {
      const res = await fetch('/api/admin/layout/quote%2Fnew', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section_order: next }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Save failed (${res.status})`);
      }
    } catch (e: any) {
      setLayoutError(e.message || 'Layout save failed');
    } finally {
      setLayoutBusy(false);
    }
  }

  function moveSection(id: string, delta: -1 | 1) {
    setSectionOrder(curr => {
      const i = curr.indexOf(id);
      if (i < 0) return curr;
      const j = i + delta;
      if (j < 0 || j >= curr.length) return curr;
      const next = curr.slice();
      next.splice(i, 1);
      next.splice(j, 0, id);
      void persistOrder(next);
      return next;
    });
  }

  // ── Quote header
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [campaign, setCampaign] = useState('');
  const [currency, setCurrency] = useState('SAR');
  const [vatRate, setVatRate] = useState(0.15);
  const [notes, setNotes] = useState('');

  // ── Global axes (apply to every line unless overridden per line)
  const [eng, setEng] = useState(AXIS_OPTIONS.engagement[1].factor);
  const [aud, setAud] = useState(AXIS_OPTIONS.audience[0].factor);
  const [seas, setSeas] = useState(AXIS_OPTIONS.seasonality[0].factor);
  const [ctype, setCtype] = useState(AXIS_OPTIONS.contentType[1].factor);
  const [lang, setLang] = useState(AXIS_OPTIONS.language[0].factor);
  const [auth, setAuth] = useState(AXIS_OPTIONS.authority[0].factor);
  const [obj, setObj] = useState(AXIS_OPTIONS.objective[1].weight);
  const [conf, setConf] = useState<MeasurementConfidence>('exact');

  // ── Add-ons
  const [addonIds, setAddonIds] = useState<Set<number>>(new Set());
  const addonsUpliftPct = useMemo(() => {
    return Array.from(addonIds).reduce((sum, id) => {
      const a = addons.find(x => x.id === id);
      return sum + (a?.uplift_pct ?? 0);
    }, 0);
  }, [addonIds, addons]);

  // ── Lines
  const [lines, setLines] = useState<LineDraft[]>([]);

  // ── Wizard state
  const [wizard, setWizard] = useState<
    | { mode: 'add' }
    | { mode: 'edit'; initial: LineDraft }
    | null
  >(null);

  function openAddWizard() { setWizard({ mode: 'add' }); }
  function openEditWizard(uid: string) {
    const line = lines.find(l => l.uid === uid);
    if (!line) return;
    setWizard({ mode: 'edit', initial: line });
  }
  function closeWizard() { setWizard(null); }

  function commitWizard(draft: LineDraft) {
    if (wizard?.mode === 'edit') {
      setLines(ls => ls.map(l => l.uid === draft.uid ? draft : l));
    } else {
      setLines(ls => [...ls, draft]);
    }
    closeWizard();
  }
  function commitAndAnother(draft: LineDraft) {
    setLines(ls => [...ls, draft]);
    setWizard({ mode: 'add' });
  }

  function removeLine(uid: string) {
    setLines(ls => ls.filter(l => l.uid !== uid));
  }
  function inlineUpdateLine(uid: string, patch: Partial<LineDraft>) {
    setLines(ls => ls.map(l => l.uid === uid ? { ...l, ...patch } : l));
  }
  function inlineChangePlatform(line: LineDraft, key: string) {
    let rate = 0, label = key;
    if (line.talent_type === 'player') {
      const p = players.find(x => x.id === line.talent_id);
      const opt = PLAYER_PLATFORMS.find(o => o.key === key);
      rate = (p as any)?.[key] ?? 0;
      label = opt?.label ?? key;
    } else {
      const c = creators.find(x => x.id === line.talent_id);
      const opt = CREATOR_PLATFORMS.find(o => o.key === key);
      rate = (c as any)?.[key] ?? 0;
      label = opt?.label ?? key;
    }
    inlineUpdateLine(line.uid, { platform: key, platform_label: label, base_rate: rate });
  }

  // Live pricing per line + totals (per-line overrides fall back to globals)
  const computed = useMemo(() => {
    const out = lines.map(l => {
      const r = computeLine({
        baseFee: l.base_rate,
        irl: l.irl,
        eng: l.o_eng ?? eng,
        aud: l.o_aud ?? aud,
        seas: l.o_seas ?? seas,
        ctype: l.o_ctype ?? ctype,
        lang: l.o_lang ?? lang,
        auth: l.o_auth ?? auth,
        obj, conf,
        floorShare: l.floorShare,
        rightsPct: addonsUpliftPct,
        qty: l.qty,
      });
      return { ...l, ...r };
    });
    const totals = computeQuoteTotals({
      lines: out.map(o => ({ finalAmount: o.finalAmount })),
      addonsUpliftPct: 0,
      vatRate,
    });
    return { rows: out, totals };
  }, [lines, eng, aud, seas, ctype, lang, auth, obj, conf, addonsUpliftPct, vatRate]);

  async function save(status: 'draft' | 'pending_approval') {
    setError(null);
    if (!clientName.trim()) { setError('Client name is required'); return; }
    if (lines.length === 0) { setError('Add at least one line'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          header: {
            client_name: clientName.trim(),
            client_email: clientEmail.trim() || null,
            campaign: campaign.trim() || null,
            owner_email: ownerEmail,
            currency,
            vat_rate: vatRate,
            eng_factor: eng, audience_factor: aud, seasonality_factor: seas,
            content_type_factor: ctype, language_factor: lang, authority_factor: auth,
            objective_weight: obj, measurement_confidence: conf,
            subtotal: computed.totals.subtotal,
            addons_uplift_pct: addonsUpliftPct,
            pre_vat: computed.totals.preVat,
            vat_amount: computed.totals.vatAmount,
            total: computed.totals.total,
            status,
            notes: notes.trim() || null,
          },
          lines: computed.rows.map((r, i) => ({
            sort_order: i,
            talent_type: r.talent_type,
            player_id: r.talent_type === 'player' ? r.talent_id : null,
            creator_id: r.talent_type === 'creator' ? r.talent_id : null,
            talent_name: r.talent_name,
            platform: r.platform_label,
            base_rate: r.base_rate,
            qty: r.qty,
            line_content_type: r.o_ctype,
            line_eng: r.o_eng,
            line_audience: r.o_aud,
            line_seasonality: r.o_seas,
            line_language: r.o_lang,
            line_authority: r.o_auth,
            social_price: r.socialPrice,
            floor_price: r.floorPrice,
            final_unit: r.finalUnit,
            final_amount: r.finalAmount,
          })),
          addonIds: Array.from(addonIds),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Save failed (${res.status})`);
      }
      const j = await res.json();
      router.push(`/quote/${j.id}`);
    } catch (e: any) {
      setError(e.message || 'Save failed');
      setSaving(false);
    }
  }

  const activeOverrides = (l: LineDraft) =>
    [l.o_ctype, l.o_eng, l.o_aud, l.o_seas, l.o_lang, l.o_auth].filter(v => v !== null).length;

  // ── Section nodes — built once, then rendered in sectionOrder order
  const sectionNodes: Record<string, React.ReactNode> = {
    header: (
      <div className="card card-p">
        <h2 className="font-semibold mb-4">Quote header</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Client name *</label>
            <input value={clientName} onChange={e => setClientName(e.target.value)} className="input" placeholder="e.g. STC Play" />
          </div>
          <div>
            <label className="label">Client email</label>
            <input value={clientEmail} onChange={e => setClientEmail(e.target.value)} className="input" placeholder="contact@client.com" />
          </div>
          <div>
            <label className="label">Campaign</label>
            <input value={campaign} onChange={e => setCampaign(e.target.value)} className="input" placeholder="e.g. Ramadan 2026" />
          </div>
          <div>
            <label className="label">Currency</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)} className="input">
              <option value="SAR">SAR</option>
              <option value="USD">USD</option>
              <option value="AED">AED</option>
            </select>
          </div>
          <div>
            <label className="label">VAT</label>
            <select value={vatRate} onChange={e => setVatRate(parseFloat(e.target.value))} className="input">
              <option value="0.15">15% (KSA)</option>
              <option value="0.05">5% (UAE)</option>
              <option value="0">0% (Export)</option>
            </select>
          </div>
        </div>
      </div>
    ),
    globals: (
      <div className="card card-p">
        <h2 className="font-semibold mb-1">Campaign-level pricing axes</h2>
        <p className="text-xs text-label mb-4">These apply to every line by default. Override any axis on a per-line basis from the wizard.</p>
        <div className="grid grid-cols-4 gap-4">
          <AxisSelect label="Content type" value={ctype} setValue={setCtype}
            options={AXIS_OPTIONS.contentType.map(o => ({ label: o.label, val: o.factor }))} />
          <AxisSelect label="Engagement" value={eng} setValue={setEng}
            options={AXIS_OPTIONS.engagement.map(o => ({ label: o.label, val: o.factor }))} />
          <AxisSelect label="Audience" value={aud} setValue={setAud}
            options={AXIS_OPTIONS.audience.map(o => ({ label: o.label, val: o.factor }))} />
          <AxisSelect label="Seasonality" value={seas} setValue={setSeas}
            options={AXIS_OPTIONS.seasonality.map(o => ({ label: o.label, val: o.factor }))} />
          <AxisSelect label="Language" value={lang} setValue={setLang}
            options={AXIS_OPTIONS.language.map(o => ({ label: o.label, val: o.factor }))} />
          <AxisSelect label="Authority" value={auth} setValue={setAuth}
            options={AXIS_OPTIONS.authority.map(o => ({ label: o.label, val: o.factor }))} />
          <AxisSelect label="Objective weight" value={obj} setValue={setObj}
            options={AXIS_OPTIONS.objective.map(o => ({ label: o.label, val: o.weight }))} />
          <div>
            <label className="label">Measurement confidence</label>
            <select value={conf} onChange={e => setConf(e.target.value as MeasurementConfidence)} className="input">
              {AXIS_OPTIONS.confidence.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    ),
    addons: (
      <div className="card card-p">
        <h2 className="font-semibold mb-4">Add-on rights packages</h2>
        <div className="grid grid-cols-3 gap-2">
          {addons.map(a => {
            const checked = addonIds.has(a.id);
            return (
              <label key={a.id} className={[
                'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition',
                checked ? 'border-green bg-green/5' : 'border-line hover:border-mute',
              ].join(' ')}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    setAddonIds(s => {
                      const next = new Set(s);
                      if (next.has(a.id)) next.delete(a.id); else next.add(a.id);
                      return next;
                    });
                  }}
                  className="mt-0.5"
                />
                <div className="text-sm">
                  <div className="font-medium text-ink">{a.label} <span className="text-green">+{fmtPct(a.uplift_pct, 0)}</span></div>
                  {a.description && <div className="text-xs text-mute mt-0.5">{a.description}</div>}
                </div>
              </label>
            );
          })}
        </div>
        {addonsUpliftPct > 0 && (
          <div className="text-xs text-label mt-3">Total uplift: <strong className="text-green">+{fmtPct(addonsUpliftPct, 0)}</strong></div>
        )}
      </div>
    ),
    lines: wizard ? (
      <PricingWizard
        mode={wizard.mode}
        initial={wizard.mode === 'edit' ? wizard.initial : undefined}
        players={players}
        creators={creators}
        tiers={tiers}
        globals={{ eng, aud, seas, ctype, lang, auth, obj, conf }}
        currency={currency}
        addonsUpliftPct={addonsUpliftPct}
        onCancel={closeWizard}
        onCommit={commitWizard}
        onCommitAndAnother={wizard.mode === 'add' ? commitAndAnother : undefined}
      />
    ) : (
      <div className="card">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <h2 className="font-semibold">Quote lines</h2>
          <div className="flex items-center gap-2">
            <button className="btn btn-primary text-sm" onClick={openAddWizard}>
              <Plus size={14} /> Add deliverable
            </button>
          </div>
        </div>

        {computed.rows.length === 0 ? (
          <div className="px-5 py-12 text-center text-label text-sm">
            No lines yet. Click <strong>+ Add deliverable</strong> to start the pricing wizard.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-label uppercase tracking-wide bg-bg">
                  <th className="px-4 py-3">Talent</th>
                  <th className="px-4 py-3">Platform</th>
                  <th className="px-4 py-3 text-right">Base rate</th>
                  <th className="px-4 py-3 text-right w-20">Qty</th>
                  <th className="px-4 py-3 text-right">Unit price</th>
                  <th className="px-4 py-3 text-right">Line total</th>
                  <th className="px-4 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {computed.rows.map(r => {
                  const platforms = r.talent_type === 'player' ? PLAYER_PLATFORMS : CREATOR_PLATFORMS;
                  const overrideCount = activeOverrides(r);
                  return (
                    <tr key={r.uid} className="border-t border-line hover:bg-bg/60">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openEditWizard(r.uid)}
                          className="text-left group"
                          title="Edit line in wizard"
                        >
                          <div className="font-medium text-ink group-hover:underline">{r.talent_name}</div>
                          <div className="text-xs text-mute capitalize flex items-center gap-2">
                            <span>{r.talent_type}</span>
                            {overrideCount > 0 && (
                              <span className="chip chip-peach text-[10px]">{overrideCount} override{overrideCount > 1 ? 's' : ''}</span>
                            )}
                          </div>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={r.platform}
                          onChange={e => inlineChangePlatform(r, e.target.value)}
                          className="input py-1 px-2 text-sm w-44"
                        >
                          {platforms.map(p => (
                            <option key={p.key} value={p.key}>{p.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right text-label">
                        {r.base_rate ? fmtMoney(r.base_rate, currency) : <span className="text-orange-500">no rate set</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number" min={1} value={r.qty}
                          onChange={e => inlineUpdateLine(r.uid, { qty: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="input py-1 px-2 text-right w-16"
                        />
                      </td>
                      <td className="px-4 py-3 text-right text-ink">{fmtMoney(r.finalUnit, currency)}</td>
                      <td className="px-4 py-3 text-right font-medium text-ink">{fmtMoney(r.finalAmount, currency)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEditWizard(r.uid)} className="p-1 text-mute hover:text-ink" title="Edit in wizard">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => removeLine(r.uid)} className="p-1 text-mute hover:text-red-600" title="Remove line">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    ),
    notes_totals: (
      <div className="card card-p">
        <label className="label">Internal notes</label>
        <textarea
          value={notes} onChange={e => setNotes(e.target.value)}
          rows={4} className="input resize-none"
          placeholder="Context, deal nuances, special terms…"
        />
        <p className="text-xs text-mute mt-2">Save buttons + live total are in the rail on the right.</p>
      </div>
    ),
  };

  // Defensive: only render sections we know how to render
  const renderableOrder = sectionOrder.filter(id => sectionNodes[id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-label hover:text-ink">
          <ArrowLeft size={14} /> Back
        </Link>
        {canEditLayout && (
          <div className="flex items-center gap-2">
            {layoutError && <span className="text-xs text-red-600">{layoutError}</span>}
            {layoutBusy && <span className="text-xs text-label">Saving layout…</span>}
            {editingLayout ? (
              <button
                onClick={() => setEditingLayout(false)}
                className="btn btn-primary text-sm"
              >
                <Check size={14} /> Done editing
              </button>
            ) : (
              <button
                onClick={() => setEditingLayout(true)}
                className="btn btn-ghost text-sm"
                title="Reorder sections (super admin only)"
              >
                <Settings size={14} /> Customize layout
              </button>
            )}
          </div>
        )}
      </div>

      {editingLayout && (
        <div className="rounded-lg border border-green/40 bg-greenSoft px-4 py-3 text-sm text-greenDark">
          <strong>Layout edit mode.</strong> Use the ▲ ▼ buttons on each section to reorder.
          Changes save automatically and are logged to the audit trail.
        </div>
      )}

      {/* Build / Preview tab strip */}
      <div className="flex items-center gap-1 border-b border-line">
        <TabButton active={view === 'build'} onClick={() => setView('build')}>Build</TabButton>
        <TabButton active={view === 'preview'} onClick={() => setView('preview')}>Preview</TabButton>
        <div className="ml-auto text-xs text-label pb-2">
          {view === 'preview'
            ? 'Read-only preview of the saved quote'
            : `${computed.rows.length} line${computed.rows.length === 1 ? '' : 's'} · ${fmtMoney(computed.totals.total, currency)}`}
        </div>
      </div>

      {view === 'preview' ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,300px] gap-6 items-start">
          <QuotePreview
            clientName={clientName}
            clientEmail={clientEmail}
            campaign={campaign}
            ownerEmail={ownerEmail}
            currency={currency}
            vatRate={vatRate}
            notes={notes}
            rows={computed.rows}
            totals={computed.totals}
            addonsUpliftPct={addonsUpliftPct}
          />
          {/* Sticky rail repeats here so save buttons stay reachable from preview */}
          <aside className="lg:sticky lg:top-6">
            <div className="card p-4 space-y-3">
              <div className="kpi-label">Live total</div>
              <div>
                <div className="kpi-value">{fmtMoney(computed.totals.total, currency)}</div>
                <div className="kpi-sub mt-1">
                  {computed.rows.length} line{computed.rows.length === 1 ? '' : 's'} · VAT {fmtPct(vatRate, 0)}
                </div>
              </div>
              <div className="border-t border-line pt-3 space-y-1.5 text-xs">
                <Row label="Subtotal" value={fmtMoney(computed.totals.subtotal, currency)} muted />
                {addonsUpliftPct > 0 && (
                  <Row label={`Add-on uplift +${fmtPct(addonsUpliftPct, 0)}`} value="in lines" muted />
                )}
                <Row label={`VAT (${fmtPct(vatRate, 0)})`} value={fmtMoney(computed.totals.vatAmount, currency)} muted />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => save('draft')} disabled={saving}
                  className="btn btn-ghost text-xs justify-center disabled:opacity-50">
                  <Save size={12} /> Draft
                </button>
                <button onClick={() => save('pending_approval')} disabled={saving}
                  className="btn btn-navy text-xs justify-center disabled:opacity-50">
                  {saving ? 'Saving…' : 'Submit'}
                </button>
              </div>
              {error && <div className="text-xs text-red-600">{error}</div>}
              <button onClick={() => setView('build')}
                className="btn btn-ghost w-full text-xs justify-center">
                ← Back to build
              </button>
            </div>
          </aside>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,300px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          {renderableOrder.map((id, idx) => (
            <Section
              key={id}
              id={id}
              title={SECTION_TITLES[id] ?? id}
              editable={editingLayout}
              isFirst={idx === 0}
              isLast={idx === renderableOrder.length - 1}
              onMoveUp={() => moveSection(id, -1)}
              onMoveDown={() => moveSection(id, 1)}
            >
              {sectionNodes[id]}
            </Section>
          ))}
        </div>

        {/* Sticky live total rail */}
        <aside className="lg:sticky lg:top-6">
          <div className="card p-4 space-y-3">
            <div className="kpi-label">Live total</div>
            <div>
              <div className="kpi-value">{fmtMoney(computed.totals.total, currency)}</div>
              <div className="kpi-sub mt-1">
                {computed.rows.length} line{computed.rows.length === 1 ? '' : 's'} · VAT {fmtPct(vatRate, 0)}
              </div>
            </div>
            <div className="border-t border-line pt-3 space-y-1.5 text-xs">
              <Row label="Subtotal" value={fmtMoney(computed.totals.subtotal, currency)} muted />
              {addonsUpliftPct > 0 && (
                <Row label={`Add-on uplift +${fmtPct(addonsUpliftPct, 0)}`} value="in lines" muted />
              )}
              <Row label={`VAT (${fmtPct(vatRate, 0)})`} value={fmtMoney(computed.totals.vatAmount, currency)} muted />
            </div>
            <button
              onClick={openAddWizard}
              className="btn btn-primary w-full justify-center text-sm"
            >
              <Plus size={14} /> Add deliverable
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => save('draft')} disabled={saving}
                className="btn btn-ghost text-xs justify-center disabled:opacity-50">
                <Save size={12} /> Draft
              </button>
              <button onClick={() => save('pending_approval')} disabled={saving}
                className="btn btn-navy text-xs justify-center disabled:opacity-50">
                {saving ? 'Saving…' : 'Submit'}
              </button>
            </div>
            {error && <div className="text-xs text-red-600">{error}</div>}
            {clientName.trim() === '' && (
              <div className="text-[11px] text-amber">Client name required to save.</div>
            )}
          </div>
        </aside>
      </div>
      )}
    </div>
  );
}

// ─── helpers ───────────────────────────────────────────────────────────────
function AxisSelect({ label, value, setValue, options }: {
  label: string; value: number; setValue: (v: number) => void;
  options: { label: string; val: number }[];
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <select value={value} onChange={e => setValue(parseFloat(e.target.value))} className="input">
        {options.map(o => (
          <option key={o.label} value={o.val}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function Row({ label, value, bold, muted }: {
  label: string; value: string; bold?: boolean; muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? 'text-mute text-xs' : 'text-label'}>{label}</span>
      <span className={bold ? 'font-bold text-ink text-base' : 'text-ink'}>{value}</span>
    </div>
  );
}
// ─── Tab strip ──────────────────────────────────────────────────────────────
function TabButton({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'relative px-4 py-2.5 text-sm font-medium transition',
        active ? 'text-ink' : 'text-mute hover:text-ink',
      ].join(' ')}
    >
      {children}
      {active && (
        <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-green rounded-full" />
      )}
    </button>
  );
}

// ─── Quote preview (read-only formatted view) ───────────────────────────────
function QuotePreview({
  clientName, clientEmail, campaign, ownerEmail, currency, vatRate, notes,
  rows, totals, addonsUpliftPct,
}: {
  clientName: string;
  clientEmail: string;
  campaign: string;
  ownerEmail: string;
  currency: string;
  vatRate: number;
  notes: string;
  rows: any[];
  totals: { subtotal: number; preVat: number; vatAmount: number; total: number };
  addonsUpliftPct: number;
}) {
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  return (
    <div className="card overflow-hidden">
      {/* Brand banner */}
      <div className="bg-gradient-to-r from-green to-greenDark text-white p-6">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <div className="text-[10px] tracking-widest opacity-80">QUOTATION · DRAFT</div>
            <div className="text-2xl font-bold mt-1 tracking-tight">Team Falcons</div>
            <div className="text-xs opacity-90 mt-0.5">Pricing OS · {today}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] tracking-widest opacity-80">TOTAL ({currency})</div>
            <div className="text-3xl font-extrabold mt-1">{fmtMoney(totals.total, currency)}</div>
            <div className="text-xs opacity-90 mt-0.5">VAT inclusive</div>
          </div>
        </div>
      </div>

      {/* Client + owner block */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 py-5 border-b border-line">
        <div>
          <div className="kpi-label">Client</div>
          <div className="text-sm font-semibold text-ink mt-1">{clientName || <em className="text-mute">Add client name</em>}</div>
          {clientEmail && <div className="text-xs text-label">{clientEmail}</div>}
        </div>
        <div>
          <div className="kpi-label">Campaign</div>
          <div className="text-sm font-semibold text-ink mt-1">{campaign || <em className="text-mute">—</em>}</div>
        </div>
        <div>
          <div className="kpi-label">Owner</div>
          <div className="text-sm font-semibold text-ink mt-1">{ownerEmail}</div>
        </div>
      </div>

      {/* Lines */}
      {rows.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-mute">
          No lines yet. Switch back to <strong className="text-ink">Build</strong> and add deliverables.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-label uppercase tracking-wider bg-bg">
                <th className="px-6 py-3">Talent</th>
                <th className="px-4 py-3">Deliverable</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Unit price</th>
                <th className="px-6 py-3 text-right">Line total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.uid} className="border-t border-line">
                  <td className="px-6 py-3">
                    <div className="font-medium text-ink">{r.talent_name}</div>
                    <div className="text-xs text-mute capitalize">{r.talent_type}</div>
                  </td>
                  <td className="px-4 py-3 text-label">{r.platform_label}</td>
                  <td className="px-4 py-3 text-right">{r.qty}</td>
                  <td className="px-4 py-3 text-right">{fmtMoney(r.finalUnit, currency)}</td>
                  <td className="px-6 py-3 text-right font-semibold text-ink">{fmtMoney(r.finalAmount, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Totals */}
      <div className="px-6 py-5 border-t border-line">
        <div className="ml-auto max-w-xs space-y-1.5 text-sm">
          <Row label="Subtotal" value={fmtMoney(totals.subtotal, currency)} muted />
          {addonsUpliftPct > 0 && (
            <Row label={`Add-on uplift +${fmtPct(addonsUpliftPct, 0)}`} value="in lines" muted />
          )}
          <Row label={`VAT (${fmtPct(vatRate, 0)})`} value={fmtMoney(totals.vatAmount, currency)} muted />
          <div className="border-t border-line pt-2">
            <Row label="TOTAL" value={fmtMoney(totals.total, currency)} bold />
          </div>
        </div>
      </div>

      {/* Notes */}
      {notes && (
        <div className="px-6 py-5 border-t border-line">
          <div className="kpi-label mb-1.5">Internal notes</div>
          <div className="text-sm text-ink whitespace-pre-wrap">{notes}</div>
        </div>
      )}

      <div className="px-6 py-3 border-t border-line bg-bg text-xs text-mute text-center">
        This is a preview. Click <strong>Submit</strong> in the rail to send the quote for approval, or <strong>Draft</strong> to save without submitting.
      </div>
    </div>
  );
}

