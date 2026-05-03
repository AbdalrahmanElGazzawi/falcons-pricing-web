'use client';
import { useLocale } from '@/lib/i18n/Locale';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus, X as XIcon, ChevronDown, ChevronUp, Check,
  Twitter, Instagram, Youtube, Twitch, Facebook, ExternalLink,
  Lock, Hourglass,
} from 'lucide-react';
import { SearchInput } from '@/components/SearchInput';
import { computeLine, AXIS_OPTIONS, CREATOR_AXIS_OPTIONS, type MeasurementConfidence } from '@/lib/pricing';
import { fmtMoney, fmtPct, tierClass, fmtCurrency } from '@/lib/utils';
import {
  PLAYER_PLATFORMS, CREATOR_PLATFORMS,
  type Player, type Creator, type Tier, type Addon} from '@/lib/types';
import { newUid, type LineDraft } from './line-draft';
import { Avatar } from '@/components/Avatar';

/**
 * Single-page configurator. Pick a talent, tick deliverables (multi-select),
 * tune qty per row, click Add — all rows go to the quote at once.
 *
 * Design philosophy: search + config visible together at all times.
 * No modals, no wizard, no navigation. Inspired by the v7 Apps Script sidebar.
 */
type Globals = {
  eng: number; aud: number; seas: number; ctype: number; lang: number; auth: number;
  obj: number; conf: MeasurementConfidence;
  // Channel multiplier (Migration 035/037). Defaults to 1.00 when omitted.
  channelMultiplier?: number;
  // Migration 042 — world-class premium axes. All optional, default 1.00.
  audCountryMix?: number;
  audAgeDemo?: number;
  integrationDepth?: number;
  firstLook?: number;
  realTimeLive?: number;
  lifestyleContext?: number;
  brandSafety?: number;
  collabSize?: number;
};

type RowSel = { qty: number; manualRate?: number };

/**
 * Resolve a talent's intrinsic axis values. Players carry these on their
 * record (default_*, authority_factor); creators got equivalents in
 * migration 019. Anything missing falls back to 1.0 (neutral).
 *
 * Returned shape mirrors the per-line override keys so we can spread it
 * straight into setOverrides.
 */
function readTalentDefaults(talent: Player | Creator | null): {
  o_eng: number | null; o_aud: number | null; o_seas: number | null;
  o_lang: number | null; o_auth: number | null;
} {
  if (!talent) {
    return { o_eng: null, o_aud: null, o_seas: null, o_lang: null, o_auth: null };
  }
  const t = talent as any;
  // Treat 1.0 (neutral) as "no opinion" so we don't fight the campaign default
  // unless the talent record actually has a non-neutral intrinsic value.
  const nonNeutral = (n: any): number | null =>
    typeof n === 'number' && Math.abs(n - 1) > 0.001 ? n : null;
  return {
    o_eng:  nonNeutral(t.default_engagement),
    o_aud:  nonNeutral(t.default_audience),
    o_seas: nonNeutral(t.default_seasonality),
    o_lang: nonNeutral(t.default_language),
    o_auth: nonNeutral(t.authority_factor) ?? nonNeutral(t.default_authority),
  };
}



// ─── Base-price 'why' helper ───────────────────────────────────────────────
// Returns a short prose explanation of where the base SAR comes from.
// Used inside the price-breakdown popover.
function baseWhyFor(platformKey: string, talent: any, tierCode: string | null): string {
  if (!talent) return '';
  const fmt = (n: number) => Number(n || 0).toLocaleString('en-US');
  const followersOf = (k: string) => Number(talent[k] || 0);
  // Map platform → (label, follower field)
  const map: Record<string, { label: string; field: string }> = {
    rate_ig_reel:         { label: 'Instagram', field: 'followers_ig' },
    rate_ig_static:       { label: 'Instagram', field: 'followers_ig' },
    rate_ig_story:        { label: 'Instagram', field: 'followers_ig' },
    rate_ig_post:         { label: 'Instagram', field: 'followers_ig' },
    rate_ig_repost:       { label: 'Instagram', field: 'followers_ig' },
    rate_ig_share:        { label: 'Instagram', field: 'followers_ig' },
    rate_tiktok_video:    { label: 'TikTok',    field: 'followers_tiktok' },
    rate_tiktok_repost:   { label: 'TikTok',    field: 'followers_tiktok' },
    rate_tiktok_share:    { label: 'TikTok',    field: 'followers_tiktok' },
    rate_yt_short:        { label: 'YouTube',   field: 'followers_yt' },
    rate_yt_short_repost: { label: 'YouTube',   field: 'followers_yt' },
    rate_yt_full:         { label: 'YouTube',   field: 'followers_yt' },
    rate_x_post:          { label: 'X / Twitter', field: 'followers_x' },
    rate_x_repost:        { label: 'X / Twitter', field: 'followers_x' },
    rate_x_share:         { label: 'X / Twitter', field: 'followers_x' },
    rate_twitch_stream:   { label: 'Twitch',    field: 'followers_twitch' },
    rate_twitch_integ:    { label: 'Twitch',    field: 'followers_twitch' },
    rate_kick_stream:     { label: 'Kick',      field: 'followers_kick' },
    rate_kick_integ:      { label: 'Kick',      field: 'followers_kick' },
    rate_fb_post:         { label: 'Facebook',  field: 'followers_fb' },
  };
  const m = map[platformKey];
  if (m) {
    const n = followersOf(m.field);
    const reach = n > 0 ? ` ${m.label} reach: ${fmt(n)} followers (context only).` : '';
    return `Per-platform base for ${m.label}. The engine then takes the MAX of (base × multipliers) and a parallel authority-floor calc, so the final price never falls below the talent's defensible minimum.${reach}`;
  }
  if (platformKey === 'rate_irl' || platformKey === 'rate_irl_event') {
    return `Tier-flat event fee${tierCode ? ` for ${tierCode}` : ''} — doesn't scale with followers.`;
  }
  if (platformKey === 'rate_promo_monthly' || platformKey === 'rate_usage_monthly') {
    return 'Monthly retainer rate — set per talent.';
  }
  if (platformKey.startsWith('manual_')) {
    return 'Manual rate entered for this quote.';
  }
  return '';
}

