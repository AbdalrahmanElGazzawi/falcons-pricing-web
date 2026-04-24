'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { computeLine, computeQuoteTotals, AXIS_OPTIONS, type MeasurementConfidence } from '@/lib/pricing';
import { fmtMoney, fmtPct } from '@/lib/utils';
import { PLAYER_PLATFORMS, CREATOR_PLATFORMS, type Player, type Creator, type Tier, type Addon } from '@/lib/types';
import { Trash2, Plus, Save, ArrowLeft, Pencil, X, Check } from 'lucide-react';
import Link from 'next/link';

type LineDraft = {
  uid: string;                    // local row id
  talent_type: 'player' | 'creator';
  talent_id: number | null;
  talent_name: string;
  platform: string;               // rate column key, e.g. rate_ig_reel
  platform_label: string;
  base_rate: number;
  qty: number;
  // per-line context
  irl: number;                    // pulled from player irl, 0 for creator
  floorShare: number;             // tier floor share
  // Per-line axis overrides (null = inherit global)
  o_ctype: number | null;
  o_eng: number | null;
  o_aud: number | null;
  o_seas: number | null;
  o_lang: number | null;
  o_auth: number | null;
};

const newUid = () => Math.random().toString(36).slice(2, 9);

export function QuoteBuilder({
  players, creators, tiers, addons, ownerEmail,
}: {
  players: Player[];
  creators: Creator[];
  tiers: Tier[];
  addons: Addon[];
  ownerEmail: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // ── Panel state: controls the slide-over for add/edit
  const [panel, setPanel] = useState<null | {
    mode: 'add' | 'edit';
    talent_type: 'player' | 'creator';
    draft: LineDraft;
    originalUid?: string;
  }>(null);

  // Helper: given a bare draft (type set) and a talent id, populate talent-derived fields
  function applyTalentToDraft(draft: LineDraft, kind: 'player' | 'creator', talentId: number): LineDraft {
    if (kind === 'player') {
      const p = players.find(x => x.id === talentId);
      if (!p) return draft;
      const tier = tiers.find(t => t.code === p.tier_code);
      const firstPlatform =
        PLAYER_PLATFORMS.find(pp => ((p as any)[pp.key] as number) > 0) ?? PLAYER_PLATFORMS[0];
      const rate = ((p as any)[firstPlatform.key] as number) || 0;
      return {
        ...draft,
        talent_id: p.id,
        talent_name: p.nickname,
        platform: firstPlatform.key,
        platform_label: firstPlatform.label,
        base_rate: rate,
        irl: p.rate_irl || 0,
        floorShare: tier?.floor_share ?? p.floor_share ?? 0.5,
      };
    } else {
      const c = creators.find(x => x.id === talentId);
      if (!c) return draft;
      const tier = tiers.find(t => t.code === c.tier_code);
      const firstPlatform =
        CREATOR_PLATFORMS.find(pp => ((c as any)[pp.key] as number) > 0) ?? CREATOR_PLATFORMS[0];
      const rate = ((c as any)[firstPlatform.key] as number) || 0;
      return {
        ...draft,
        talent_id: c.id,
        talent_name: c.nickname,
        platform: firstPlatform.key,
        platform_label: firstPlatform.label,
        base_rate: rate,
        irl: 0,
        floorShare: tier?.floor_share ?? 0.5,
      };
    }
  }

  function openAddPanel(kind: 'player' | 'creator', presetTalentId?: number) {
    const base: LineDraft = {
      uid: newUid(),
      talent_type: kind,
      talent_id: null,
      talent_name: '',
      platform: '',
      platform_label: '',
      base_rate: 0,
      qty: 1,
      irl: 0,
      floorShare: 0.5,
      o_ctype: null, o_eng: null, o_aud: null, o_seas: null, o_lang: null, o_auth: null,
    };
    const draft = presetTalentId ? applyTalentToDraft(base, kind, presetTalentId) : base;
    setPanel({ mode: 'add', talent_type: kind, draft });
  }

  function openEditPanel(uid: string) {
    const line = lines.find(l => l.uid === uid);
    if (!line) return;
    setPanel({ mode: 'edit', talent_type: line.talent_type, draft: { ...line }, originalUid: uid });
  }

  function closePanel() { setPanel(null); }

  function patchPanelDraft(patch: Partial<LineDraft>) {
    setPanel(p => p ? { ...p, draft: { ...p.draft, ...patch } } : p);
  }

  function changePanelPlatform(key: string) {
    if (!panel) return;
    const d = panel.draft;
    let rate = 0, label = key;
    if (d.talent_type === 'player') {
      const p = players.find(x => x.id === d.talent_id);
      const opt = PLAYER_PLATFORMS.find(o => o.key === key);
      rate = (p as any)?.[key] ?? 0;
      label = opt?.label ?? key;
    } else {
      const c = creators.find(x => x.id === d.talent_id);
      const opt = CREATOR_PLATFORMS.find(o => o.key === key);
      rate = (c as any)?.[key] ?? 0;
      label = opt?.label ?? key;
    }
    patchPanelDraft({ platform: key, platform_label: label, base_rate: rate });
  }

  // Commit the panel draft back into the lines array
  function commitPanel(keepOpenForSameTalent = false) {
    if (!panel) return;
    const d = panel.draft;
    if (!d.talent_id) return;
    if (!d.platform) return;
    if (panel.mode === 'add') {
      setLines(ls => [...ls, d]);
    } else if (panel.originalUid) {
      setLines(ls => ls.map(l => l.uid === panel.originalUid ? d : l));
    }
    if (keepOpenForSameTalent && panel.mode === 'add' && d.talent_id) {
      openAddPanel(panel.talent_type, d.talent_id);
    } else {
      closePanel();
    }
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

  // Live pricing per line + totals (honor per-line overrides, fall back to global)
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

  const panelPreview = useMemo(() => {
    if (!panel) return null;
    const d = panel.draft;
    if (!d.talent_id || !d.platform) return null;
    return computeLine({
      baseFee: d.base_rate,
      irl: d.irl,
      eng: d.o_eng ?? eng,
      aud: d.o_aud ?? aud,
      seas: d.o_seas ?? seas,
      ctype: d.o_ctype ?? ctype,
      lang: d.o_lang ?? lang,
      auth: d.o_auth ?? auth,
      obj, conf,
      floorShare: d.floorShare,
      rightsPct: addonsUpliftPct,
      qty: d.qty,
    });
  }, [panel, eng, aud, seas, ctype, lang, auth, obj, conf, addonsUpliftPct]);

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

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-label hover:text-ink">
        <ArrowLeft size={14} /> Back
      </Link>

      {/* Inline Add Deliverable panel (opens on + Player / + Creator / row click) */}
      {panel && (
        <LinePanel
          mode={panel.mode}
          talent_type={panel.talent_type}
          draft={panel.draft}
          players={players}
          creators={creators}
          globals={{ eng, aud, seas, ctype, lang, auth, obj, conf }}
          currency={currency}
          addonsUpliftPct={addonsUpliftPct}
          preview={panelPreview}
          onSelectTalent={(id) => {
            const next = applyTalentToDraft(panel.draft, panel.talent_type, id);
            patchPanelDraft({
              talent_id: next.talent_id,
              talent_name: next.talent_name,
              platform: next.platform,
              platform_label: next.platform_label,
              base_rate: next.base_rate,
              irl: next.irl,
              floorShare: next.floorShare,
            });
          }}
          onChangePlatform={changePanelPlatform}
          onPatch={patchPanelDraft}
          onCancel={closePanel}
          onCommit={() => commitPanel(false)}
          onCommitAndAddAnother={() => commitPanel(true)}
        />
      )}

      {/* Header card */}
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

      {/* Axes card */}
      <div className="card card-p">
        <h2 className="font-semibold mb-1">Campaign-level pricing axes</h2>
        <p className="text-xs text-label mb-4">These apply to every line by default. Override any axis on a per-line basis from the line editor.</p>
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

      {/* Add-ons */}
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

      {/* Lines */}
      <div className="card">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <h2 className="font-semibold">Quote lines</h2>
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost text-sm" onClick={() => openAddPanel('player')}>
              <Plus size={14} /> Player
            </button>
            <button className="btn btn-ghost text-sm" onClick={() => openAddPanel('creator')}>
              <Plus size={14} /> Creator
            </button>
          </div>
        </div>

        {computed.rows.length === 0 ? (
          <div className="px-5 py-12 text-center text-label text-sm">
            No lines yet. Click <strong>+ Player</strong> or <strong>+ Creator</strong> to add a deliverable with live pricing.
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
                          onClick={() => openEditPanel(r.uid)}
                          className="text-left group"
                          title="Edit line"
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
                          <button onClick={() => openEditPanel(r.uid)} className="p-1 text-mute hover:text-ink" title="Edit overrides">
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

      {/* Notes + totals + save */}
      <div className="grid grid-cols-3 gap-6">
        <div className="card card-p col-span-2">
          <label className="label">Internal notes</label>
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)}
            rows={4} className="input resize-none"
            placeholder="Context, deal nuances, special terms…"
          />
        </div>

        <div className="card card-p">
          <div className="text-xs text-label uppercase tracking-wide mb-3">Quote totals</div>
          <div className="space-y-2 text-sm">
            <Row label="Subtotal" value={fmtMoney(computed.totals.subtotal, currency)} />
            {addonsUpliftPct > 0 && (
              <Row label={`Add-on uplift (+${fmtPct(addonsUpliftPct, 0)})`} value="baked into lines" muted />
            )}
            <Row label={`VAT (${fmtPct(vatRate, 0)})`} value={fmtMoney(computed.totals.vatAmount, currency)} />
            <div className="border-t border-line pt-2 mt-2">
              <Row label="TOTAL" value={fmtMoney(computed.totals.total, currency)} bold />
            </div>
          </div>

          {error && <div className="text-xs text-red-600 mt-3">{error}</div>}

          <div className="flex flex-col gap-2 mt-5">
            <button onClick={() => save('draft')} disabled={saving}
              className="btn btn-ghost w-full justify-center">
              <Save size={14} /> {saving ? 'Saving…' : 'Save as draft'}
            </button>
            <button onClick={() => save('pending_approval')} disabled={saving}
              className="btn btn-primary w-full justify-center">
              {saving ? 'Saving…' : 'Submit for approval'}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

// ─── LinePanel (slide-over) ────────────────────────────────────────────────
function LinePanel({
  mode, talent_type, draft, players, creators, globals, currency,
  addonsUpliftPct, preview,
  onSelectTalent, onChangePlatform, onPatch, onCancel, onCommit, onCommitAndAddAnother,
}: {
  mode: 'add' | 'edit';
  talent_type: 'player' | 'creator';
  draft: LineDraft;
  players: Player[];
  creators: Creator[];
  globals: {
    eng: number; aud: number; seas: number; ctype: number; lang: number; auth: number;
    obj: number; conf: MeasurementConfidence;
  };
  currency: string;
  addonsUpliftPct: number;
  preview: ReturnType<typeof computeLine> | null;
  onSelectTalent: (id: number) => void;
  onChangePlatform: (key: string) => void;
  onPatch: (patch: Partial<LineDraft>) => void;
  onCancel: () => void;
  onCommit: () => void;
  onCommitAndAddAnother: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  const platforms = talent_type === 'player' ? PLAYER_PLATFORMS : CREATOR_PLATFORMS;
  const talentList = talent_type === 'player'
    ? players.map(p => ({ id: p.id, label: p.nickname, meta: p.tier_code || '' }))
    : creators.map(c => ({ id: c.id, label: c.nickname, meta: c.tier_code || '' }));

  const [talentQuery, setTalentQuery] = useState('');
  const filteredTalent = talentQuery
    ? talentList.filter(t => t.label.toLowerCase().includes(talentQuery.toLowerCase()))
    : talentList;

  const tierCode = (() => {
    if (!draft.talent_id) return undefined;
    if (talent_type === 'player') return players.find(p => p.id === draft.talent_id)?.tier_code;
    return creators.find(c => c.id === draft.talent_id)?.tier_code;
  })();

  const canCommit = draft.talent_id !== null && draft.platform !== '' && draft.base_rate > 0;

  return (
    <div className="rounded-xl border border-line bg-white shadow-sm overflow-hidden mb-6" role="region" aria-label="Add deliverable">
      <div className="bg-gradient-to-r from-navy via-navyDark to-navy px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-[10px] tracking-widest text-green font-semibold">
            {mode === 'add' ? `+ ADD ${talent_type.toUpperCase()}` : `EDIT ${talent_type.toUpperCase()}`}
          </div>
          <div className="text-white font-semibold">
            {draft.talent_name || 'Select talent'}
            {tierCode && <span className="ml-2 text-xs text-white/60 font-normal">· {tierCode}</span>}
          </div>
        </div>
        <button onClick={onCancel} className="text-white/70 hover:text-white p-1" aria-label="Close">
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,340px] divide-x divide-line">
        <div>
          {mode === 'add' && !draft.talent_id && (
            <div className="p-5 space-y-3">
              <label className="label">Choose {talent_type}</label>
              <input
                autoFocus
                value={talentQuery}
                onChange={e => setTalentQuery(e.target.value)}
                placeholder={`Search ${talent_type}s…`}
                className="input"
              />
              <div className="max-h-80 overflow-y-auto border border-line rounded-lg divide-y divide-line">
                {filteredTalent.length === 0 && (
                  <div className="px-4 py-4 text-xs text-mute text-center">No matches</div>
                )}
                {filteredTalent.slice(0, 200).map(t => (
                  <button
                    key={t.id}
                    onClick={() => onSelectTalent(t.id)}
                    className="w-full text-left px-4 py-2.5 hover:bg-bg text-sm flex items-center justify-between"
                  >
                    <span className="font-medium text-ink">{t.label}</span>
                    {t.meta && <span className="text-xs text-mute">{t.meta}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {draft.talent_id && (
            <div className="p-5 space-y-5">
              {mode === 'add' && (
                <button
                  onClick={() => onPatch({ talent_id: null, talent_name: '', platform: '', platform_label: '', base_rate: 0 })}
                  className="text-xs text-label hover:text-ink underline underline-offset-2"
                >
                  ← Change {talent_type}
                </button>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Deliverable</label>
                  <select
                    value={draft.platform}
                    onChange={e => onChangePlatform(e.target.value)}
                    className="input"
                  >
                    {platforms.map(p => (
                      <option key={p.key} value={p.key}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Quantity</label>
                  <input
                    type="number" min={1} value={draft.qty}
                    onChange={e => onPatch({ qty: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <StatCell label="Base rate" value={draft.base_rate ? fmtMoney(draft.base_rate, currency) : '—'}
                  tone={draft.base_rate ? 'default' : 'warn'} />
                <StatCell label="Floor share" value={fmtPct(draft.floorShare, 0)} />
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-1">Per-line axis overrides</h3>
                <p className="text-xs text-label mb-3">Leave on &ldquo;Campaign default&rdquo; to inherit from the quote. Override any axis that differs for this specific deliverable.</p>
                <div className="grid grid-cols-1 gap-3">
                  <OverrideSelect
                    label="Content type"
                    options={AXIS_OPTIONS.contentType.map(o => ({ label: o.label, val: o.factor }))}
                    globalVal={globals.ctype}
                    value={draft.o_ctype}
                    onChange={(v) => onPatch({ o_ctype: v })}
                  />
                  <OverrideSelect
                    label="Engagement"
                    options={AXIS_OPTIONS.engagement.map(o => ({ label: o.label, val: o.factor }))}
                    globalVal={globals.eng}
                    value={draft.o_eng}
                    onChange={(v) => onPatch({ o_eng: v })}
                  />
                  <OverrideSelect
                    label="Audience"
                    options={AXIS_OPTIONS.audience.map(o => ({ label: o.label, val: o.factor }))}
                    globalVal={globals.aud}
                    value={draft.o_aud}
                    onChange={(v) => onPatch({ o_aud: v })}
                  />
                  <OverrideSelect
                    label="Seasonality"
                    options={AXIS_OPTIONS.seasonality.map(o => ({ label: o.label, val: o.factor }))}
                    globalVal={globals.seas}
                    value={draft.o_seas}
                    onChange={(v) => onPatch({ o_seas: v })}
                  />
                  <OverrideSelect
                    label="Language"
                    options={AXIS_OPTIONS.language.map(o => ({ label: o.label, val: o.factor }))}
                    globalVal={globals.lang}
                    value={draft.o_lang}
                    onChange={(v) => onPatch({ o_lang: v })}
                  />
                  <OverrideSelect
                    label="Authority"
                    options={AXIS_OPTIONS.authority.map(o => ({ label: o.label, val: o.factor }))}
                    globalVal={globals.auth}
                    value={draft.o_auth}
                    onChange={(v) => onPatch({ o_auth: v })}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-bg/60 flex flex-col">
          <div className="px-5 py-4 flex-1">
            <div className="text-[10px] tracking-widest text-label uppercase font-semibold mb-3">Live pricing preview</div>
            {draft.talent_id && draft.platform && preview ? (
              <div className="space-y-1 text-sm">
                <Row label="Base rate" value={fmtMoney(draft.base_rate, currency)} muted />
                <Row label="Social price" value={fmtMoney(preview.socialPrice, currency)} muted />
                <Row label="Authority floor" value={fmtMoney(preview.floorPrice, currency)} muted />
                <Row label="Confidence cap" value={`× ${preview.confCap.toFixed(2)}`} muted />
                {addonsUpliftPct > 0 && (
                  <Row label={`Rights uplift`} value={`+${fmtPct(addonsUpliftPct, 0)}`} muted />
                )}
                <div className="border-t border-line pt-2 mt-2">
                  <Row label="Unit price" value={fmtMoney(preview.finalUnit, currency)} />
                  <div className="mt-2 rounded-lg bg-green/10 px-3 py-2 border border-green/30">
                    <Row label="Line total" value={fmtMoney(preview.finalAmount, currency)} bold />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-mute">Pick a talent and deliverable to preview pricing.</div>
            )}
          </div>
          <div className="px-5 py-3 border-t border-line bg-white flex items-center justify-end gap-2 flex-wrap">
            <button onClick={onCancel} className="btn btn-ghost text-sm">Cancel</button>
            {mode === 'add' && (
              <button
                onClick={onCommitAndAddAnother}
                disabled={!canCommit}
                className="btn btn-ghost text-sm"
                title="Add this deliverable and open a new panel for the same talent"
              >
                <Plus size={14} /> Add & another
              </button>
            )}
            <button
              onClick={onCommit}
              disabled={!canCommit}
              className="btn btn-primary text-sm"
            >
              <Check size={14} /> {mode === 'add' ? 'Add to quote' : 'Save line'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── helper components ─────────────────────────────────────────────────────
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

function OverrideSelect({ label, options, globalVal, value, onChange }: {
  label: string;
  options: { label: string; val: number }[];
  globalVal: number;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const globalLabel = options.find(o => Math.abs(o.val - globalVal) < 0.0001)?.label ?? `×${globalVal}`;
  const current = value === null ? 'GLOBAL' : String(value);
  return (
    <div className="grid grid-cols-[140px,1fr] items-center gap-3">
      <label className="label !mb-0">{label}</label>
      <div className="flex items-center gap-2">
        <select
          value={current}
          onChange={e => {
            const v = e.target.value;
            onChange(v === 'GLOBAL' ? null : parseFloat(v));
          }}
          className="input flex-1"
        >
          <option value="GLOBAL">Campaign default · {globalLabel}</option>
          {options.map(o => (
            <option key={o.label} value={o.val}>{o.label}</option>
          ))}
        </select>
        {value !== null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-label hover:text-ink whitespace-nowrap"
            title="Reset to campaign default"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

function StatCell({ label, value, tone = 'default' }: {
  label: string; value: string; tone?: 'default' | 'warn';
}) {
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2">
      <div className="text-[10px] text-label uppercase tracking-wide">{label}</div>
      <div className={tone === 'warn' ? 'text-sm font-medium text-orange-500' : 'text-sm font-medium text-ink'}>{value}</div>
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
