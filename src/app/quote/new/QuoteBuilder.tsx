'use client';
import { useLocale } from '@/lib/i18n/Locale';
import { useMemo, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { computeLine, computeQuoteTotals, AXIS_OPTIONS, type MeasurementConfidence } from '@/lib/pricing';
import { fmtMoney, fmtPct, fmtCurrency } from '@/lib/utils';
import {
  PLAYER_PLATFORMS, CREATOR_PLATFORMS,
  type Player, type Creator, type Tier, type Addon,
} from '@/lib/types';
import { Trash2, Plus, Save, ArrowLeft, Pencil, Settings, Check, X as XIcon, HelpCircle, Send, FolderOpen } from 'lucide-react';
import Link from 'next/link';
import { QuoteConfigurator } from './QuoteConfigurator';
import { newUid, type LineDraft } from './line-draft';
import { Section } from '@/components/Section';
import { PricingReference } from './PricingReference';

const SECTION_TITLES: Record<string, string> = {
  brand_brief: 'Brand brief',
  header: 'Quote header',
  globals: 'Campaign axes',
  addons: 'Add-ons',
  configurator: 'Add deliverables',
  lines: 'Quote lines',
  notes_totals: 'Notes & totals',
};

const LS_KEY = 'falcons.quote-draft.v2';

// Lightweight summary of a saved draft (status='draft' quote) shown in the picker.
export type DraftSummary = {
  id: string;
  quote_number: string;
  client_name: string;
  campaign: string | null;
  currency: string;
  total: number;
  updated_at: string;
};

export function QuoteBuilder({
  players, creators, tiers, addons, ownerEmail, ownerName,
  initialSectionOrder, canEditLayout, drafts, ownerTitle,
}: {
  players: Player[];
  creators: Creator[];
  tiers: Tier[];
  addons: Addon[];
  ownerEmail: string;
  ownerName?: string;
  ownerTitle?: string;
  initialSectionOrder: string[];
  canEditLayout: boolean;
  drafts?: DraftSummary[];
}) {
  const { t } = useLocale();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Build/Preview tab
  // Land on Campaign tab for fresh quotes — sales should set client + the
  // campaign-level axes BEFORE picking deliverables. Loading a saved draft
  // explicitly switches to Build (see loadDraft below).
  const [view, setView] = useState<'campaign' | 'build' | 'summary'>('campaign');
  const [referenceOpen, setReferenceOpen] = useState(false);

  // ── Draft picker (load a saved status='draft' quote into the builder)
  const draftsList = drafts ?? [];
  const [draftPickerOpen, setDraftPickerOpen] = useState(false);
  const [loadingDraftId, setLoadingDraftId] = useState<string | null>(null);
  const [draftLoadError, setDraftLoadError] = useState<string | null>(null);

  // ── Layout edit mode (super-admin only)
  const [sectionOrder, setSectionOrder] = useState<string[]>(
    initialSectionOrder.includes('configurator') ? initialSectionOrder : ['header','brand_brief','globals','configurator','lines','notes_totals']
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
  const [preparedByTitle, setPreparedByTitle] = useState(ownerTitle ?? '');

  // Brand brief — descriptive context, not pricing-influencing
  const [demoTarget, setDemoTarget] = useState<string[]>([]);
  const [genderSkew, setGenderSkew] = useState<'male' | 'female' | 'mixed'>('mixed');
  const [region, setRegion] = useState<string>('KSA');
  const [exclusivity, setExclusivity] = useState(false);
  const [exclusivityMonths, setExclusivityMonths] = useState(0);
  const [kpiFocus, setKpiFocus] = useState<string>('');

  // Track which axes have been auto-suggested by the Brand Brief — so we can show
  // the small 'auto' badge and let the rep override at any time.
  const [autoAxes, setAutoAxes] = useState<Set<'lang'|'obj'>>(new Set());
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
        if (d.preparedByTitle) setPreparedByTitle(d.preparedByTitle);
        if (Array.isArray(d.demoTarget)) setDemoTarget(d.demoTarget);
        if (d.genderSkew) setGenderSkew(d.genderSkew);
        if (d.region) setRegion(d.region);
        if (typeof d.exclusivity === 'boolean') setExclusivity(d.exclusivity);
        if (typeof d.exclusivityMonths === 'number') setExclusivityMonths(d.exclusivityMonths);
        if (d.kpiFocus) setKpiFocus(d.kpiFocus);
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




  // ── Brief → axis auto-fill. The brand brief is the discovery layer the
  // rep fills naturally; we derive sensible defaults for the multipliers,
  // marked with an 'auto' badge so reps can override.
  useEffect(() => {
    if (!kpiFocus) return;
    const map: Record<string, number> = {
      awareness:     0.20,
      consideration: 0.50,
      engagement:    0.55,
      conversion:    0.70,
      authority:     1.00,
    };
    const w = map[kpiFocus];
    if (typeof w === 'number') {
      setObj(w);
      setAutoAxes(prev => new Set(prev).add('obj'));
    }
  }, [kpiFocus]);

  useEffect(() => {
    // Region → language axis suggestion. KSA = Arabic; GCC/MENA = Bilingual;
    // EU/Global = English.
    let f = 1.00;
    if (region === 'KSA') f = 1.10;
    else if (region === 'GCC' || region === 'MENA') f = 1.20;
    else if (region === 'EU' || region === 'Global') f = 1.00;
    else if (region === 'MENA+SEA') f = 1.20;
    setLang(f);
    setAutoAxes(prev => new Set(prev).add('lang'));
  }, [region]);

  // Persist draft on every meaningful change (after initial hydration)
  useEffect(() => {
    if (!hydrated) return;
    try {
      const draft = {
        clientName, clientEmail, campaign, currency, vatRate, usdRate, notes,
        preparedByName, preparedByTitle, preparedByEmail,
        demoTarget, genderSkew, region, exclusivity, exclusivityMonths, kpiFocus,
        eng, aud, seas, ctype, lang, auth, obj, conf,
        addonMonths,
        lines,
      };
      window.localStorage.setItem(LS_KEY, JSON.stringify(draft));
    } catch {}
  }, [hydrated, clientName, clientEmail, campaign, currency, vatRate, usdRate, notes, preparedByName, preparedByTitle, preparedByEmail, demoTarget, genderSkew, region, exclusivity, exclusivityMonths, kpiFocus,
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
        rightsPct: (() => {
          const am = (l as any).addon_months || {};
          return Object.entries(am).reduce((s, [idStr, mo]) => {
            const a = addons.find(x => x.id === Number(idStr));
            return s + (a?.uplift_pct ?? 0) * (Number(mo) || 1);
          }, 0);
        })(),
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
            prepared_by_title: preparedByTitle.trim() || null,
            demo_target: demoTarget,
            gender_skew: genderSkew,
            region: region,
            exclusivity: exclusivity,
            exclusivity_months: exclusivityMonths,
            kpi_focus: kpiFocus || null,
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
            addon_months: (r as any).addon_months || {},
            rights_pct: (() => {
              const am = (r as any).addon_months || {};
              return Object.entries(am).reduce((s: number, [idStr, mo]) => {
                const a = addons.find(x => x.id === Number(idStr));
                return s + (a?.uplift_pct ?? 0) * (Number(mo) || 1);
              }, 0);
            })(),
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

  // Names of axes that have been explicitly overridden on this line — used as
  // the tooltip on the "N overrides" chip so sales knows exactly which axes
  // diverge from the campaign defaults.
  const overrideAxisNames = (l: LineDraft) => {
    const names: string[] = [];
    if (l.o_ctype !== null) names.push('Content type');
    if (l.o_eng   !== null) names.push('Engagement');
    if (l.o_aud   !== null) names.push('Audience');
    if (l.o_seas  !== null) names.push(l.talent_type === 'creator' ? 'Production' : 'Seasonality');
    if (l.o_lang  !== null) names.push('Language');
    if (l.o_auth  !== null) names.push('Authority');
    return names;
  };
  /**
   * Load an existing draft (status='draft' quote) into the builder.
   * Pulls header + lines + addons from the API, then rehydrates every state slot.
   * Lines are reconstructed best-effort: the DB stores the human platform label,
   * so we resolve it back to a platform key by label match. irl/floorShare are
   * looked up from the local players/tiers props.
   */
  async function loadDraft(draftId: string) {
    setDraftLoadError(null);
    setLoadingDraftId(draftId);
    try {
      const res = await fetch(`/api/quote/${draftId}`, { cache: 'no-store' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Load failed (${res.status})`);
      }
      const { header: h, lines: dbLines, addons: dbAddons } = await res.json();

      // ── Hydrate header
      setClientName(h.client_name ?? '');
      setClientEmail(h.client_email ?? '');
      setCampaign(h.campaign ?? '');
      setCurrency(h.currency ?? 'SAR');
      setVatRate(typeof h.vat_rate === 'number' ? h.vat_rate : 0.15);
      setUsdRate(typeof h.usd_rate === 'number' ? h.usd_rate : 3.75);
      setNotes(h.notes ?? '');
      setPreparedByName(h.prepared_by_name ?? ownerName ?? '');
      setPreparedByTitle(h.prepared_by_title ?? '');
      setPreparedByEmail(h.prepared_by_email ?? ownerEmail ?? '');
      setDemoTarget(Array.isArray(h.demo_target) ? h.demo_target : []);
      setGenderSkew(h.gender_skew === 'male' || h.gender_skew === 'female' ? h.gender_skew : 'mixed');
      setRegion(h.region ?? 'KSA');
      setExclusivity(!!h.exclusivity);
      setExclusivityMonths(typeof h.exclusivity_months === 'number' ? h.exclusivity_months : 0);
      setKpiFocus(h.kpi_focus ?? '');

      // ── Hydrate global axes
      if (typeof h.eng_factor === 'number') setEng(h.eng_factor);
      if (typeof h.audience_factor === 'number') setAud(h.audience_factor);
      if (typeof h.seasonality_factor === 'number') setSeas(h.seasonality_factor);
      if (typeof h.content_type_factor === 'number') setCtype(h.content_type_factor);
      if (typeof h.language_factor === 'number') setLang(h.language_factor);
      if (typeof h.authority_factor === 'number') setAuth(h.authority_factor);
      if (typeof h.objective_weight === 'number') setObj(h.objective_weight);
      if (h.measurement_confidence) setConf(h.measurement_confidence);

      // The brief auto-suggested axes once when loaded; rep can override anytime.
      // Clear the 'auto' badges since these factors came from a saved draft, not a fresh inference.
      setAutoAxes(new Set());

      // ── Hydrate add-ons
      const addonMap: Record<number, number> = {};
      (dbAddons || []).forEach((a: any) => {
        if (typeof a?.addon_id === 'number') {
          addonMap[a.addon_id] = Math.max(1, Math.min(60, Math.round(a.months ?? 1)));
        }
      });
      setAddonMonths(addonMap);

      // ── Hydrate lines (reverse-map platform label → platform key, look up irl/floorShare)
      const newLines: LineDraft[] = (dbLines || []).map((l: any) => {
        const isPlayer = l.talent_type === 'player';
        const playerObj = isPlayer ? players.find(p => p.id === l.player_id) : null;
        const creatorObj = !isPlayer ? creators.find(c => c.id === l.creator_id) : null;

        // The save path stores the human label under quote_lines.platform, so we
        // resolve back to the platform key. Fall back to the stored value so the
        // line still renders even if the label changed since it was saved.
        const allPlatforms = isPlayer ? PLAYER_PLATFORMS : CREATOR_PLATFORMS;
        const matched = allPlatforms.find(p => p.label === l.platform);
        const platformKey = matched?.key ?? l.platform;
        const platformLabel = matched?.label ?? l.platform;

        // irl + floorShare aren't in quote_lines — derive from the talent
        const irl = (playerObj as any)?.rate_irl ?? 0;
        const tierCode = (playerObj as any)?.tier_code ?? (creatorObj as any)?.tier_code;
        const tier = tierCode ? tiers.find(tt => tt.code === tierCode) : undefined;
        const floorShare = tier?.floor_share ?? (playerObj as any)?.floor_share ?? 0.5;

        const addonMonthsForLine: Record<number, number> = {};
        if (l.addon_months && typeof l.addon_months === 'object') {
          Object.entries(l.addon_months).forEach(([k, v]) => {
            const idNum = Number(k);
            const moNum = Number(v);
            if (!Number.isNaN(idNum) && !Number.isNaN(moNum)) {
              addonMonthsForLine[idNum] = Math.max(1, Math.min(60, Math.round(moNum)));
            }
          });
        }

        return {
          uid: newUid(),
          talent_type: isPlayer ? 'player' : 'creator',
          talent_id: isPlayer ? (l.player_id ?? null) : (l.creator_id ?? null),
          talent_name: l.talent_name ?? '',
          platform: platformKey,
          platform_label: platformLabel,
          base_rate: Number(l.base_rate ?? 0),
          qty: Math.max(1, Math.round(Number(l.qty ?? 1))),
          irl,
          floorShare,
          o_ctype: l.line_content_type ?? null,
          o_eng:   l.line_eng          ?? null,
          o_aud:   l.line_audience     ?? null,
          o_seas:  l.line_seasonality  ?? null,
          o_lang:  l.line_language     ?? null,
          o_auth:  l.line_authority    ?? null,
          addon_months: addonMonthsForLine,
        };
      });
      setLines(newLines);

      setDraftPickerOpen(false);
      // Drop the auto-saved single-slot draft so it doesn't fight us on the next render.
      try { window.localStorage.removeItem(LS_KEY); } catch {}
      setDraftFound(false);
      setView('build');
    } catch (e: any) {
      setDraftLoadError(e?.message || 'Could not load draft');
    } finally {
      setLoadingDraftId(null);
    }
  }

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
        <p className="text-xs text-label mb-4">These multipliers apply to every line by default. Some are auto-suggested from your Brand Brief above (look for the green <span className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold bg-green/15 text-greenDark">auto</span> badge) — change them anytime. Override per-line in the Build tab.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AxisSelect label="Content type" hint="Who directs the creative — Organic 0.85× / Integrated 1.00× / Sponsored 1.15×." value={ctype} setValue={setCtype}
            options={AXIS_OPTIONS.contentType.map(o => ({ label: o.label, val: o.factor }))} />
          <AxisSelect label="Engagement" hint="Talent's last-90-day ER. 4–6% is baseline; >10% is elite." value={eng} setValue={setEng}
            options={AXIS_OPTIONS.engagement.map(o => ({ label: o.label, val: o.factor }))} />
          <AxisSelect label="Audience" hint="Audience match. MENA / Saudi unlocks +30% premium." value={aud} setValue={setAud}
            options={AXIS_OPTIONS.audience.map(o => ({ label: o.label, val: o.factor }))} />
          <AxisSelect label="Seasonality" hint="Campaign window. Ramadan + Worlds = peak demand." value={seas} setValue={setSeas}
            options={AXIS_OPTIONS.seasonality.map(o => ({ label: o.label, val: o.factor }))} />
          <AxisSelect label="Language" hint="Bilingual reaches both audiences in one activation." value={lang} setValue={setLang} auto={autoAxes.has('lang')} onClearAuto={() => setAutoAxes(s => { const n = new Set(s); n.delete('lang'); return n; })}
            options={AXIS_OPTIONS.language.map(o => ({ label: o.label, val: o.factor }))} />
          <AxisSelect label="Authority" hint="Championship credentials. Pro status sets a price floor." value={auth} setValue={setAuth}
            options={AXIS_OPTIONS.authority.map(o => ({ label: o.label, val: o.factor }))} />
          <AxisSelect label="Objective weight" hint="How much Authority counts. Conversion → 0.7. Awareness → 0.2." value={obj} setValue={setObj} auto={autoAxes.has('obj')} onClearAuto={() => setAutoAxes(s => { const n = new Set(s); n.delete('obj'); return n; })}
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
    brand_brief: (
      <div className="card card-p">
        <h2 className="font-semibold mb-1">{t('qb.brief.title')}</h2>
        <p className="text-xs text-mute mb-4">{t('qb.brief.subtitle')}</p>

        {/* Demographic target */}
        <div className="mb-4">
          <label className="label">{t('qb.brief.demographic')}</label>
          <div className="flex flex-wrap gap-2">
            {['13-17','18-24','25-34','35-44','45+'].map(b => {
              const checked = demoTarget.includes(b);
              return (
                <button key={b} type="button"
                  onClick={() => setDemoTarget(s => checked ? s.filter(x => x !== b) : [...s, b])}
                  className={[
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition',
                    checked ? 'bg-green text-white border-green' : 'bg-white text-label border-line hover:border-green',
                  ].join(' ')}>
                  {b}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-mute mt-1">Pick all that apply. Brands always ask &ldquo;who&apos;s the audience?&rdquo;</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {/* Gender skew */}
          <div>
            <label className="label">{t('qb.brief.gender')}</label>
            <div className="grid grid-cols-3 gap-2">
              {([['male','Male'],['mixed','Mixed'],['female','Female']] as const).map(([v, lbl]) => (
                <button key={v} type="button" onClick={() => setGenderSkew(v)}
                  className={[
                    'px-2 py-1.5 rounded text-xs font-medium border transition',
                    genderSkew === v ? 'bg-navy text-white border-navy' : 'bg-white text-label border-line hover:border-mute',
                  ].join(' ')}>{lbl}</button>
              ))}
            </div>
          </div>

          {/* Region */}
          <div>
            <label className="label">{t('qb.brief.region')}</label>
            <select value={region} onChange={e => setRegion(e.target.value)} className="input">
              <option value="KSA">KSA only</option>
              <option value="GCC">GCC</option>
              <option value="MENA">MENA</option>
              <option value="MENA+SEA">MENA + SEA</option>
              <option value="EU">EU</option>
              <option value="Global">Global</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {/* KPI focus */}
          <div>
            <label className="label">{t('qb.brief.kpi')}</label>
            <select value={kpiFocus} onChange={e => setKpiFocus(e.target.value)} className="input">
              <option value="">{t('qb.brief.kpi.placeholder')}</option>
              <option value="awareness">{t('qb.brief.kpi.awareness')}</option>
              <option value="consideration">{t('qb.brief.kpi.consideration')}</option>
              <option value="engagement">{t('qb.brief.kpi.engagement')}</option>
              <option value="conversion">{t('qb.brief.kpi.conversion')}</option>
              <option value="authority">{t('qb.brief.kpi.authority')}</option>
            </select>
            <p className="text-[10px] text-mute mt-1">Brands rarely tell you this directly. Ask: &ldquo;what does success look like?&rdquo;</p>
          </div>

          {/* Exclusivity */}
          <div>
            <label className="label">{t('qb.brief.exclusivity')}</label>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={exclusivity} onChange={e => setExclusivity(e.target.checked)} />
                <span className="text-sm">{t('qb.brief.exclusivity.req')}</span>
              </label>
              {exclusivity && (
                <div className="flex items-center gap-1 ml-3">
                  <input type="number" min={1} max={24} value={exclusivityMonths || 1}
                    onChange={e => setExclusivityMonths(Math.max(1, Math.min(24, parseInt(e.target.value, 10) || 1)))}
                    className="input !py-1 !px-2 w-16 text-sm" />
                  <span className="text-xs text-label">{t('qb.brief.months')}</span>
                </div>
              )}
            </div>
            <p className="text-[10px] text-mute mt-1">No competing brand campaigns during exclusivity window. Drives premium.</p>
          </div>
        </div>
      </div>
    ),
    configurator: (
      <QuoteConfigurator
        players={players}
        creators={creators}
        tiers={tiers}
        addons={addons}
        globals={{ eng, aud, seas, ctype, lang, auth, obj, conf }}
        currency={currency}
        usdRate={usdRate}
        addonsUpliftPct={addonsUpliftPct}
        onCurrencyChange={setCurrency}
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
                              <span
                                className="chip chip-peach text-[10px]"
                                title={`Overridden axes:\n${overrideAxisNames(r).join(', ')}\n\nClick the row to edit overrides in the wizard.`}
                              >
                                {overrideCount} override{overrideCount > 1 ? 's' : ''}
                              </span>
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
            onClick={() => { setDraftPickerOpen(true); setDraftLoadError(null); }}
            className="inline-flex items-center gap-1.5 text-xs text-label hover:text-ink px-2.5 py-1.5 rounded-md hover:bg-bg"
            title={draftsList.length > 0 ? `Load one of your ${draftsList.length} saved drafts` : 'No saved drafts yet'}
          >
            <FolderOpen size={14} /> Load draft
            {draftsList.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-greenSoft text-greenDark tabular-nums">
                {draftsList.length}
              </span>
            )}
          </button>
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
              setDemoTarget([]); setGenderSkew('mixed'); setRegion('KSA'); setExclusivity(false); setExclusivityMonths(0); setKpiFocus('');
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
        <TabButton step={1} active={view === 'campaign'} complete={!!clientName.trim()} onClick={() => setView('campaign')}>Campaign</TabButton>
        <TabButton step={2} active={view === 'build'} complete={lines.length > 0} badge={lines.length} onClick={() => setView('build')}>Build</TabButton>
        <TabButton step={3} active={view === 'summary'} onClick={() => setView('summary')}>Summary</TabButton>
        <div className="ml-auto pb-2 hidden sm:flex items-center gap-3 text-xs text-label whitespace-nowrap">
          <span>{computed.rows.length} line{computed.rows.length === 1 ? '' : 's'}</span>
          <span className="text-ink font-semibold">{fmtCurrency(computed.totals.total, currency, usdRate)}</span>
        </div>
      </div>

      {/* Tab content + desktop sticky rail */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          {/* ① CAMPAIGN — header / globals (addons live in Build) */}
          <div className={view === 'campaign' ? '' : 'hidden'}>
          {(() => {
            const ids = sectionOrder.filter(id => ['header','brand_brief','globals'].includes(id));
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

      {/* Draft picker modal */}
      {draftPickerOpen && (
        <div
          className="fixed inset-0 z-50 bg-navy/50 backdrop-blur-sm flex items-start md:items-center justify-center p-4 overflow-y-auto"
          onClick={() => setDraftPickerOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-lift w-full max-w-2xl my-8 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line bg-bg">
              <div>
                <h2 className="text-base font-semibold">Load a saved draft</h2>
                <p className="text-xs text-mute">
                  Picks up where you left off. Loading replaces the current builder state.
                </p>
              </div>
              <button onClick={() => setDraftPickerOpen(false)} className="p-2 -mr-2 hover:bg-line rounded-md">
                <XIcon size={18} />
              </button>
            </div>
            <div className="p-5 max-h-[70vh] overflow-y-auto">
              {draftLoadError && (
                <div className="mb-3 rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-xs text-danger">
                  {draftLoadError}
                </div>
              )}
              {draftsList.length === 0 ? (
                <div className="text-center py-10 text-sm text-mute">
                  <div className="text-ink font-medium mb-1">No drafts yet</div>
                  <p>
                    Click <strong>Save as draft</strong> on a quote to keep it here for later.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-line divide-y divide-line overflow-hidden">
                  {draftsList.map(d => {
                    const isLoading = loadingDraftId === d.id;
                    const isAnyLoading = loadingDraftId !== null;
                    const updated = d.updated_at
                      ? new Date(d.updated_at).toLocaleString('en-GB', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })
                      : '—';
                    return (
                      <button
                        key={d.id}
                        type="button"
                        disabled={isAnyLoading}
                        onClick={() => loadDraft(d.id)}
                        className={[
                          'w-full text-left px-4 py-3 transition flex items-center gap-3',
                          isLoading ? 'bg-greenSoft' : 'bg-white hover:bg-bg',
                          isAnyLoading && !isLoading ? 'opacity-50 cursor-not-allowed' : '',
                        ].join(' ')}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="font-medium text-ink truncate">
                              {d.client_name || <span className="italic text-mute">Untitled draft</span>}
                            </div>
                            {d.quote_number && (
                              <span className="text-[10px] uppercase tracking-wider text-mute font-mono">
                                {d.quote_number}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-mute mt-0.5 flex items-center gap-2 flex-wrap">
                            {d.campaign && <span className="truncate">{d.campaign}</span>}
                            {d.campaign && <span>·</span>}
                            <span>Updated {updated}</span>
                          </div>
                        </div>
                        <div className="text-right text-sm font-semibold text-ink tabular-nums whitespace-nowrap">
                          {fmtCurrency(d.total, d.currency, 3.75)}
                        </div>
                        {isLoading && (
                          <span className="text-xs text-greenDark font-medium ml-2">Loading…</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="text-[11px] text-mute mt-3 leading-snug">
                Showing your {draftsList.length === 0 ? '0' : `${draftsList.length} most recent`} drafts. Older drafts can still be opened from the Dashboard.
              </p>
            </div>
          </div>
        </div>
      )}

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
function AxisSelect({ label, hint, value, setValue, options, auto, onClearAuto }: {
  label: string; hint?: string;
  value: number; setValue: (v: number) => void;
  options: { label: string; val: number }[];
  auto?: boolean;
  onClearAuto?: () => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <label className="label !mb-0">{label}</label>
        {auto && (
          <span title="Suggested from your Brand Brief. Click to override."
                className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold bg-green/15 text-greenDark">
            auto
          </span>
        )}
      </div>
      <select value={value}
        onChange={e => { setValue(parseFloat(e.target.value)); if (auto && onClearAuto) onClearAuto(); }}
        className={['input', auto ? 'border-green/40' : ''].join(' ')}>
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
function TabButton({ active, onClick, step, children, badge, complete }: {
  active: boolean; onClick: () => void; step: number;
  children: React.ReactNode; badge?: number; complete?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'relative px-4 py-2.5 text-sm font-medium transition flex items-center gap-2',
        active ? 'text-ink' : complete ? 'text-greenDark' : 'text-mute hover:text-ink',
      ].join(' ')}
    >
      <span className={[
        'w-5 h-5 rounded-full grid place-items-center text-[10px] font-bold transition',
        active ? 'bg-green text-white' :
        complete ? 'bg-green/20 text-greenDark' :
                   'bg-bg text-mute border border-line',
      ].join(' ')}>
        {complete ? '✓' : step}
      </span>
      <span>{children}</span>
      {typeof badge === 'number' && badge > 0 && !active && (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-greenSoft text-greenDark tabular-nums">{badge}</span>
      )}
      {active && (
        <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-gradient-to-r from-green via-greenDark to-green rounded-full" />
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
      {/* Brand banner with dual-currency total + talent mix preview */}
      <div className="bg-gradient-to-br from-green via-greenDark to-greenDark text-white p-6 relative overflow-hidden">
        {/* decorative dots */}
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -right-6 -bottom-12 w-32 h-32 rounded-full bg-white/5" />

        <div className="relative flex items-start justify-between gap-6 flex-wrap">
          <div>
            <div className="text-[10px] tracking-widest opacity-80">QUOTATION · DRAFT</div>
            <div className="text-2xl font-bold mt-1 tracking-tight">Team Falcons</div>
            <div className="text-xs opacity-90 mt-0.5">Pricing OS · {today}</div>

            {/* Talent mix preview — small chips showing distinct talents */}
            {rows.length > 0 && (() => {
              const distinct = Array.from(new Set(rows.map((r: any) => r.talent_name)));
              return (
                <div className="flex flex-wrap gap-1.5 mt-3 max-w-md">
                  {distinct.slice(0, 6).map((n: string) => (
                    <span key={n} className="px-2 py-0.5 rounded-full bg-white/15 text-[11px] font-medium backdrop-blur-sm">
                      {n}
                    </span>
                  ))}
                  {distinct.length > 6 && (
                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-[11px] font-medium">
                      + {distinct.length - 6} more
                    </span>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="text-right relative">
            <div className="text-[10px] tracking-widest opacity-80">TOTAL</div>
            <div className="text-4xl font-extrabold mt-1 tabular-nums leading-tight">
              {fmtCurrency(totals.total, currency, usdRate)}
            </div>
            <div className="flex items-center gap-3 justify-end mt-2 pt-2 border-t border-white/15 text-xs">
              <div className="text-right">
                <div className="opacity-70">SAR</div>
                <div className="font-semibold tabular-nums">{fmtCurrency(totals.total, 'SAR', usdRate)}</div>
              </div>
              <div className="text-white/30 text-[10px]">/</div>
              <div className="text-right">
                <div className="opacity-70">USD</div>
                <div className="font-semibold tabular-nums">{fmtCurrency(totals.total, 'USD', usdRate)}</div>
              </div>
            </div>
            <div className="text-[10px] opacity-80 mt-1">VAT inclusive · {rows.length} line{rows.length === 1 ? '' : 's'}</div>
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