export function QuoteConfigurator({
  players, creators, tiers, addons, globals, currency, usdRate, addonsUpliftPct, scrollHook,
  initialEdit, onCommit, onCancelEdit, onCurrencyChange, onPreviewChange,
}: {
  players: Player[];
  creators: Creator[];
  tiers: Tier[];
  addons: Addon[];
  globals: Globals;
  currency: string;
  usdRate?: number;
  addonsUpliftPct: number;
  scrollHook?: React.MutableRefObject<HTMLDivElement | null>;
  initialEdit?: LineDraft | null;
  onCommit: (drafts: LineDraft[]) => void;
  onCancelEdit?: () => void;
  onCurrencyChange?: (next: string) => void;
  onPreviewChange?: (p: { count: number; total: number; talent: string }) => void;
}) {
  const { t } = useLocale();
  const isEditing = !!initialEdit;

  // ── Picker state
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>(''); // '', 'player', 'influencer', 'creator'
  const [gameFilter, setGameFilter] = useState<string>('');
  const [saudiOnly, setSaudiOnly] = useState<boolean>(false); // filter players by Saudi nationality

  // ── Selected talent
  const [talentKind, setTalentKind] = useState<'player' | 'creator'>(
    initialEdit?.talent_type ?? 'player'
  );
  const [selectedId, setSelectedId] = useState<number | null>(initialEdit?.talent_id ?? null);

  // ── Multi-select deliverables: key → {qty, manualRate}
  const [picks, setPicks] = useState<Record<string, RowSel>>(() => {
    if (initialEdit) {
      return { [initialEdit.platform]: { qty: initialEdit.qty, manualRate: initialEdit.platform.startsWith('manual_') ? initialEdit.base_rate : undefined } };
    }
    return {};
  });

  // ── Per-line axis overrides (initialEdit hydrates them; otherwise null = inherit globals)
  const [overrides, setOverrides] = useState({
    o_eng:   initialEdit?.o_eng   ?? null,
    o_aud:   initialEdit?.o_aud   ?? null,
    o_seas:  initialEdit?.o_seas  ?? null,
    o_ctype: initialEdit?.o_ctype ?? null,
    o_lang:  initialEdit?.o_lang  ?? null,
    o_auth:  initialEdit?.o_auth  ?? null,
  });
  const [isCompanion, setIsCompanion] = useState<boolean>(!!initialEdit?.is_companion);

  // Per-line creator-multiplier overrides. null = use creator's stored default.
  // Auto-loaded when a creator is selected (see effect below).
  const [creatorMults, setCreatorMults] = useState({
    o_brand_loyalty:      (initialEdit as any)?.o_brand_loyalty       ?? null,
    o_exclusivity:        (initialEdit as any)?.o_exclusivity         ?? null,
    o_cross_vertical:     (initialEdit as any)?.o_cross_vertical      ?? null,
    o_engagement_quality: (initialEdit as any)?.o_engagement_quality  ?? null,
    o_production_style:   (initialEdit as any)?.o_production_style    ?? null,
  });

  // Tracks which override values were auto-seeded from the talent record (vs
  // typed manually). Drives the "from <talent>" badge in the override panel
  // and prevents the auto-seed effect from clobbering manual edits.
  type OverrideKey = 'o_eng' | 'o_aud' | 'o_seas' | 'o_lang' | 'o_auth';
  const [autoOverrides, setAutoOverrides] = useState<Set<OverrideKey>>(new Set());
  // ── Migration 042/043 — Per-talent world-class axes (UI lives in this card).
  // Sales picks for THIS talent; resets when the talent changes. Auto-seed
  // from talent attributes if the player record carries defaults.
  const [wcAxes, setWcAxes] = useState({
    audCountryMix: 1.00, audAgeDemo: 1.00, integrationDepth: 1.00,
    firstLook: 1.00, realTimeLive: 1.00, lifestyleContext: 1.00, brandSafety: 1.00,
  });

  // Wrap setOverrides for the AxisRow callbacks so a manual change clears
  // the auto badge for that axis.
  const setOverrideManual = (key: OverrideKey, v: number | null) => {
    setOverrides(o => ({ ...o, [key]: v }));
    setAutoOverrides(s => {
      if (!s.has(key)) return s;
      const n = new Set(s); n.delete(key); return n;
    });
  };

  // Per-line addon snapshot — each line carries its own rights package.
  const [lineAddonMonths, setLineAddonMonths] = useState<Record<number, number>>(
    initialEdit?.addon_months ?? {}
  );
  const lineAddonsUpliftPct = useMemo(() => {
    return Object.entries(lineAddonMonths).reduce((s, [idStr, months]) => {
      const a = addons.find(x => x.id === Number(idStr));
      return s + (a?.uplift_pct ?? 0) * (months || 1);
    }, 0);
  }, [lineAddonMonths, addons]);
  const toggleLineAddon = (id: number) => setLineAddonMonths(s => {
    const n = { ...s };
    if (id in n) delete n[id]; else n[id] = 1;
    return n;
  });
  const setLineAddonMonth = (id: number, months: number) => {
    const m = Math.max(1, Math.min(60, Math.round(months || 1)));
    setLineAddonMonths(s => ({ ...s, [id]: m }));
  };

  // ── Reset picks when changing talent (unless we're editing)
  useEffect(() => {
    if (!isEditing) setPicks({});
  }, [selectedId, talentKind, isEditing]);

  // ── Migration 043: auto-seed wcAxes from talent attributes when picked.
  useEffect(() => {
    const p: any = selectedPlayer ?? selectedCreator ?? {};
    const country = (v?: string | null) =>
      v === 'strongly_aligned' ? 1.40
      : v === 'aligned' ? 1.20
      : v === 'crossover' ? 1.00
      : v === 'mismatched' ? 0.70
      : 1.00;
    const age = (v?: string | null) =>
      v === 'premium' ? 1.20 : v === 'youth' ? 0.85 : 1.00;
    const lifestyle = (v?: string | null) =>
      v === 'lifestyle' ? 1.10 : v === 'at_home' ? 0.95 : 1.00;
    const safety = (s?: number | null) =>
      s == null ? 1.00 : s < 0.6 ? 0.85 : s > 0.85 ? 1.10 : 1.00;
    setWcAxes({
      audCountryMix:    country(p.default_audience_country_mix),
      audAgeDemo:       age(p.default_audience_age_demo),
      integrationDepth: 1.00,
      firstLook:        1.00,
      realTimeLive:     1.00,
      lifestyleContext: lifestyle(p.default_lifestyle_context),
      brandSafety:      safety(p.brand_safety_score),
    });
  }, [selectedId, talentKind]);

  // ── Auto-seed per-line overrides from the talent's intrinsic data when a
  //    new line is being assembled. Skipped when editing an existing line so
  //    we don't blow away saved overrides. Resolves the multi-region
  //    conflict where the campaign-level "MENA → Arabic 1.10×" was silently
  //    applied to non-Arabic talents.
  useEffect(() => {
    if (isEditing) return;
    if (!selectedTalent) {
      setAutoOverrides(new Set());
      return;
    }
    const defaults = readTalentDefaults(selectedTalent);
    const autos = new Set<OverrideKey>();
    setOverrides(prev => {
      const next = { ...prev };
      (Object.keys(defaults) as OverrideKey[]).forEach(k => {
        const v = defaults[k];
        if (v !== null && prev[k] === null) {
          next[k] = v;
          autos.add(k);
        }
      });
      return next;
    });
    setAutoOverrides(autos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, talentKind, isEditing]);

  // ── Scroll into view when external code (edit-line pencil) signals
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (initialEdit && rootRef.current) {
      rootRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [initialEdit?.uid]);
  if (scrollHook) scrollHook.current = rootRef.current;

  // ── Filtered talent list (avatar + reach for richer picker)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (talentKind === 'creator') {
      let list = creators.slice();
      if (tierFilter) list = list.filter(c => c.tier_code === tierFilter);
      if (saudiOnly) list = list.filter(c => (c.nationality || '').trim().toLowerCase().startsWith('saudi'));
      if (q) list = list.filter(c =>
        c.nickname.toLowerCase().includes(q) ||
        (c.full_name ?? '').toLowerCase().includes(q) ||
        ((c as any).audience_market ?? '').toLowerCase().includes(q) ||
        (c.handle_ig ?? '').toLowerCase().includes(q) ||
        (c.handle_tiktok ?? '').toLowerCase().includes(q)
      );
      return list.map(c => {
        const reach = Math.max(
          Number(c.followers_ig)     || 0,
          Number(c.followers_tiktok) || 0,
          Number(c.followers_yt)     || 0,
          Number(c.followers_x)      || 0,
          Number(c.followers_twitch) || 0,
        );
        return {
          id: c.id, kind: 'creator' as const, nickname: c.nickname,
          full_name: c.full_name || '', tier: c.tier_code || '',
          game: (c as any).audience_market || '', team: '', role: '',
          avatar_url: c.avatar_url || '',
          reach,
        };
      });
    }
    let list = players.slice();
    if (roleFilter === 'influencer') list = list.filter(p => (p.role || '').toLowerCase() === 'influencer');
    else list = list.filter(p => (p.role || '').toLowerCase() !== 'influencer');
    if (tierFilter) list = list.filter(p => p.tier_code === tierFilter);
    if (gameFilter) list = list.filter(p => p.game === gameFilter);
    // "Saudi" matches both 'Saudi' and 'Saudi Arabia' in the seed data — case-insensitive
    if (saudiOnly) list = list.filter(p => (p.nationality || '').trim().toLowerCase().startsWith('saudi'));
    if (q) list = list.filter(p =>
      p.nickname.toLowerCase().includes(q) ||
      (p.full_name ?? '').toLowerCase().includes(q) ||
      (p.team ?? '').toLowerCase().includes(q)
    );
    return list.map(p => {
      const reach = Math.max(
        Number(p.followers_ig)     || 0,
        Number(p.followers_twitch) || 0,
        Number(p.followers_yt)     || 0,
        Number(p.followers_tiktok) || 0,
        Number(p.followers_x)      || 0,
      );
      return {
        id: p.id, kind: 'player' as const, nickname: p.nickname,
        full_name: p.full_name || '', tier: p.tier_code || '', game: p.game || '',
        team: p.team || '', role: p.role || '',
        avatar_url: p.avatar_url || '',
        reach,
      };
    });
  }, [search, tierFilter, roleFilter, gameFilter, saudiOnly, talentKind, players, creators]);

  const games = useMemo(
    () => Array.from(new Set(players.map(p => p.game).filter(Boolean))).sort() as string[],
    [players]
  );

  // ── Selected talent object
  const selectedPlayer  = talentKind === 'player'  && selectedId ? players.find(p => p.id === selectedId)  ?? null : null;
  const selectedCreator = talentKind === 'creator' && selectedId ? creators.find(c => c.id === selectedId) ?? null : null;
  const selectedTalent  = (selectedPlayer ?? selectedCreator) as (Player | Creator | null);

  const tierMap = useMemo(() => {
    const m = new Map<string, Tier>();
    tiers.forEach(t => m.set(t.code, t));
    return m;
  }, [tiers]);

  // ── Deliverables for the selected talent (grouped)
  type Deliv = { key: string; label: string; rate: number; group: string; manual: boolean; suggestedRange: [number, number] | null };
  const deliverables: Deliv[] = useMemo(() => {
    if (selectedPlayer) {
      return PLAYER_PLATFORMS.map(p => ({
        key: p.key, label: p.label,
        rate: p.manual ? 0 : ((selectedPlayer as any)[p.key] as number) || 0,
        group: p.group, manual: p.manual,
        suggestedRange: (p as any).suggestedRange ?? null,
      })).filter(d => d.manual || d.rate > 0);
    }
    if (selectedCreator) {
      return CREATOR_PLATFORMS.map(p => ({
        key: p.key, label: p.label,
        rate: p.manual ? 0 : ((selectedCreator as any)[p.key] as number) || 0,
        group: p.group, manual: p.manual,
        suggestedRange: (p as any).suggestedRange ?? null,
      })).filter(d => d.manual || d.rate > 0);
    }
    return [];
  }, [selectedPlayer, selectedCreator]);

  // ── Live total for current picks
  const previewLines = useMemo(() => {
    if (!selectedTalent) return [];
    const irl = (selectedPlayer as any)?.rate_irl || 0;
    const tierCode = (selectedPlayer as any)?.tier_code ?? (selectedCreator as any)?.tier_code;
    const tier = tierCode ? tierMap.get(tierCode) : undefined;
    const floorShare = tier?.floor_share ?? (selectedPlayer as any)?.floor_share ?? 0.5;
    return Object.entries(picks)
      .filter(([k, sel]) => {
        const d = deliverables.find(x => x.key === k);
        if (!d) return false;
        if (d.manual && (!sel.manualRate || sel.manualRate <= 0)) return false;
        return true;
      })
      .map(([k, sel]) => {
        const d = deliverables.find(x => x.key === k)!;
        const baseFee = d.manual ? (sel.manualRate ?? 0) : d.rate;
        const r = computeLine({
          baseFee, irl: selectedPlayer ? irl : 0,
          eng:  overrides.o_eng   ?? globals.eng,
          aud:  overrides.o_aud   ?? globals.aud,
          seas: overrides.o_seas  ?? globals.seas,
          ctype: overrides.o_ctype ?? globals.ctype,
          lang: overrides.o_lang  ?? globals.lang,
          auth: overrides.o_auth  ?? globals.auth,
          obj: globals.obj, conf: globals.conf,
          channelMultiplier: globals.channelMultiplier,
          // Migration 042 — world-class axes (now per-talent local state)
          audCountryMix:    wcAxes.audCountryMix,
          audAgeDemo:       wcAxes.audAgeDemo,
          integrationDepth: wcAxes.integrationDepth,
          firstLook:        wcAxes.firstLook,
          realTimeLive:     wcAxes.realTimeLive,
          lifestyleContext: wcAxes.lifestyleContext,
          brandSafety:      wcAxes.brandSafety,
          collabSize:       globals.collabSize,
          floorShare, rightsPct: lineAddonsUpliftPct, qty: sel.qty,
          // Creator-multiplier preview (override → creator default → neutral)
          brandLoyaltyPct: creatorMults.o_brand_loyalty
            ?? ((selectedCreator as any)?.brand_loyalty_default_pct ?? 0),
          exclusivityPremiumPct: creatorMults.o_exclusivity
            ?? ((selectedCreator as any)?.exclusivity_premium_pct ?? 0),
          crossVerticalMultiplier: creatorMults.o_cross_vertical
            ?? ((selectedCreator as any)?.cross_vertical_multiplier ?? 1.0),
          engagementQualityModifier: creatorMults.o_engagement_quality
            ?? ((selectedCreator as any)?.engagement_quality_modifier ?? 1.0),
          productionStyleMultiplier: creatorMults.o_production_style ?? (function() {
            const ps = (selectedCreator as any)?.production_style_default;
            return ps === 'raw' ? 0.9 : ps === 'scripted' ? 1.20 : ps === 'full_studio' ? 1.40 : 1.0;
          })(),
          isCompanion,
        });
        const baseWhy = d.manual
          ? 'Manual rate entered for this quote.'
          : baseWhyFor(d.key, (selectedPlayer ?? selectedCreator), (selectedPlayer as any)?.tier_code ?? (selectedCreator as any)?.tier_code ?? null);
        return {
          key: k, label: d.label, qty: sel.qty, rate: baseFee, baseWhy,
          // Inputs as-applied (after override fall-through) for breakdown UI
          mults: {
            base:  baseFee,
            eng:   overrides.o_eng   ?? globals.eng,
            aud:   overrides.o_aud   ?? globals.aud,
            seas:  overrides.o_seas  ?? globals.seas,
            ctype: overrides.o_ctype ?? globals.ctype,
            lang:  overrides.o_lang  ?? globals.lang,
            auth:  overrides.o_auth  ?? globals.auth,
            obj:   globals.obj,
            rightsPct: lineAddonsUpliftPct,
            isCompanion,
          },
          ...r,
        };
      });
  }, [picks, deliverables, selectedTalent, selectedPlayer, selectedCreator, tierMap, overrides, globals, addonsUpliftPct, lineAddonsUpliftPct, isCompanion, creatorMults, wcAxes]);

  const previewTotal = previewLines.reduce((s, l) => s + l.finalAmount, 0);
  const selectedCount = previewLines.length;

  // Notify parent (QuoteBuilder) so the cart sidebar can show the in-flight preview.
  useEffect(() => {
    if (onPreviewChange) {
      const talentName = (selectedTalent as any)?.nickname ?? '';
      onPreviewChange({ count: selectedCount, total: previewTotal, talent: talentName });
    }
    // Clear on unmount
    return () => { if (onPreviewChange) onPreviewChange({ count: 0, total: 0, talent: '' }); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewTotal, selectedCount, selectedTalent]);

  function togglePick(key: string, manual: boolean) {
    setPicks(p => {
      const next = { ...p };
      if (next[key]) delete next[key];
      else next[key] = { qty: 1, manualRate: manual ? 0 : undefined };
      return next;
    });
  }
  function setRowQty(key: string, qty: number) {
    setPicks(p => ({ ...p, [key]: { ...p[key], qty: Math.max(1, qty) } }));
  }
  function setRowRate(key: string, rate: number) {
    setPicks(p => ({ ...p, [key]: { ...p[key], manualRate: Math.max(0, rate) } }));
  }

  function commit() {
    if (!selectedTalent || selectedCount === 0) return;
    const irl = (selectedPlayer as any)?.rate_irl || 0;
    const tierCode = (selectedPlayer as any)?.tier_code ?? (selectedCreator as any)?.tier_code;
    const tier = tierCode ? tierMap.get(tierCode) : undefined;
    const floorShare = tier?.floor_share ?? (selectedPlayer as any)?.floor_share ?? 0.5;

    const drafts: LineDraft[] = Object.entries(picks).map(([k, sel]) => {
      const d = deliverables.find(x => x.key === k)!;
      const baseFee = d.manual ? (sel.manualRate ?? 0) : d.rate;
      return {
        uid: initialEdit?.platform === k ? initialEdit.uid : newUid(),
        talent_type: talentKind,
        talent_id: selectedTalent.id,
        talent_name: (selectedTalent as any).nickname,
        platform: k,
        platform_label: d.label,
        base_rate: baseFee,
        qty: sel.qty,
        irl: selectedPlayer ? irl : 0,
        floorShare,
        o_ctype: overrides.o_ctype, o_eng: overrides.o_eng, o_aud: overrides.o_aud,
        o_seas: overrides.o_seas, o_lang: overrides.o_lang, o_auth: overrides.o_auth,
        addon_months: { ...lineAddonMonths },
        is_companion: isCompanion,
        // Creator-specific multiplier overrides (saved with the draft)
        o_brand_loyalty:       creatorMults.o_brand_loyalty,
        o_exclusivity:         creatorMults.o_exclusivity,
        o_cross_vertical:      creatorMults.o_cross_vertical,
        o_engagement_quality:  creatorMults.o_engagement_quality,
        o_production_style:    creatorMults.o_production_style,
      };
    });
    onCommit(drafts);
    if (!isEditing) {
      // Reset picks (keep player selected for "add another" flow)
      setPicks({});
    }
  }

  // ── UI
  return (
    <div ref={rootRef} className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-line flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-semibold">{isEditing ? t('cfg.edit_deliverable') : t('cfg.add_deliverables')}</h2>
          <p className="text-xs text-mute mt-0.5">
            {isEditing ? t('cfg.update_save') : t('cfg.flow_hint')}
          </p>
        </div>
        {isEditing && onCancelEdit && (
          <button onClick={onCancelEdit} className="btn btn-ghost text-xs">
            <XIcon size={12} /> {t('cfg.cancel_edit')}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px,1fr] divide-x divide-line">
        {/* ── Talent picker ──────────────────────────────────────────────── */}
        <div className="p-4 space-y-3 lg:max-h-[640px] lg:overflow-y-auto">
          {/* Kind toggle */}
          <div className="inline-flex rounded-lg border border-line bg-white overflow-hidden text-xs w-full">
            {([
              ['player',     'Players',    () => { setTalentKind('player');  setRoleFilter('');           setSearch(''); setTierFilter(''); setGameFilter(''); }],
              ['influencer', 'Influencer', () => { setTalentKind('player');  setRoleFilter('influencer'); setSearch(''); setTierFilter(''); setGameFilter(''); }],
              ['creator',    'Creators',   () => { setTalentKind('creator'); setRoleFilter('');           setSearch(''); setTierFilter(''); setGameFilter(''); setSaudiOnly(false); }],
            ] as const).map(([k, lbl, fn]) => {
              const active =
                k === 'creator' ? talentKind === 'creator' :
                k === 'influencer' ? talentKind === 'player' && roleFilter === 'influencer' :
                talentKind === 'player' && roleFilter !== 'influencer';
              return (
                <button key={k} onClick={fn}
                  className={[
                    'flex-1 px-3 py-2 transition',
                    active ? 'bg-navy text-white' : 'text-mute hover:text-ink hover:bg-bg',
                  ].join(' ')}>
                  {lbl}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={`Search ${filtered.length} ${talentKind === 'creator' ? 'creators' : roleFilter === 'influencer' ? 'influencers' : 'players'}…`}
            size="sm"
          />

          {/* Tier pills */}
          <div className="flex flex-wrap gap-1.5">
            {[''].concat(tiers.map(t => t.code)).map(t => (
              <button key={t || 'all'} onClick={() => setTierFilter(t)}
                className={[
                  'px-2.5 py-1 rounded-full text-[11px] font-semibold border transition',
                  tierFilter === t
                    ? 'bg-navy text-white border-navy'
                    : 'bg-white text-label border-line hover:border-mute',
                ].join(' ')}>
                {t || 'All'}
              </button>
            ))}
          </div>

          {/* Game filter (only if Players) */}
          {talentKind === 'player' && roleFilter !== 'influencer' && (
            <select
              value={gameFilter}
              onChange={e => setGameFilter(e.target.value)}
              className="input text-sm"
            >
              <option value="">All games</option>
              {games.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          )}

          {/* Nationality filter (Players + Influencers — anyone with a nationality field) */}
          {talentKind === 'player' && (
            <button
              type="button"
              onClick={() => setSaudiOnly(v => !v)}
              aria-pressed={saudiOnly}
              title="Show only Saudi nationals"
              className={[
                'w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition',
                saudiOnly
                  ? 'bg-green text-white border-green'
                  : 'bg-white text-label border-line hover:border-green hover:text-ink',
              ].join(' ')}
            >
              <span>Saudi players only</span>
              {saudiOnly && <Check size={12} />}
            </button>
          )}

          {/* Talent list */}
          <div className="rounded-lg border border-line overflow-hidden divide-y divide-line max-h-[460px] overflow-y-auto">
            {filtered.length === 0 && (
              <div className="px-4 py-6 text-xs text-mute text-center">No matches.</div>
            )}
            {filtered.slice(0, 400).map(t => {
              const active = selectedId === t.id && (
                (t.kind === 'creator' && talentKind === 'creator') ||
                (t.kind === 'player' && talentKind === 'player')
              );
              const reach = (t as any).reach as number | undefined;
              const reachStr = !reach ? '' :
                reach >= 1_000_000 ? `${(reach / 1_000_000).toFixed(reach >= 10_000_000 ? 0 : 1)}M`
                : reach >= 1_000   ? `${(reach / 1_000).toFixed(reach >= 10_000 ? 0 : 1)}K`
                : String(reach);
              return (
                <button
                  key={t.kind + t.id}
                  onClick={() => { setSelectedId(t.id); }}
                  className={[
                    'w-full text-left px-3 py-2.5 transition flex items-center gap-2.5',
                    active ? 'bg-greenSoft border-l-4 border-green' : 'hover:bg-bg',
                  ].join(' ')}
                >
                  <Avatar src={(t as any).avatar_url || undefined} name={t.nickname} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-ink text-sm truncate">{t.nickname}</div>
                    {(t.tier || t.game || t.team || t.role) && (
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap text-[11px] text-mute">
                        {t.tier && (
                          <span className={`chip border ${tierClass(t.tier)} !px-1.5 !py-0 text-[10px]`}>{t.tier}</span>
                        )}
                        {t.role && t.role !== 'Player' && t.role !== 'Influencer' && (
                          <span className="chip chip-grey !px-1.5 !py-0 text-[10px]">{t.role}</span>
                        )}
                        {t.game && <span className="truncate">{t.game}</span>}
                        {t.team && <span className="opacity-75">· {t.team}</span>}
                      </div>
                    )}
                  </div>
                  {reachStr && (
                    <span className="text-[11px] text-mute tabular-nums shrink-0" title={`Max-platform reach ${(reach || 0).toLocaleString('en-US')}`}>
                      {reachStr}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Configuration panel ────────────────────────────────────────── */}
        <div className="p-4 lg:p-5">
          {!selectedTalent && (
            <div className="text-center py-12">
              <div className="text-sm text-mute">Pick a talent on the left to configure deliverables.</div>
            </div>
          )}

          {selectedTalent && (
            <div className="space-y-5">
              {/* Talent summary */}
              <div className="flex items-start gap-3">
                <Avatar src={(selectedTalent as any).avatar_url} name={(selectedTalent as any).nickname} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-ink text-base truncate">{(selectedTalent as any).nickname}</div>
                  <div className="text-xs text-mute mt-0.5 flex items-center gap-1.5 flex-wrap">
                    {(selectedTalent as any).tier_code && (
                      <span className={`chip border ${tierClass((selectedTalent as any).tier_code)} !px-1.5 !py-0 text-[10px]`}>
                        {(selectedTalent as any).tier_code}
                      </span>
                    )}
                    {(selectedTalent as any).measurement_confidence === 'exact' ? (
                      <span
                        title="Verified — Shikenso confirmed"
                        className="inline-flex items-center gap-1 px-1.5 py-0 rounded-full text-[9px] font-bold uppercase tracking-wider bg-green/15 text-greenDark border border-green/30"
                      >
                        <Lock size={9} /> Locked
                      </span>
                    ) : (
                      <span
                        title="TBD — rates use tier baseline (within-tier average) until Shikenso lands. Bump Authority for verified championship credentials."
                        className="inline-flex items-center gap-1 px-1.5 py-0 rounded-full text-[9px] font-bold uppercase tracking-wider bg-gold/10 text-gold border border-gold/30"
                      >
                        <Hourglass size={9} /> TBD
                      </span>
                    )}
                    {(selectedTalent as any).role && <span>{(selectedTalent as any).role}</span>}
                    {(selectedTalent as any).game && <span>· {(selectedTalent as any).game}</span>}
                    {(selectedTalent as any).team && <span>· {(selectedTalent as any).team}</span>}
                  </div>
                  <SocialChips talent={selectedTalent} />
                </div>
              </div>

              {/* Content Type toggle — quick decision before picking deliverables */}
              <div className="rounded-lg border border-line bg-bg/40 p-3">
                <div className="text-[11px] uppercase tracking-wider text-label font-semibold mb-2">
                  Content type
                  <span className="text-mute font-normal normal-case ml-1.5">— who's directing the creative?</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOverrides(o => ({ ...o, o_ctype: 1.00 }))}
                    className={[
                      'rounded-lg border-2 p-3 text-left transition',
                      (overrides.o_ctype === null || overrides.o_ctype === 1.00)
                        ? 'border-green bg-greenSoft'
                        : 'border-line bg-white hover:border-green/60',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-ink">Integrated</div>
                      <div className="text-xs font-mono text-greenDark">1.00×</div>
                    </div>
                    <div className="text-[11px] text-mute mt-0.5">Player-led — talent narrates organically. Best engagement.</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverrides(o => ({ ...o, o_ctype: 1.15 }))}
                    className={[
                      'rounded-lg border-2 p-3 text-left transition',
                      overrides.o_ctype === 1.15
                        ? 'border-green bg-greenSoft'
                        : 'border-line bg-white hover:border-green/60',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-ink">Dedicated</div>
                      <div className="text-xs font-mono text-greenDark">1.15×</div>
                    </div>
                    <div className="text-[11px] text-mute mt-0.5">Brand-led — client script + approved talking points. Premium.</div>
                  </button>
                </div>
              </div>

              {/* Multi-select deliverables */}
              <div>
                <div className="text-[11px] uppercase tracking-wider text-label font-semibold mb-2 flex items-center justify-between">
                  <span>Deliverables {selectedCount > 0 && <span className="text-greenDark">· {selectedCount} selected</span>}</span>
                  {selectedCount > 0 && (
                    <button onClick={() => setPicks({})} className="text-mute hover:text-ink text-xs normal-case">Clear all</button>
                  )}
                </div>

                {deliverables.length === 0 ? (
                  <div className="rounded-lg border border-line bg-bg p-4 text-sm text-mute">
                    This talent has no deliverable rates set.
                  </div>
                ) : (
                  <DeliverableGroups
                    deliverables={deliverables}
                    picks={picks}
                    currency={currency}
                    usdRate={usdRate ?? 3.75}
                    previewLines={previewLines}
                    overrides={overrides}
                    axisOptions={talentKind === 'creator' ? CREATOR_AXIS_OPTIONS : AXIS_OPTIONS}
                    onAxisChange={setOverrideManual}
                    onToggle={togglePick}
                    onQty={setRowQty}
                    onRate={setRowRate}
                    talent={selectedTalent}
                  />
                )}
              </div>

              {/* Quick axis tweaks */}
              {/* Per-line rights & add-ons — applies to THIS talent's deliverables only */}
              {addons.length > 0 && (
                <div className="rounded-lg border border-line bg-bg/40 p-3 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[11px] uppercase tracking-wider text-label font-semibold">
                      {t('cfg.rights_for_talent')} <span className="text-mute font-normal normal-case ml-1.5">— {t('cfg.per_month_rate')}</span>
                    </div>
                    {lineAddonsUpliftPct > 0 && (
                      <div className="text-xs text-greenDark font-semibold">+{Math.round(lineAddonsUpliftPct * 100)}% total</div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {addons.map(a => {
                      const checked = a.id in lineAddonMonths;
                      const months = lineAddonMonths[a.id] ?? 1;
                      const totalUplift = (a.uplift_pct ?? 0) * months;
                      return (
                        <div key={a.id} className={[
                          'p-2 rounded-lg border transition',
                          checked ? 'border-green bg-green/5' : 'border-line hover:border-mute',
                        ].join(' ')}>
                          <button type="button" onClick={() => toggleLineAddon(a.id)} className="w-full text-left">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={['text-sm font-medium', checked ? 'text-greenDark' : 'text-ink'].join(' ')}>{a.label}</span>
                              <span className="text-[11px] text-green font-semibold">+{Math.round((a.uplift_pct ?? 0) * 100)}%/mo</span>
                            </div>
                            {a.description && <div className="text-[11px] text-mute mt-0.5 leading-snug">{a.description}</div>}
                          </button>
                          {checked && (
                            <div className="mt-2 pt-2 border-t border-green/20 flex items-center justify-between gap-2">
                              <span className="text-[10px] uppercase tracking-wider text-label font-semibold">Months</span>
                              <div className="flex items-center gap-1">
                                <button type="button" onClick={() => setLineAddonMonth(a.id, months - 1)} disabled={months <= 1}
                                  className="w-6 h-6 rounded border border-line text-label hover:bg-bg disabled:opacity-40 text-sm leading-none">−</button>
                                <input type="number" min={1} max={60} value={months}
                                  onChange={e => setLineAddonMonth(a.id, parseInt(e.target.value, 10) || 1)}
                                  className="w-10 text-center text-xs input !py-0.5 !px-1" />
                                <button type="button" onClick={() => setLineAddonMonth(a.id, months + 1)} disabled={months >= 60}
                                  className="w-6 h-6 rounded border border-line text-label hover:bg-bg disabled:opacity-40 text-sm leading-none">+</button>
                              </div>
                              <span className="text-[11px] text-greenDark font-semibold tabular-nums">+{Math.round(totalUplift * 100)}%</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <details className="rounded-lg border border-line bg-bg/40 group">
                <summary className="cursor-pointer px-4 py-2.5 flex items-center justify-between text-sm font-medium text-ink select-none">
                  <span>{t('cfg.axis_overrides')} <span className="text-mute font-normal">{t('cfg.optional')}</span></span>
                  <ChevronDown size={14} className="group-open:rotate-180 transition-transform text-mute" />
                </summary>
                <div className="p-4 space-y-3 border-t border-line bg-white">
                  <p className="text-xs text-label">{t('cfg.axis_overrides_hint')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Talent-aware axis options. Creators get sector-based audience, conversion-driven authority,
                         and a Production axis (vs Seasonality on players). */}
                    {(() => {
                      const opts = talentKind === 'creator' ? CREATOR_AXIS_OPTIONS : AXIS_OPTIONS;
                      const isCreator = talentKind === 'creator';
                      return (
                        <>
                          <AxisRow label="Engagement"
                            hint={isCreator
                              ? "Creator's avg engagement rate. >10% means cult-following levels of community heat."
                              : "Talent's last-90-day engagement rate. Best predictor of campaign ROI."}
                            value={overrides.o_eng} globalVal={globals.eng}
                            onChange={v => setOverrideManual('o_eng', v)}
                            options={opts.engagement.map(e => e.factor)}
                            labels={opts.engagement.map(e => e.label.replace(/ —.*$/, ''))}
                            auto={autoOverrides.has('o_eng')}
                            intrinsic={readTalentDefaults(selectedTalent).o_eng}
                            talentName={(selectedTalent as any)?.nickname || ''} />

                          <AxisRow label={isCreator ? "Audience fit" : "Audience"}
                            hint={isCreator
                              ? "Sector-based: how well the creator's audience matches the BRAND vertical."
                              : "How well the audience matches the brand. MENA/Saudi unlocks +30% premium."}
                            value={overrides.o_aud} globalVal={globals.aud}
                            onChange={v => setOverrideManual('o_aud', v)}
                            options={opts.audience.map(e => e.factor)}
                            labels={opts.audience.map(e => isCreator ? e.label.replace(/ \/.*/g, '').slice(0, 14) : e.label)}
                            auto={autoOverrides.has('o_aud')}
                            intrinsic={readTalentDefaults(selectedTalent).o_aud}
                            talentName={(selectedTalent as any)?.nickname || ''} />

                          {isCreator ? (
                            <AxisRow label="Production"
                              hint="How heavy is the creative effort? Scripted/on-ground = more revisions and cost."
                              value={overrides.o_seas} globalVal={globals.seas}
                              onChange={v => setOverrideManual('o_seas', v)}
                              options={(opts as any).production.map((e: any) => e.factor)}
                              labels={(opts as any).production.map((e: any) => e.label.split(' / ')[0])}
                              auto={autoOverrides.has('o_seas')}
                              intrinsic={readTalentDefaults(selectedTalent).o_seas}
                              talentName={(selectedTalent as any)?.nickname || ''} />
                          ) : (
                            <AxisRow label="Seasonality"
                              hint="Campaign window. Ramadan + Worlds = peak demand."
                              value={overrides.o_seas} globalVal={globals.seas}
                              onChange={v => setOverrideManual('o_seas', v)}
                              options={[0.80,1.00,1.20,1.25,1.30,1.35,1.40,1.50]}
                              labels={['Off','Reg','Q4','Major','Launch','Ramadan','Worlds','Mega']}
                              auto={autoOverrides.has('o_seas')}
                              intrinsic={readTalentDefaults(selectedTalent).o_seas}
                              talentName={(selectedTalent as any)?.nickname || ''} />
                          )}

                          <AxisRow label="Language"
                            hint="Bilingual reaches both audiences in one activation — highest leverage."
                            value={overrides.o_lang} globalVal={globals.lang}
                            onChange={v => setOverrideManual('o_lang', v)}
                            options={opts.language.map(e => e.factor)}
                            labels={opts.language.map(e => e.label.split(' ')[0])}
                            auto={autoOverrides.has('o_lang')}
                            intrinsic={readTalentDefaults(selectedTalent).o_lang}
                            talentName={(selectedTalent as any)?.nickname || ''} />

                          <AxisRow label="Authority"
                            hint={isCreator
                              ? "Creator-side authority: 'Hero' = category-defining cultural force; converts at premium."
                              : "Normal = standard. Proven = regional champ / 2yr+ pro. Elite = top-10 world rank or major finalist. Global Star = EWC / Worlds champion. Floor protects pros from being underpriced on social briefs."}
                            value={overrides.o_auth} globalVal={globals.auth}
                            onChange={v => setOverrideManual('o_auth', v)}
                            options={opts.authority.map(e => e.factor)}
                            labels={opts.authority.map(e => e.label.split(' / ')[0])}
                            auto={autoOverrides.has('o_auth')}
                            intrinsic={readTalentDefaults(selectedTalent).o_auth}
                            talentName={(selectedTalent as any)?.nickname || ''} />
                        </>
                      );
                    })()}
                  </div>
                  {/* ─── Creator multipliers (only when talent is a creator) ─── */}
                  {selectedCreator && (
                    <div className="mt-5 rounded-lg border border-line bg-white p-3.5">
                      <div className="flex items-baseline justify-between gap-3 mb-1.5 flex-wrap">
                        <div className="font-semibold text-sm text-ink">Creator multipliers</div>
                        <div className="text-[10px] text-mute uppercase tracking-wide">Defaults from {(selectedCreator as any).nickname} · override per-deal</div>
                      </div>
                      <p className="text-xs text-label leading-relaxed mb-3">
                        Auto-applied when this creator joins a quote. Override here for the specific brand/scope of THIS deal — doesn't change the creator's stored default.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Brand Loyalty */}
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-label font-semibold mb-1 block">Brand loyalty</label>
                          <select className="input text-sm h-9"
                            value={creatorMults.o_brand_loyalty === null ? 'DEFAULT' : String(creatorMults.o_brand_loyalty)}
                            onChange={e => setCreatorMults(s => ({ ...s, o_brand_loyalty: e.target.value === 'DEFAULT' ? null : parseFloat(e.target.value) }))}>
                            <option value="DEFAULT">Creator default ({Math.round(((selectedCreator as any).brand_loyalty_default_pct ?? 0) * 100)}%)</option>
                            <option value="0">0% (new brand)</option>
                            <option value="0.10">−10% (2nd deal)</option>
                            <option value="0.20">−20% (3+ deals)</option>
                            <option value="0.30">−30% (annual contract)</option>
                          </select>
                          <p className="text-[10px] text-mute mt-1">Discount for recurring brand</p>
                        </div>
                        {/* Exclusivity */}
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-label font-semibold mb-1 block">Exclusivity premium</label>
                          <select className="input text-sm h-9"
                            value={creatorMults.o_exclusivity === null ? 'DEFAULT' : String(creatorMults.o_exclusivity)}
                            onChange={e => setCreatorMults(s => ({ ...s, o_exclusivity: e.target.value === 'DEFAULT' ? null : parseFloat(e.target.value) }))}>
                            <option value="DEFAULT">Creator default (+{Math.round(((selectedCreator as any).exclusivity_premium_pct ?? 0) * 100)}%)</option>
                            <option value="0">0% (no exclusivity)</option>
                            <option value="0.25">+25% (1 month)</option>
                            <option value="0.50">+50% (1 quarter)</option>
                            <option value="1.00">+100% (1 year)</option>
                          </select>
                          <p className="text-[10px] text-mute mt-1">Category lock window</p>
                        </div>
                        {/* Cross-vertical */}
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-label font-semibold mb-1 block">Cross-vertical</label>
                          <select className="input text-sm h-9"
                            value={creatorMults.o_cross_vertical === null ? 'DEFAULT' : String(creatorMults.o_cross_vertical)}
                            onChange={e => setCreatorMults(s => ({ ...s, o_cross_vertical: e.target.value === 'DEFAULT' ? null : parseFloat(e.target.value) }))}>
                            <option value="DEFAULT">Creator default (×{((selectedCreator as any).cross_vertical_multiplier ?? 1.0).toFixed(2)})</option>
                            <option value="1.0">×1.00 (gaming brand)</option>
                            <option value="1.15">×1.15 (consumer brand)</option>
                            <option value="1.30">×1.30 (mainstream non-endemic)</option>
                          </select>
                          <p className="text-[10px] text-mute mt-1">Brand vertical fit</p>
                        </div>
                        {/* Engagement quality */}
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-label font-semibold mb-1 block">Engagement quality</label>
                          <select className="input text-sm h-9"
                            value={creatorMults.o_engagement_quality === null ? 'DEFAULT' : String(creatorMults.o_engagement_quality)}
                            onChange={e => setCreatorMults(s => ({ ...s, o_engagement_quality: e.target.value === 'DEFAULT' ? null : parseFloat(e.target.value) }))}>
                            <option value="DEFAULT">Creator default (×{((selectedCreator as any).engagement_quality_modifier ?? 1.0).toFixed(2)})</option>
                            <option value="0.85">×0.85 (low ER)</option>
                            <option value="1.0">×1.00 (avg ER)</option>
                            <option value="1.15">×1.15 (high ER)</option>
                            <option value="1.25">×1.25 (elite ER)</option>
                          </select>
                          <p className="text-[10px] text-mute mt-1">Based on measured ER%</p>
                        </div>
                        {/* Production style */}
                        <div className="sm:col-span-2">
                          <label className="text-[10px] uppercase tracking-wider text-label font-semibold mb-1 block">Production style</label>
                          <select className="input text-sm h-9"
                            value={creatorMults.o_production_style === null ? 'DEFAULT' : String(creatorMults.o_production_style)}
                            onChange={e => setCreatorMults(s => ({ ...s, o_production_style: e.target.value === 'DEFAULT' ? null : parseFloat(e.target.value) }))}>
                            <option value="DEFAULT">Creator default ({(selectedCreator as any).production_style_default ?? 'standard'})</option>
                            <option value="0.9">Raw / UGC (×0.90)</option>
                            <option value="1.0">Standard edit (×1.00)</option>
                            <option value="1.20">Scripted / branded (×1.20)</option>
                            <option value="1.40">Full studio production (×1.40)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Companion / Cameo role — half-rate cap across deliverables + rights */}
                  <div className="mt-5 rounded-lg border border-line bg-white p-3.5">
                    <div className="flex items-baseline justify-between gap-3 mb-1.5 flex-wrap">
                      <div className="font-semibold text-sm text-ink">Companion / Cameo role</div>
                      <div className="text-[10px] text-mute uppercase tracking-wide">Final × 0.5</div>
                    </div>
                    <p className="text-xs text-label leading-relaxed mb-3">
                      Toggle on when this talent is featured as a guest in <em>another</em> creator&apos;s
                      content (cameo in their TikTok, podcast, video). The 0.5× applies uniformly across
                      every selected deliverable AND any usage rights on this line — capped at half because
                      they&apos;re supporting, not the primary creator.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsCompanion(v => !v)}
                      className={[
                        'inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition whitespace-nowrap',
                        isCompanion
                          ? 'border-orange-400 bg-orange-50 text-orange-700'
                          : 'border-line text-label hover:bg-bg',
                      ].join(' ')}
                      aria-pressed={isCompanion}
                    >
                      <span className={isCompanion ? 'inline-block w-2 h-2 rounded-full bg-orange-500' : 'inline-block w-2 h-2 rounded-full border border-mute'} />
                      {isCompanion ? 'Companion role · 50% applied to this player' : 'Mark as companion (50%)'}
                    </button>
                  </div>
                </div>
              </details>

              {/* Live total + commit — sticky so it's always visible */}
              <div className="sticky bottom-2 z-20 rounded-xl bg-greenSoft/90 backdrop-blur border-2 border-green/50 shadow-lift p-4 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-[10px] uppercase tracking-wider text-label">Selection total</div>
                    {onCurrencyChange && (
                      <div className="inline-flex rounded-md border border-line bg-white overflow-hidden text-[10px] font-semibold">
                        {(['SAR', 'USD'] as const).map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => onCurrencyChange(c)}
                            className={
                              'px-2 py-0.5 transition-colors ' +
                              (currency === c
                                ? 'bg-green text-white'
                                : 'text-label hover:bg-greenSoft/40')
                            }
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-ink">{fmtCurrency(previewTotal, currency, usdRate ?? 3.75)}</div>
                  <div className="text-xs text-label mt-0.5">{selectedCount === 0 ? 'No deliverables ticked yet' : `${selectedCount} line${selectedCount === 1 ? '' : 's'} ready`}</div>
                </div>
                <button
                  onClick={commit}
                  disabled={selectedCount === 0}
                  className="btn btn-primary disabled:opacity-50"
                >
                  <Plus size={14} /> {isEditing ? 'Save changes' : `Add ${selectedCount || ''} to quote`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Deliverable groups (multi-select) ─────────────────────────────────────
const GROUP_ORDER = ['Social Media', 'Live & Stream', 'Continuity & Rights', 'On-Ground & Events', 'Other'];

function DeliverableGroups({
  deliverables, picks, currency, usdRate, previewLines, overrides, axisOptions, onAxisChange, onToggle, onQty, onRate, talent,
}: {
  overrides: { o_eng: number | null; o_aud: number | null; o_seas: number | null; o_lang: number | null; o_auth: number | null; o_ctype: number | null };
  axisOptions: any;
  onAxisChange: (key: 'o_eng' | 'o_aud' | 'o_seas' | 'o_lang' | 'o_auth', value: number | null) => void;
  /** Talent record threaded through to PriceBreakdownChip for the data-context block. */
  talent: any;
  deliverables: Array<{ key: string; label: string; rate: number; group: string; manual: boolean; suggestedRange: [number, number] | null }>;
  picks: Record<string, RowSel>;
  currency: string;
  usdRate: number;
  previewLines: Array<{
    key: string; finalAmount: number; finalUnit: number; baseWhy: string;
    socialPrice: number; floorPrice: number; preAddOn: number; confCap: number;
    engGated: number; audGated: number; seasGated: number; authGated: number;
    qty: number;
    mults: {
      base: number; eng: number; aud: number; seas: number; ctype: number;
      lang: number; auth: number; obj: number; rightsPct: number; isCompanion: boolean;
    };
  }>;
  onToggle: (k: string, manual: boolean) => void;
  onQty: (k: string, q: number) => void;
  onRate: (k: string, r: number) => void;
}) {
  const priceMap = new Map(previewLines.map(l => [l.key, l]));
  const grouped: Record<string, typeof deliverables> = {};
  for (const d of deliverables) (grouped[d.group] ||= []).push(d);

  return (
    <div className="space-y-4">
      {GROUP_ORDER.filter(g => grouped[g]?.length).map(g => (
        <div key={g}>
          <div className="text-[10px] uppercase tracking-wider text-mute font-semibold mb-1.5">{g}</div>
          <div className="rounded-lg border border-line divide-y divide-line overflow-hidden">
            {grouped[g].map(d => {
              const sel = picks[d.key];
              const checked = !!sel;
              return (
                <div key={d.key} className={['transition', checked ? 'bg-greenSoft/40' : 'bg-white hover:bg-bg/50'].join(' ')}>
                  <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(d.key, d.manual)}
                      className="w-4 h-4 accent-green"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-ink">{d.label}</div>
                      <div className="text-xs text-mute">
                        {d.manual
                          ? (d.suggestedRange
                              ? <span>Approx. <strong className="text-label">SAR {d.suggestedRange[0].toLocaleString()}–{d.suggestedRange[1].toLocaleString()}</strong></span>
                              : <span className="italic">Manual rate</span>)
                          : `Floor ${fmtCurrency(d.rate, currency, 3.75)}`}
                      </div>
                    </div>
                    {checked && priceMap.get(d.key) && (
                      <PriceBreakdownChip
                        line={priceMap.get(d.key)!}
                        currency={currency}
                        usdRate={usdRate}
                        overrides={overrides}
                        axisOptions={axisOptions}
                        onAxisChange={onAxisChange}
                        talent={talent}
                      />
                    )}
                    {checked && (
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        {d.manual && (
                          <input
                            type="number" min={0}
                            value={sel?.manualRate || ''}
                            placeholder={d.suggestedRange ? `${d.suggestedRange[0].toLocaleString()}` : 'Rate'}
                            onChange={e => onRate(d.key, parseFloat(e.target.value) || 0)}
                            className="input py-1 px-2 text-sm h-8 w-28"
                            onClick={e => e.stopPropagation()}
                            title={d.suggestedRange ? `Approx. range: SAR ${d.suggestedRange[0].toLocaleString()}–${d.suggestedRange[1].toLocaleString()}` : undefined}
                          />
                        )}
                        <input
                          type="number" min={1} value={sel.qty}
                          onChange={e => onQty(d.key, parseInt(e.target.value) || 1)}
                          className="input py-1 px-2 text-sm h-8 w-14 text-right"
                          onClick={e => e.stopPropagation()}
                        />
                        <span className="text-[10px] text-mute uppercase">qty</span>
                      </div>
                    )}
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Per-axis quick-row override ────────────────────────────────────────────
//
// Phase 1: when `auto={true}` the row badges "from <talent>" so reps know
//          the value was seeded from the talent's intrinsic data, not the
//          campaign axis.
//
// Phase 3: when the row is currently inheriting the campaign axis but the
//          talent has a non-neutral intrinsic value that disagrees with the
//          campaign, surface a conflict chip with one-click resolve.
function AxisRow({
  label, hint, value, globalVal, onChange, options, labels,
  auto, intrinsic, talentName,
}: {
  label: string; hint?: string;
  value: number | null; globalVal: number;
  onChange: (v: number | null) => void;
  options: number[]; labels: string[];
  auto?: boolean;
  intrinsic?: number | null;
  talentName?: string;
}) {
  const sel = value === null ? 'GLOBAL' : String(value);
  // A conflict exists when:
  //   (a) the line is currently inheriting the campaign default (value is null),
  //   (b) the talent has its own intrinsic value, AND
  //   (c) that intrinsic value differs meaningfully from the campaign value.
  // We don't show conflicts when the line already has the talent's value
  // (auto=true) or when the user has explicitly typed something else.
  const hasConflict =
    value === null &&
    typeof intrinsic === 'number' &&
    Math.abs(intrinsic - globalVal) > 0.005;
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <label className="text-[10px] uppercase tracking-wider text-label font-semibold">{label}</label>
        {auto && (
          <span
            className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold bg-green/15 text-greenDark"
            title={talentName ? `Auto-seeded from ${talentName}'s record. Edit to override.` : 'Auto-seeded from the talent record.'}
          >
            from {talentName || 'talent'}
          </span>
        )}
      </div>
      <select
        value={sel}
        onChange={e => onChange(e.target.value === 'GLOBAL' ? null : parseFloat(e.target.value))}
        className="input text-sm h-9"
      >
        <option value="GLOBAL">Campaign default ({globalVal.toFixed(2)}×)</option>
        {options.map((o, i) => (
          <option key={o} value={o}>{labels[i]} ({o.toFixed(2)}×)</option>
        ))}
      </select>
      {hasConflict && (
        <div className="mt-1 flex items-start gap-1.5 p-1.5 rounded bg-amber-50 border border-amber-200">
          <span className="text-[10px] leading-snug text-amber-900 flex-1">
            Campaign says {globalVal.toFixed(2)}× — {talentName || 'this talent'}’s record says {(intrinsic as number).toFixed(2)}×.
          </span>
          <button
            type="button"
            onClick={() => onChange(intrinsic as number)}
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-200 hover:bg-amber-300 text-amber-900 whitespace-nowrap"
            title="Pin this line to the talent's intrinsic value"
          >
            Use {(intrinsic as number).toFixed(2)}×
          </button>
        </div>
      )}
      {hint && <p className="text-[10px] text-mute mt-1 leading-snug">{hint}</p>}
    </div>
  );
}

// ── Social handle chips (clickable) ────────────────────────────────────────
function SocialChips({ talent }: { talent: Player | Creator | null }) {
  if (!talent) return null;
  const t = talent as any;
  const items: Array<{ key: string; href: string; label: string; icon: any }> = [];
  function add(key: string, label: string, icon: any) {
    const v = t[key];
    if (!v || typeof v !== 'string') return;
    const s = v.trim();
    if (!s || s === '-' || s === '—') return;
    const href = /^https?:\/\//i.test(s) ? s : `https://${s.replace(/^@/, '')}`;
    items.push({ key, href, label, icon });
  }
  add('x_handle',  'X / Twitter', Twitter);
  add('instagram', 'Instagram',   Instagram);
  add('twitch',    'Twitch',      Twitch);
  add('youtube',   'YouTube',     Youtube);
  add('facebook',  'Facebook',    Facebook);
  add('tiktok',    'TikTok',      ExternalLink);
  add('kick',      'Kick',        ExternalLink);
  if (items.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {items.map(it => {
        const Icon = it.icon;
        return (
          <a key={it.key} href={it.href} target="_blank" rel="noopener noreferrer" title={it.label}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-line text-[11px] text-label hover:text-ink hover:border-green hover:bg-greenSoft transition">
            <Icon size={12} />
            <span>{it.label}</span>
            <ExternalLink size={10} className="opacity-50" />
          </a>
        );
      })}
    </div>
  );
}

// ─── TalentDataContext ──────────────────────────────────────────────────────
// Top of the price popover. Surfaces the data signals that drive the
// ConfidenceCap haircut and the AuthorityFloor decay scaling, so sales sees
// WHY a price has been adjusted up or down — not just the number it landed at.
function TalentDataContext({ talent, confCap }: { talent: any; confCap: number }) {
  if (!talent) return null;
  const hasSocials    = !!talent.has_social_data    || (Number(talent.followers_ig ?? 0) + Number(talent.followers_tiktok ?? 0) + Number(talent.followers_yt ?? 0) + Number(talent.followers_twitch ?? 0) + Number(talent.followers_x ?? 0)) > 0;
  const hasTournament = !!talent.has_tournament_data || !!talent.liquipedia_url;
  const hasAudience   = !!talent.has_audience_demo;
  const decay = Number(talent.achievement_decay_factor ?? 1);
  const state = (talent.data_completeness as string | undefined) ?? (
    hasSocials && hasTournament ? 'full'
    : hasSocials                ? 'socials_only'
    : hasTournament             ? 'tournament_only'
    : 'minimal'
  );
  const stateColor: Record<string, string> = {
    full:            'bg-green/15 text-greenDark border-green/40',
    socials_only:    'bg-amber-50 text-amber-700 border-amber-300',
    tournament_only: 'bg-amber-50 text-amber-700 border-amber-300',
    minimal:         'bg-red-50 text-red-700 border-red-200',
  };
  const Pill = ({ on, label }: { on: boolean; label: string }) => (
    <span className={['inline-flex items-center gap-1 px-1.5 py-0 rounded-full text-[10px] font-semibold border whitespace-nowrap',
      on ? 'bg-green/15 text-greenDark border-green/40' : 'bg-bg text-mute border-line line-through opacity-70'].join(' ')}>
      {on ? '✓' : '✗'} {label}
    </span>
  );
  return (
    <div className="rounded-md border border-line bg-bg/50 px-2.5 py-2 space-y-1.5">
      <div className="text-[9px] uppercase tracking-wider text-mute font-bold">Talent data state</div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Pill on={hasSocials}    label="Socials" />
        <Pill on={hasTournament} label="Tournament" />
        <Pill on={hasAudience}   label="Audience" />
        <span className={['ml-auto inline-flex items-center px-1.5 py-0 rounded-full text-[10px] font-bold border whitespace-nowrap', stateColor[state] ?? stateColor.minimal].join(' ')}>
          {state.replace('_', ' ')}
        </span>
      </div>
      <div className="flex items-center justify-between text-[10px] text-mute font-mono tabular-nums pt-0.5">
        <span>
          Achievement decay <span className="text-ink">× {decay.toFixed(3)}</span>
          {decay < 1 && <span className="ml-1 text-mute">(scaling Authority floor down)</span>}
        </span>
        <span>
          ConfidenceCap <span className={confCap < 1 ? 'text-amber-700 font-semibold' : 'text-greenDark font-semibold'}>× {confCap.toFixed(2)}</span>
        </span>
      </div>
    </div>
  );
}

// ─── PhaseHeader — section divider inside the price popover ─────────────────
function PhaseHeader({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-greenSoft text-greenDark text-[9px] font-bold tabular-nums">{n}</span>
      <span className="text-[10px] uppercase tracking-wider text-label font-bold">{title}</span>
      <span className="flex-1 h-px bg-line" />
    </div>
  );
}

// ─── PriceBreakdownChip ─────────────────────────────────────────────────────
// Click the live SAR figure → popover that explains the multiplier chain.
// Highlights any axis ≠ 1.0× so 'why is it 11,495' is answered at a glance.
function PriceBreakdownChip({
  line, currency, usdRate, overrides, axisOptions, onAxisChange, talent,
}: {
  line: {
    finalAmount: number; finalUnit: number; qty: number; baseWhy: string;
    socialPrice: number; floorPrice: number; preAddOn: number; confCap: number;
    engGated: number; audGated: number; seasGated: number; authGated: number;
    mults: {
      base: number; eng: number; aud: number; seas: number; ctype: number;
      lang: number; auth: number; obj: number; rightsPct: number; isCompanion: boolean;
    };
  };
  currency: string;
  usdRate: number;
  overrides: { o_eng: number | null; o_aud: number | null; o_seas: number | null; o_lang: number | null; o_auth: number | null; o_ctype: number | null };
  axisOptions: any;
  onAxisChange: (key: 'o_eng' | 'o_aud' | 'o_seas' | 'o_lang' | 'o_auth', value: number | null) => void;
  /** Talent record used to render the data-state context block at the top. */
  talent: any;
}) {
  const [open, setOpen] = useState(false);
  const chipRef = useRef<HTMLDivElement>(null);
  const [popPos, setPopPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  // Re-compute position when popover opens / on viewport resize.
  useEffect(() => {
    if (!open) return;
    function place() {
      const el = chipRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const POP_W = 360;
      // Default: anchor right edge = chip right edge, drop below the chip.
      let right = window.innerWidth - r.right;
      let top = r.bottom + 8;
      // If popover would extend past the left viewport edge, anchor to chip's left instead.
      if (r.right - POP_W < 8) {
        right = Math.max(8, window.innerWidth - r.left - POP_W);
      }
      // If popover would extend past the bottom of the viewport, anchor above the chip.
      const POP_H_ESTIMATE = 480;
      if (top + POP_H_ESTIMATE > window.innerHeight) {
        top = Math.max(8, r.top - POP_H_ESTIMATE - 8);
      }
      setPopPos({ top, right });
    }
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);
  const m = line.mults;
  // The actual axis multipliers applied (with state-driven gating)
  // Interactive axis rows — clicking opens a small picker that calls onAxisChange.
  // Falls back to global value when override is null. The picker dropdown also
  // includes a 'Reset to campaign' option (sets override → null).
  type AxisRow = {
    k: string; v: number; note?: string;
    axisKey?: 'o_eng' | 'o_aud' | 'o_seas' | 'o_lang' | 'o_auth';
    options?: number[]; labels?: string[];
    isOverridden?: boolean;
  };
  const rows: AxisRow[] = [
    { k: 'Base',  v: m.base, note: 'Per-platform anchor — calibration multipliers apply next' },
    {
      k: 'Engagement', v: line.engGated, axisKey: 'o_eng',
      options: axisOptions.engagement.map((e: any) => e.factor),
      labels:  axisOptions.engagement.map((e: any) => e.label.replace(/ —.*$/, '')),
      isOverridden: overrides.o_eng != null,
    },
    {
      k: 'Audience', v: line.audGated, axisKey: 'o_aud',
      options: axisOptions.audience.map((e: any) => e.factor),
      labels:  axisOptions.audience.map((e: any) => e.label.replace(/ \/.*$/, '')),
      isOverridden: overrides.o_aud != null,
    },
    {
      k: 'Seasonality', v: line.seasGated, axisKey: 'o_seas',
      options: (axisOptions.seasonality ?? axisOptions.production)?.map((e: any) => e.factor) ?? [],
      labels:  (axisOptions.seasonality ?? axisOptions.production)?.map((e: any) => e.label) ?? [],
      isOverridden: overrides.o_seas != null,
    },
    { k: 'Content', v: m.ctype },
    {
      k: 'Language', v: m.lang, axisKey: 'o_lang',
      options: axisOptions.language.map((e: any) => e.factor),
      labels:  axisOptions.language.map((e: any) => e.label),
      isOverridden: overrides.o_lang != null,
    },
    {
      k: 'Authority', v: line.authGated,
      note: m.auth !== line.authGated ? `gated from ${m.auth}` : undefined,
      axisKey: 'o_auth',
      options: axisOptions.authority.map((e: any) => e.factor),
      labels:  axisOptions.authority.map((e: any) => e.label),
      isOverridden: overrides.o_auth != null,
    },
  ];
  if (line.confCap !== 1) rows.push({ k: 'Confidence cap', v: line.confCap });
  if (m.rightsPct > 0)    rows.push({ k: 'Rights uplift', v: 1 + m.rightsPct, note: `+${Math.round(m.rightsPct * 100)}%` });
  if (m.isCompanion)      rows.push({ k: 'Companion', v: 0.5, note: '50% — supporting role' });
  const flooredByIRL = line.floorPrice > line.socialPrice;
  return (
    <div ref={chipRef} className="relative text-right mr-1 hidden sm:block">
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(v => !v); }}
        className="text-right rounded-md hover:bg-white/40 px-1.5 py-0.5 -mx-1.5 -my-0.5 transition group"
        title="Click to see how this price was computed"
      >
        <div className="text-[10px] uppercase tracking-wider text-mute font-semibold leading-none">
          Live <span className="text-greenDark normal-case font-normal">· why?</span>
        </div>
        <div className="text-sm font-bold text-greenDark tabular-nums leading-tight">
          {fmtCurrency(line.finalAmount, currency, usdRate)}
        </div>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
          <div
            // Fixed-position popover: escapes any parent overflow:hidden.
            // Coords computed from chip's bounding rect on open + scroll.
            style={{ position: 'fixed', top: popPos.top, right: popPos.right, width: 360 }}
            className="z-[70] rounded-xl border-2 border-greenDark/30 bg-white shadow-2xl text-left p-4 space-y-3 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-baseline justify-between">
              <div className="text-[10px] uppercase tracking-wider text-mute font-bold">Why this price?</div>
              <button onClick={() => setOpen(false)} className="text-mute hover:text-ink">×</button>
            </div>

            {/* ── Talent data context — explains ConfidenceCap + Authority floor scaling ── */}
            <TalentDataContext talent={talent} confCap={line.confCap} />

            {line.baseWhy && (
              <div className="text-[11px] text-label leading-relaxed bg-bg/60 border border-line rounded-md px-2.5 py-1.5">
                <span className="text-mute font-semibold uppercase tracking-wider text-[9px] block mb-0.5">Where the base comes from</span>
                {line.baseWhy}
              </div>
            )}

            {/* ── Phase 1 — Base ───────────────────────────────────── */}
            <PhaseHeader n={1} title="Base — per-platform anchor" />
            <div className="flex justify-between text-xs font-mono tabular-nums px-1">
              <span className="text-label">{rows[0].k}</span>
              <span className="font-bold text-ink">{fmtCurrency(line.mults.base, currency, usdRate)}</span>
            </div>

            {/* ── Phase 2 — Calibration → Social price ─────────────── */}
            <PhaseHeader n={2} title="Calibration (multipliers stack above base)" />
            <div className="text-xs space-y-1 font-mono tabular-nums">
              {rows.slice(1).filter(r => r.k !== 'Confidence cap' && r.k !== 'Rights uplift' && r.k !== 'Companion').map((r, i) => (
                <AxisPickRow
                  key={i}
                  r={r}
                  currency={currency}
                  usdRate={usdRate}
                  onChange={(v) => r.axisKey && onAxisChange(r.axisKey, v)}
                />
              ))}
              <div className="flex justify-between items-baseline border-t border-line pt-1 mt-1 px-1 gap-2">
                <span className="text-label font-semibold">Social price</span>
                <span className="flex items-baseline gap-1.5">
                  {line.socialPrice < line.mults.base && (
                    <span className="text-[9px] uppercase tracking-wider text-amber-700 font-semibold whitespace-nowrap"
                          title="Multipliers landed below the per-platform base — the parallel authority floor will win in the next step.">
                      below base
                    </span>
                  )}
                  <span className={['font-mono tabular-nums font-bold', flooredByIRL ? 'text-mute line-through decoration-amber-500/60' : 'text-greenDark'].join(' ')}>
                    {fmtCurrency(line.socialPrice, currency, usdRate)}
                  </span>
                </span>
              </div>
            </div>

            {/* ── Phase 3 — Authority floor (parallel calculation) ─── */}
            {line.floorPrice > 0 && (
              <>
                <PhaseHeader n={3} title="Authority floor (parallel calc — pros)" />
                <div className={['flex justify-between text-xs font-mono tabular-nums px-1', flooredByIRL ? 'text-amber-700 font-bold' : 'text-mute'].join(' ')}>
                  <span>IRL × FloorShare × seas × lang × auth × decay</span>
                  <span>{fmtCurrency(line.floorPrice, currency, usdRate)}</span>
                </div>
              </>
            )}

            {/* ── Phase 4 — MAX wins → Confidence cap ──────────────── */}
            <PhaseHeader n={line.floorPrice > 0 ? 4 : 3} title={`MAX → Confidence cap${line.confCap < 1 ? ` × ${line.confCap.toFixed(2)}` : ' × 1.00'}`} />
            <div className="flex justify-between text-xs font-mono tabular-nums px-1">
              <span className="text-label">
                {flooredByIRL ? 'Authority floor wins' : 'Social price wins'}
                {line.confCap < 1 && <span className="text-amber-700 ml-1">· capped</span>}
              </span>
              <span className="font-bold text-ink">{fmtCurrency(Math.round(line.preAddOn * line.confCap), currency, usdRate)}</span>
            </div>

            {/* ── Phase 5 — Add-ons (only show if any apply) ──────── */}
            {(line.mults.rightsPct > 0 || line.mults.isCompanion || line.qty > 1) && (
              <>
                <PhaseHeader n={line.floorPrice > 0 ? 5 : 4} title="Add-ons" />
                <div className="text-xs space-y-1 font-mono tabular-nums px-1">
                  {line.mults.rightsPct > 0 && (
                    <div className="flex justify-between">
                      <span className="text-label">Rights uplift</span>
                      <span>+{Math.round(line.mults.rightsPct * 100)}%</span>
                    </div>
                  )}
                  {line.mults.isCompanion && (
                    <div className="flex justify-between">
                      <span className="text-label">Companion (supporting role)</span>
                      <span>× 0.5</span>
                    </div>
                  )}
                  {line.qty > 1 && (
                    <div className="flex justify-between text-mute">
                      <span>Per unit · Qty {line.qty}</span>
                      <span>{fmtCurrency(line.finalUnit, currency, usdRate)}</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── Final ────────────────────────────────────────────── */}
            <div className="flex justify-between border-t-2 border-greenDark/40 pt-2 px-1">
              <span className="font-bold text-ink uppercase text-[11px] tracking-wider">Final</span>
              <span className="font-mono font-extrabold tabular-nums text-greenDark text-base">{fmtCurrency(line.finalAmount, currency, usdRate)}</span>
            </div>

            <div className="text-[10px] text-mute italic leading-relaxed">
              Click any multiplier to override it for this line. Adjust globally in the Campaign tab.
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Interactive axis row inside the price-breakdown popover ────────────────
// Click the value chip → opens a small dropdown of valid options for the axis.
// Picking an option calls onChange and the parent's setOverrideManual fires —
// previewLines re-computes, and the popover updates live (same render).
// 'Reset to campaign' sends null which removes the per-line override.
function AxisPickRow({
  r, currency, usdRate, onChange,
}: {
  r: {
    k: string; v: number; note?: string;
    axisKey?: 'o_eng' | 'o_aud' | 'o_seas' | 'o_lang' | 'o_auth';
    options?: number[]; labels?: string[];
    isOverridden?: boolean;
  };
  currency: string; usdRate: number;
  onChange: (v: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const editable = !!r.axisKey && !!(r.options && r.options.length);
  const highlighted = r.v !== 1 && r.k !== 'Floor';
  return (
    <div className={[
      'flex justify-between gap-3 px-2 py-1 rounded items-center',
      highlighted ? 'bg-amber-50 border-l-2 border-amber-400' : '',
    ].join(' ')}>
      <span className="text-label">
        {r.k}
        {r.note && <span className="text-mute"> ({r.note})</span>}
        {r.isOverridden && (
          <span className="ml-1.5 inline-block text-[9px] uppercase tracking-wider text-greenDark font-bold align-middle">override</span>
        )}
      </span>
      <div className="relative">
        {editable ? (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o); }}
            className={[
              'inline-flex items-center gap-1 px-2 py-0.5 rounded border transition cursor-pointer',
              highlighted
                ? 'border-amber-400 text-amber-700 font-bold bg-white hover:bg-amber-100'
                : 'border-line text-ink hover:bg-bg',
            ].join(' ')}
            title="Click to change for this line"
          >
            × {r.v.toFixed(2)}
            <span className="text-[8px] text-mute">▾</span>
          </button>
        ) : (
          <span className={highlighted ? 'text-amber-700 font-bold' : 'text-ink'}>
            {r.k === 'Floor' ? fmtCurrency(r.v, currency, usdRate) : `× ${r.v.toFixed(2)}`}
          </span>
        )}
        {open && editable && (
          <>
            <div className="fixed inset-0 z-50" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-1 w-52 z-[60] rounded-lg border border-line bg-white shadow-2xl py-1 max-h-72 overflow-y-auto">
              {r.options!.map((opt, idx) => {
                const isCurrent = Math.abs(opt - r.v) < 0.001;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onChange(opt); setOpen(false); }}
                    className={[
                      'w-full text-left px-3 py-1.5 text-xs flex items-center justify-between gap-2 transition',
                      isCurrent ? 'bg-greenSoft/40 text-greenDark font-semibold' : 'hover:bg-bg text-ink',
                    ].join(' ')}
                  >
                    <span className="truncate">{r.labels?.[idx] ?? String(opt)}</span>
                    <span className="font-mono tabular-nums text-mute">× {opt.toFixed(2)}</span>
                  </button>
                );
              })}
              {r.isOverridden && (
                <>
                  <div className="border-t border-line my-1" />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onChange(null); setOpen(false); }}
                    className="w-full text-left px-3 py-1.5 text-xs text-mute hover:bg-red-50 hover:text-red-700"
                  >
                    Reset to campaign default
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
