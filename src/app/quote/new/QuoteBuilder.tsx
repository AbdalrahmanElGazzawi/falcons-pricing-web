'use client';
import { useMemo, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { computeLine, computeQuoteTotals, AXIS_OPTIONS, type MeasurementConfidence } from '@/lib/pricing';
import { fmtMoney, fmtPct, fmtCurrency } from '@/lib/utils';
import {
  PLAYER_PLATFORMS, CREATOR_PLATFORMS,
  type Player, type Creator, type Tier, type Addon,
} from '@/lib/types';
import { Trash2, Plus, Save, ArrowLeft, Pencil, Settings, Check, X as XIcon, HelpCircle, Send } from 'lucide-react';
import Link from 'next/link';
import { QuoteConfigurator } from './QuoteConfigurator';
import type { LineDraft } from './line-draft';
import { Section } from '@/components/Section';
import { PricingReference } from './PricingReference';

const SECTION_TITLES: Record<string, string> = {
  header: 'Quote header',
  globals: 'Campaign axes',
  addons: 'Add-ons',
  configurator: 'Add deliverables',
  lines: 'Quote lines',
  notes_totals: 'Notes & totals',
};

const LS_KEY = 'falcons.quote-draft.v2';

export function QuoteBuilder({
  players, creators, tiers, addons, ownerEmail, ownerName,
  initialSectionOrder, canEditLayout,
}: {
  players: Player[];
  creators: Creator[];
  tiers: Tier[];
  addons: Addon[];
  ownerEmail: string;
  ownerName?: string;
  initialSectionOrder: string[];
  canEditLayout: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Build/Preview tab
  const [view, setView] = useState<'campaign' | 'build' | 'summary'>('build');
  const [referenceOpen, setReferenceOpen] = useState(false);

  // ── Layout edit mode (super-admin only)
  const [sectionOrder, setSectionOrder] = useState<string[]>(
    initialSectionOrder.includes('configurator') ? initialSectionOrder : ['header','globals','addons','configurator','lines','notes_totals']
  );
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
  const [preparedByName, setPreparedByName] = useState(ownerName ?? '');
  const [preparedByEmail, setPreparedByEmail] = useState(ownerEmail ?? '');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [campaign, setCampaign] = useState('');
  const [currency, setCurrency] = useState('SAR');
  const [vatRate, setVatRate] = useState(0.15);
  const [usdRate, setUsdRate] = useState(3.75);
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

  // ── Add-ons (months per addon, presence of key = selected, 1 = default)
  const [addonMonths, setAddonMonths] = useState<Record<number, number>>({});
  const addonIds = useMemo(() => new Set(Object.keys(addonMonths).map(Number)), [addonMonths]);
  const addonsUpliftPct = useMemo(() => {
    return Object.entries(addonMonths).reduce((sum, [idStr, months]) => {
      const a = addons.find(x => x.id === Number(idStr));
      return sum + (a?.uplift_pct ?? 0) * (months || 1);
    }, 0);
  }, [addonMonths, addons]);

  // Toggle on/off (clicking a pill / checkbox)
  const toggleAddon = (id: number) => {
    setAddonMonths(s => {
      const next = { ...s };
      if (id in next) delete next[id]; else next[id] = 1;
      return next;
    });
  };
  // Bump months up/down (only when already selected)
  const setAddonMonth = (id: number, months: number) => {
    const clamped = Math.max(1, Math.min(60, Math.round(months || 1)));
    setAddonMonths(s => ({ ...s, [id]: clamped }));
  };

  // ── Lines
  const [lines, setLines] = useState<LineDraft[]>([]);

  // ── Wizard state
  const [wizard, setWizard] = useState<
    | { mode: 'add' }
    | { mode: 'edit'; initial: LineDraft }
    | null
  >(null);


  // ── Auto-save draft to localStorage so a tab switch / reload doesn't lose work
  const [hydrated, setHydrated] = useState(false);
  const [draftFound, setDraftFound] = useState(false);
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(LS_KEY) : null;
      if (raw) {
        const d = JSON.parse(raw);
        if (d.clientName) setClientName(d.clientName);
        if (d.clientEmail) setClientEmail(d.clientEmail);
        if (d.campaign) setCampaign(d.campaign);
        if (d.currency) setCurrency(d.currency);
        if (typeof d.vatRate === 'number') setVatRate(d.vatRate);
        if (typeof d.usdRate === 'number') setUsdRate(d.usdRate);
        if (d.notes) setNotes(d.notes);
        if (d.preparedByName) setPreparedByName(d.preparedByName);
        if (d.preparedByEmail) setPreparedByEmail(d.preparedByEmail);
        if (typeof d.eng === 'number') setEng(d.eng);
        if (typeof d.aud === 'number') setAud(d.aud);
        if (typeof d.seas === 'number') setSeas(d.seas);
        if (typeof d.ctype === 'number') setCtype(d.ctype);
        if (typeof d.lang === 'number') setLang(d.lang);
        if (typeof d.auth === 'number') setAuth(d.auth);
        if (typeof d.obj === 'number') setObj(d.obj);
        if (d.conf) setConf(d.conf);
        if (d.addonMonths && typeof d.addonMonths === 'object') {
          setAddonMonths(d.addonMonths);
        } else if (Array.isArray(d.addonIds)) {
          // legacy draft — treat as 1 month each
          setAddonMonths(Object.fromEntries(d.addonIds.map((i: number) => [i, 1])));
        }
        if (Array.isArray(d.lines)) setLines(d.lines);
        setDraftFound(true);
      }
    } catch {}
    setHydrated(true);
  }, []);


  // Persist draft on every meaningful change (after initial hydration)
  useEffect(() => {
    if (!hydrated) return;
    try {
      const draft = {
        clientName, clientEmail, campaign, currency, vatRate, usdRate, notes,
        preparedByName, preparedByEmail,
        eng, aud, seas, ctype, lang, auth, obj, conf,
        addonMonths,
        lines,
      };
      window.localStorage.setItem(LS_KEY, JSON.stringify(draft));
    } catch {}
  }, [hydrated, clientName, clientEmail, campaign, currency, vatRate, usdRate, notes, preparedByName, preparedByEmail,
      eng, aud, seas, ctype, lang, auth, obj, conf, addonMonths, lines]);

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
            prepared_by_name: preparedByName.trim() || null,
            prepared_by_email: preparedByEmail.trim() || null,
            currency,
            vat_rate: vatRate,
            usd_rate: usdRate,
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
          addonItems: Object.entries(addonMonths).map(([id, months]) => ({
            addon_id: Number(id), months,
          })),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Save failed (${res.status})`);
      }
      const j = await res.json();
      try { window.localStorage.removeItem(LS_KEY); } catch {}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
            <label className="label">Prepared by — your name</label>
            <input value={preparedByName} onChange={e => setPreparedByName(e.target.value)} className="input" placeholder="e.g. Abdalrahman ElGazzawi" />
            <p className="text-[10px] text-mute mt-1">Shown on the quotation PDF.</p>
          </div>
          <div>
            <label className="label">Prepared by — official email</label>
            <input value={preparedByEmail} onChange={e => setPreparedByEmail(e.target.value)} className="input" placeholder="sales@falcons.sa" />
            <p className="text-[10px] text-mute mt-1">Overrides your auth email on the PDF.</p>
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
          {currency === 'USD' && (
            <div>
              <label className="label">USD rate (SAR per 1 USD)</label>
              <input
                type="number" step="0.01" min={1}
                value={usdRate}
                onChange={e => setUsdRate(Math.max(0.01, parseFloat(e.target.value) || 3.75))}
                className="input"
              />
              <p className="text-[10px] text-mute mt-1">Default 3.75 (Saudi peg). All SAR values divide by this.</p>
            </div>
          )}
        </div>
      </div>
    ),
    globals: (
      <div className="card card-p">
        <h2 className="font-semibold mb-1">Campaign-level pricing axes</h2>
        <p className="text-xs text-label mb-4">These apply to every line by default. Override any axis on a per-line basis from the wizard.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AxisSelect label="Content type" hint="Who directs the creative — Organic 0.85× / Integrated 1.00× / Sponsored 1.15×." value={ctype} setValue={setCtype}
            options={AXIS_OPTIONS.contentType.map(o => ({ label: o.label, val: o.factor }))} />
          <AxisSelect label="Engagement" hint="Talent's last-90-day ER. 4–6% is baseline; >10% is elite." value={eng} setValue={setEng}
            options={AXIS_OPTIONS.engagement.map(o => ({ label: o.label, val: o.factor }))} />
          <AxisSelect label="Audience" hint="Audience match. MENA / Saudi unlocks +30% premium." value={aud} setValue={setAud}
            options={AXIS_OPTIONS.audience.map(o => ({ label: o.label, val: o.factor }))} />
          <AxisSelect label="Seasonality" hint="Campaign window. Ramadan + Worlds = peak demand." value={seas} setValue={setSeas}
            options={AXIS_OPTIONS.seasonality.map(o => ({ label: o.label, val: o.factor }))} />
          <AxisSelect label="Language" hint="Bilingual reaches both audiences in one activation." value={lang} setValue={setLang}
            options={AXIS_OPTIONS.language.map(o => ({ label: o.label, val: o.factor }))} />
          <AxisSelect label="Authority" hint="Championship credentials. Pro status sets a price floor." value={auth} setValue={setAuth}
            options={AXIS_OPTIONS.authority.map(o => ({ label: o.label, val: o.factor }))} />
          <AxisSelect label="Objective weight" hint="How much Authority counts. Conversion → 0.7. Awareness → 0.2." value={obj} setValue={setObj}
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
        <h2 className="font-semibold mb-1">Add-on rights packages</h2>
        <p className="text-xs text-mute mb-4">Each package has a per-month rate. Bump the months to extend the rights term.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {addons.map(a => {
            const checked = addonIds.has(a.id);
            const months = addonMonths[a.id] ?? 1;
            const totalUplift = (a.uplift_pct ?? 0) * months;
            return (
              <div key={a.id} className={[
                'p-3 rounded-lg border transition',
                checked ? 'border-green bg-green/5' : 'border-line hover:border-mute',
              ].join(' ')}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleAddon(a.id)}
                    className="mt-0.5"
                  />
                  <div className="text-sm flex-1 min-w-0">
                    <div className="font-medium text-ink flex items-center gap-1.5 flex-wrap">
                      <span>{a.label}</span>
                      <span className="text-green text-xs">+{fmtPct(a.uplift_pct, 0)}/mo</span>
                    </div>
                    {a.description && <div className="text-xs text-mute mt-0.5">{a.description}</div>}
                  </div>
                </label>
                {checked && (
                  <div className="mt-3 pt-3 border-t border-green/20 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-label">Months</span>
                    <div className="flex items-center gap-1">
                      <button type="button"
                        onClick={() => setAddonMonth(a.id, months - 1)}
                        disabled={months <= 1}
                        className="w-6 h-6 rounded border border-line text-label hover:bg-bg disabled:opacity-40">−</button>
                      <input type="number" min={1} max={60} value={months}
                        onChange={e => setAddonMonth(a.id, parseInt(e.target.value, 10) || 1)}
                        className="w-12 text-center text-sm input !py-1 !px-1" />
                      <button type="button"
                        onClick={() => setAddonMonth(a.id, months + 1)}
                        disabled={months >= 60}
                        className="w-6 h-6 rounded border border-line text-label hover:bg-bg disabled:opacity-40">+</button>
                    </div>
                    <span className="text-xs text-greenDark font-semibold tabular-nums">+{fmtPct(totalUplift, 0)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {addonsUpliftPct > 0 && (
          <div className="text-xs text-label mt-3">Total uplift across all add-ons: <strong className="text-green">+{fmtPct(addonsUpliftPct, 0)}</strong></div>
        )}
      </div>
    ),
    configurator: (
      <QuoteConfigurator
        players={players}
        creators={creators}
        tiers={tiers}
        globals={{ eng, aud, seas, ctype, lang, auth, obj, conf }}
        currency={currency}
        addonsUpliftPct={addonsUpliftPct}
        initialEdit={wizard?.mode === 'edit' ? wizard.initial : null}
        onCommit={(drafts) => {
          if (wizard?.mode === 'edit' && drafts.length > 0) {
            const updated = drafts[0];
            setLines(ls => ls.map(l => l.uid === updated.uid ? updated : l));
            closeWizard();
          } else {
            setLines(ls => [...ls, ...drafts]);
          }
        }}
        onCancelEdit={wizard?.mode === 'edit' ? closeWizard : undefined}
      />
    ),
    lines: (
      <div className="card">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <h2 className="font-semibold">Quote lines</h2>
          <div className="text-xs text-mute">{computed.rows.length} added</div>
        </div>

        {computed.rows.length === 0 ? (
          <div className="px-5 py-12 text-center text-label text-sm">
            No lines yet. Use the <strong>Add deliverables</strong> section above.
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
    <div className="space-y-4 lg:pb-0 pb-28">
      {/* Top strip: back, reference button (super admin layout edit shows on Campaign tab only) */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-label hover:text-ink">
          <ArrowLeft size={14} /> Back
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setReferenceOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs text-label hover:text-ink px-2.5 py-1.5 rounded-md hover:bg-bg"
            title="Quick reference: how the engine works"
          >
            <HelpCircle size={14} /> Reference
          </button>
          {canEditLayout && view === 'campaign' && (
            <>
              {layoutError && <span className="text-xs text-red-600">{layoutError}</span>}
              {layoutBusy && <span className="text-xs text-label">Saving layout…</span>}
              {editingLayout ? (
                <button onClick={() => setEditingLayout(false)} className="btn btn-primary text-xs">
                  <Check size={12} /> Done editing
                </button>
              ) : (
                <button onClick={() => setEditingLayout(true)} className="btn btn-ghost text-xs"
                  title="Reorder Campaign sections (super admin only)">
                  <Settings size={12} /> Customize layout
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Restored-draft banner */}
      {draftFound && computed.rows.length > 0 && (
        <div className="rounded-lg border border-amber/40 bg-amber/5 px-4 py-3 text-sm text-amber flex items-center justify-between gap-3 flex-wrap">
          <div>
            <strong>Draft restored.</strong> {computed.rows.length} line{computed.rows.length === 1 ? '' : 's'} from your last session.
          </div>
          <button
            onClick={() => {
              if (!confirm('Discard the saved draft and start fresh?')) return;
              try { window.localStorage.removeItem(LS_KEY); } catch {}
              setLines([]); setClientName(''); setClientEmail(''); setCampaign(''); setNotes('');
              setAddonMonths({}); setDraftFound(false);
            }}
            className="text-xs underline hover:text-ink">Discard draft</button>
        </div>
      )}

      {editingLayout && view === 'campaign' && (
        <div className="rounded-lg border border-green/40 bg-greenSoft px-4 py-3 text-xs text-greenDark">
          Use the ▲ ▼ buttons on each Campaign section to reorder. Saves automatically and is audit-logged.
        </div>
      )}

      {/* 3-tab strip */}
      <div className="flex items-center gap-1 border-b border-line overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <TabButton active={view === 'campaign'} onClick={() => setView('campaign')}>① Campaign</TabButton>
        <TabButton active={view === 'build'} onClick={() => setView('build')}>② Build</TabButton>
        <TabButton active={view === 'summary'} onClick={() => setView('summary')}>③ Summary</TabButton>
        <div className="ml-auto pb-2 hidden sm:flex items-center gap-3 text-xs text-label whitespace-nowrap">
          <span>{computed.rows.length} line{computed.rows.length === 1 ? '' : 's'}</span>
          <span className="text-ink font-semibold">{fmtCurrency(computed.totals.total, currency, usdRate)}</span>
        </div>
      </div>

      {/* Tab content + desktop sticky rail */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          {/* ① CAMPAIGN — header / globals / addons */}
          <div className={view === 'campaign' ? '' : 'hidden'}>
          {(() => {
            const ids = sectionOrder.filter(id => ['header','globals','addons'].includes(id));
            return (
              <div className="space-y-6">
                {ids.map((id, idx) => (
                  <Section
                    key={id}
                    id={id}
                    title={SECTION_TITLES[id] ?? id}
                    editable={editingLayout}
                    isFirst={idx === 0}
                    isLast={idx === ids.length - 1}
                    onMoveUp={() => moveSection(id, -1)}
                    onMoveDown={() => moveSection(id, 1)}
                  >
                    {sectionNodes[id]}
                  </Section>
                ))}
                <div className="text-xs text-mute text-center pt-2">
                  Done with campaign settings? Switch to <button onClick={() => setView('build')} className="text-greenDark hover:underline font-medium">② Build →</button>
                </div>
              </div>
            );
          })()}
          </div>

          {/* ② BUILD — configurator hero + compact lines list */}
          <div className={view === 'build' ? 'space-y-6' : 'hidden'}>
              {/* Compact add-on pill row — adjust rights while building */}
              <div className="card card-p">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[11px] uppercase tracking-wider text-label font-semibold">
                    Rights & add-ons <span className="text-mute font-normal normal-case ml-1.5">— per-month rate, multiplied by your duration</span>
                  </div>
                  {addonsUpliftPct > 0 && (
                    <div className="text-xs text-greenDark font-semibold">+{fmtPct(addonsUpliftPct, 0)} total</div>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {addons.map(a => {
                    const checked = addonIds.has(a.id);
                    const months = addonMonths[a.id] ?? 1;
                    const totalUplift = (a.uplift_pct ?? 0) * months;
                    return (
                      <div
                        key={a.id}
                        className={[
                          'p-2.5 rounded-lg border transition',
                          checked ? 'border-green bg-green/5' : 'border-line hover:border-mute',
                        ].join(' ')}
                      >
                        <button
                          type="button"
                          onClick={() => toggleAddon(a.id)}
                          className="w-full text-left"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={['text-sm font-medium', checked ? 'text-greenDark' : 'text-ink'].join(' ')}>{a.label}</span>
                            <span className="text-[11px] text-green font-semibold">+{fmtPct(a.uplift_pct, 0)}/mo</span>
                          </div>
                          {a.description && <div className="text-[11px] text-mute mt-0.5 leading-snug">{a.description}</div>}
                        </button>
                        {checked && (
                          <div className="mt-2 pt-2 border-t border-green/20 flex items-center justify-between gap-2">
                            <span className="text-[10px] uppercase tracking-wider text-label font-semibold">Months</span>
                            <div className="flex items-center gap-1">
                              <button type="button" onClick={() => setAddonMonth(a.id, months - 1)} disabled={months <= 1}
                                className="w-6 h-6 rounded border border-line text-label hover:bg-bg disabled:opacity-40 text-sm leading-none">−</button>
                              <input type="number" min={1} max={60} value={months}
                                onChange={e => setAddonMonth(a.id, parseInt(e.target.value, 10) || 1)}
                                className="w-10 text-center text-xs input !py-0.5 !px-1" />
                              <button type="button" onClick={() => setAddonMonth(a.id, months + 1)} disabled={months >= 60}
                                className="w-6 h-6 rounded border border-line text-label hover:bg-bg disabled:opacity-40 text-sm leading-none">+</button>
                            </div>
                            <span className="text-[11px] text-greenDark font-semibold tabular-nums">+{fmtPct(totalUplift, 0)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {sectionNodes.configurator}
              {sectionNodes.lines}
              <div className="text-xs text-mute text-center pt-2">
                Done adding? Switch to <button onClick={() => setView('summary')} className="text-greenDark hover:underline font-medium">③ Summary →</button> to review and submit.
              </div>
          </div>

          {/* ③ SUMMARY — preview + notes + lines (editable) */}
          <div className={view === 'summary' ? 'space-y-6' : 'hidden'}>
              <QuotePreview
                clientName={clientName}
                clientEmail={clientEmail}
                campaign={campaign}
                ownerEmail={ownerEmail}
                currency={currency}
                usdRate={usdRate}
                vatRate={vatRate}
                notes={notes}
                rows={computed.rows}
                totals={computed.totals}
                addonsUpliftPct={addonsUpliftPct}
              />
              {sectionNodes.notes_totals}
              {/* Editable lines below the preview for last-mile tweaks */}
              <details className="card overflow-hidden group">
                <summary className="px-5 py-3 text-sm font-medium cursor-pointer flex items-center justify-between hover:bg-bg">
                  <span>Edit lines ({computed.rows.length})</span>
                  <span className="text-xs text-mute group-open:hidden">click to expand</span>
                </summary>
                <div className="border-t border-line">{sectionNodes.lines}</div>
              </details>
          </div>
        </div>

        {/* Desktop sticky save rail */}
        <aside className="hidden lg:block lg:sticky lg:top-6 self-start">
          <SaveRail
            totals={computed.totals}
            rowCount={computed.rows.length}
            currency={currency}
            vatRate={vatRate}
            usdRate={usdRate}
            addonsUpliftPct={addonsUpliftPct}
            saving={saving}
            error={error}
            clientName={clientName}
            onDraft={() => save('draft')}
            onSubmit={() => save('pending_approval')}
          />
        </aside>
      </div>

      {/* Mobile fixed bottom action bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-line shadow-lift">
        <SaveBarMobile
          totals={computed.totals}
          rowCount={computed.rows.length}
          currency={currency}
          usdRate={usdRate}
          saving={saving}
          clientName={clientName}
          onDraft={() => save('draft')}
          onSubmit={() => save('pending_approval')}
        />
      </div>

      {/* Reference modal */}
      {referenceOpen && (
        <div
          className="fixed inset-0 z-50 bg-navy/50 backdrop-blur-sm flex items-start md:items-center justify-center p-4 overflow-y-auto"
          onClick={() => setReferenceOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-lift w-full max-w-3xl my-8 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line bg-bg">
              <div>
                <h2 className="text-base font-semibold">Reference — quick guide</h2>
                <p className="text-xs text-mute">Phase status, platform anchor, and the 5-step builder workflow.</p>
              </div>
              <button onClick={() => setReferenceOpen(false)} className="p-2 -mr-2 hover:bg-line rounded-md">
                <XIcon size={18} />
              </button>
            </div>
            <div className="p-5 max-h-[75vh] overflow-y-auto">
              <PricingReference />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── helpers ───────────────────────────────────────────────────────────────
function AxisSelect({ label, hint, value, setValue, options }: {
  label: string; hint?: string;
  value: number; setValue: (v: number) => void;
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
      {hint && <p className="text-[10px] text-mute mt-1 leading-snug">{hint}</p>}
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
  clientName, clientEmail, campaign, ownerEmail, currency, usdRate, vatRate, notes,
  rows, totals, addonsUpliftPct,
}: {
  clientName: string;
  clientEmail: string;
  campaign: string;
  ownerEmail: string;
  currency: string;
  usdRate: number;
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
            <div className="text-3xl font-extrabold mt-1">{fmtCurrency(totals.total, currency, usdRate)}</div>
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
                  <td className="px-4 py-3 text-right">{fmtCurrency(r.finalUnit, currency, usdRate)}</td>
                  <td className="px-6 py-3 text-right font-semibold text-ink">{fmtCurrency(r.finalAmount, currency, usdRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Totals */}
      <div className="px-6 py-5 border-t border-line">
        <div className="ml-auto max-w-xs space-y-1.5 text-sm">
          <Row label="Subtotal" value={fmtCurrency(totals.subtotal, currency, usdRate)} muted />
          {addonsUpliftPct > 0 && (
            <Row label={`Add-on uplift +${fmtPct(addonsUpliftPct, 0)}`} value="in lines" muted />
          )}
          <Row label={`VAT (${fmtPct(vatRate, 0)})`} value={fmtCurrency(totals.vatAmount, currency, usdRate)} muted />
          <div className="border-t border-line pt-2">
            <Row label="TOTAL" value={fmtCurrency(totals.total, currency, usdRate)} bold />
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
// ─── Save rail (desktop sticky) ─────────────────────────────────────────────
function SaveRail({
  totals, rowCount, currency, vatRate, usdRate, addonsUpliftPct, saving, error, clientName,
  onDraft, onSubmit,
}: {
  totals: { subtotal: number; preVat: number; vatAmount: number; total: number };
  rowCount: number; currency: string; vatRate: number; usdRate: number; addonsUpliftPct: number;
  saving: boolean; error: string | null; clientName: string;
  onDraft: () => void; onSubmit: () => void;
}) {
  const blocked = clientName.trim() === '' || rowCount === 0;
  return (
    <div className="card p-4 space-y-3">
      <div className="kpi-label">Live total</div>
      <div>
        <div className="kpi-value">{fmtCurrency(totals.total, currency, usdRate)}</div>
        <div className="kpi-sub mt-1">
          {rowCount} line{rowCount === 1 ? '' : 's'} · VAT {fmtPct(vatRate, 0)}{currency === 'USD' && ` · @ ${usdRate} SAR/USD`}
        </div>
      </div>
      <div className="border-t border-line pt-3 space-y-1.5 text-xs">
        <Row label="Subtotal" value={fmtCurrency(totals.subtotal, currency, usdRate)} muted />
        {addonsUpliftPct > 0 && (
          <Row label={`Add-on uplift +${fmtPct(addonsUpliftPct, 0)}`} value="in lines" muted />
        )}
        <Row label={`VAT (${fmtPct(vatRate, 0)})`} value={fmtCurrency(totals.vatAmount, currency, usdRate)} muted />
      </div>
      <button
        onClick={onSubmit}
        disabled={saving || blocked}
        className="btn btn-primary w-full justify-center disabled:opacity-50"
      >
        <Send size={14} /> {saving ? 'Saving…' : 'Submit for approval'}
      </button>
      <button
        onClick={onDraft}
        disabled={saving || blocked}
        className="btn btn-ghost w-full justify-center text-sm disabled:opacity-50"
      >
        <Save size={14} /> Save as draft
      </button>
      {error && <div className="text-xs text-red-600">{error}</div>}
      {clientName.trim() === '' && rowCount > 0 && (
        <div className="text-[11px] text-amber">Client name required to save.</div>
      )}
      {rowCount === 0 && (
        <div className="text-[11px] text-mute">Add at least one deliverable to enable save.</div>
      )}
    </div>
  );
}

// ─── Save bar (mobile fixed bottom) ────────────────────────────────────────
function SaveBarMobile({
  totals, rowCount, currency, usdRate, saving, clientName, onDraft, onSubmit,
}: {
  totals: { total: number };
  rowCount: number; currency: string; usdRate: number; saving: boolean; clientName: string;
  onDraft: () => void; onSubmit: () => void;
}) {
  const blocked = clientName.trim() === '' || rowCount === 0;
  return (
    <div className="px-4 py-3 flex items-center gap-3 max-w-screen-md mx-auto">
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-mute">Total · {rowCount} line{rowCount === 1 ? '' : 's'}</div>
        <div className="text-base font-bold text-ink truncate">{fmtCurrency(totals.total, currency, usdRate)}</div>
      </div>
      <button
        onClick={onDraft}
        disabled={saving || blocked}
        className="btn btn-ghost text-xs px-3 disabled:opacity-50"
      >
        <Save size={12} /> Draft
      </button>
      <button
        onClick={onSubmit}
        disabled={saving || blocked}
        className="btn btn-primary text-xs px-3 disabled:opacity-50"
      >
        {saving ? '…' : <><Send size={12} /> Submit</>}
      </button>
    </div>
  );
}

