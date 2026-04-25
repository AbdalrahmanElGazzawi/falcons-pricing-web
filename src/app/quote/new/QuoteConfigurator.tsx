'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus, X as XIcon, ChevronDown, ChevronUp, Check,
  Twitter, Instagram, Youtube, Twitch, Facebook, ExternalLink,
} from 'lucide-react';
import { SearchInput } from '@/components/SearchInput';
import { computeLine, type MeasurementConfidence } from '@/lib/pricing';
import { fmtMoney, fmtPct, tierClass, fmtCurrency } from '@/lib/utils';
import {
  PLAYER_PLATFORMS, CREATOR_PLATFORMS,
  type Player, type Creator, type Tier,
} from '@/lib/types';
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
};

type RowSel = { qty: number; manualRate?: number };

export function QuoteConfigurator({
  players, creators, tiers, globals, currency, usdRate, addonsUpliftPct, scrollHook,
  initialEdit, onCommit, onCancelEdit,
}: {
  players: Player[];
  creators: Creator[];
  tiers: Tier[];
  globals: Globals;
  currency: string;
  usdRate?: number;
  addonsUpliftPct: number;
  scrollHook?: React.MutableRefObject<HTMLDivElement | null>;
  initialEdit?: LineDraft | null;
  onCommit: (drafts: LineDraft[]) => void;
  onCancelEdit?: () => void;
}) {
  const isEditing = !!initialEdit;

  // ── Picker state
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>(''); // '', 'player', 'influencer', 'creator'
  const [gameFilter, setGameFilter] = useState<string>('');

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

  // ── Reset picks when changing talent (unless we're editing)
  useEffect(() => {
    if (!isEditing) setPicks({});
  }, [selectedId, talentKind, isEditing]);

  // ── Scroll into view when external code (edit-line pencil) signals
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (initialEdit && rootRef.current) {
      rootRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [initialEdit?.uid]);
  if (scrollHook) scrollHook.current = rootRef.current;

  // ── Filtered talent list
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (talentKind === 'creator') {
      let list = creators.slice();
      if (tierFilter) list = list.filter(c => c.tier_code === tierFilter);
      if (q) list = list.filter(c => c.nickname.toLowerCase().includes(q));
      return list.map(c => ({
        id: c.id, kind: 'creator' as const, nickname: c.nickname,
        full_name: '', tier: c.tier_code || '', game: '', team: '', role: '',
      }));
    }
    let list = players.slice();
    if (roleFilter === 'influencer') list = list.filter(p => (p.role || '').toLowerCase() === 'influencer');
    else list = list.filter(p => (p.role || '').toLowerCase() !== 'influencer');
    if (tierFilter) list = list.filter(p => p.tier_code === tierFilter);
    if (gameFilter) list = list.filter(p => p.game === gameFilter);
    if (q) list = list.filter(p =>
      p.nickname.toLowerCase().includes(q) ||
      (p.full_name ?? '').toLowerCase().includes(q) ||
      (p.team ?? '').toLowerCase().includes(q)
    );
    return list.map(p => ({
      id: p.id, kind: 'player' as const, nickname: p.nickname,
      full_name: p.full_name || '', tier: p.tier_code || '', game: p.game || '',
      team: p.team || '', role: p.role || '',
    }));
  }, [search, tierFilter, roleFilter, gameFilter, talentKind, players, creators]);

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
        rate: ((selectedCreator as any)[p.key] as number) || 0,
        group: 'Social Media' as const, manual: false,
        suggestedRange: null,
      })).filter(d => d.rate > 0);
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
          floorShare, rightsPct: addonsUpliftPct, qty: sel.qty,
        });
        return { key: k, label: d.label, qty: sel.qty, rate: baseFee, ...r };
      });
  }, [picks, deliverables, selectedTalent, selectedPlayer, selectedCreator, tierMap, overrides, globals, addonsUpliftPct]);

  const previewTotal = previewLines.reduce((s, l) => s + l.finalAmount, 0);
  const selectedCount = previewLines.length;

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
          <h2 className="font-semibold">{isEditing ? 'Edit deliverable' : 'Add deliverables'}</h2>
          <p className="text-xs text-mute mt-0.5">
            {isEditing ? 'Update this line, then click Save.' : 'Pick a talent, tick the deliverables, set quantities, hit Add. Repeat for the next.'}
          </p>
        </div>
        {isEditing && onCancelEdit && (
          <button onClick={onCancelEdit} className="btn btn-ghost text-xs">
            <XIcon size={12} /> Cancel edit
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
              ['creator',    'Creators',   () => { setTalentKind('creator'); setRoleFilter('');           setSearch(''); setTierFilter(''); setGameFilter(''); }],
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
              return (
                <button
                  key={t.kind + t.id}
                  onClick={() => { setSelectedId(t.id); }}
                  className={[
                    'w-full text-left px-3 py-2.5 transition',
                    active ? 'bg-greenSoft border-l-4 border-green' : 'hover:bg-bg',
                  ].join(' ')}
                >
                  <div className="font-medium text-ink text-sm truncate">{t.nickname}</div>
                  {(t.tier || t.game || t.team || t.role) && (
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap text-[11px] text-mute">
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
                    onToggle={togglePick}
                    onQty={setRowQty}
                    onRate={setRowRate}
                  />
                )}
              </div>

              {/* Quick axis tweaks */}
              <details className="rounded-lg border border-line bg-bg/40 group">
                <summary className="cursor-pointer px-4 py-2.5 flex items-center justify-between text-sm font-medium text-ink select-none">
                  <span>Axis overrides for this player <span className="text-mute font-normal">(optional)</span></span>
                  <ChevronDown size={14} className="group-open:rotate-180 transition-transform text-mute" />
                </summary>
                <div className="p-4 space-y-3 border-t border-line bg-white">
                  <p className="text-xs text-label">Override the campaign defaults for these specific deliverables. Leave on Campaign default to inherit.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <AxisRow label="Engagement" hint="Talent's last-90-day engagement rate. Best predictor of campaign ROI." value={overrides.o_eng} globalVal={globals.eng} onChange={v => setOverrides(o => ({ ...o, o_eng: v }))} options={[0.70,0.90,1.00,1.20,1.40,1.60]} labels={['<2%','2–4%','4–6%','6–8%','8–10%','>10%']} />
                    <AxisRow label="Audience"   hint="How well the audience matches the brand. MENA/Saudi unlocks +30% premium." value={overrides.o_aud} globalVal={globals.aud} onChange={v => setOverrides(o => ({ ...o, o_aud: v }))} options={[0.85,1.00,1.20,1.30,1.40,1.50]} labels={['Generic','Gaming-adj.','Core','MENA','Esports','Elite']} />
                    <AxisRow label="Seasonality" hint="Campaign window. Ramadan + Worlds = peak demand." value={overrides.o_seas} globalVal={globals.seas} onChange={v => setOverrides(o => ({ ...o, o_seas: v }))} options={[0.80,1.00,1.20,1.25,1.30,1.35,1.40,1.50]} labels={['Off','Reg','Q4','Major','Launch','Ramadan','Worlds','Mega']} />
                    <AxisRow label="Content type" hint="Already set by the toggle above. Override here if you need an unusual mix." value={overrides.o_ctype} globalVal={globals.ctype} onChange={v => setOverrides(o => ({ ...o, o_ctype: v }))} options={[0.85,1.00,1.15]} labels={['Organic','Integrated','Sponsored']} />
                    <AxisRow label="Language"   hint="Bilingual reaches both audiences in one activation — highest leverage." value={overrides.o_lang} globalVal={globals.lang} onChange={v => setOverrides(o => ({ ...o, o_lang: v }))} options={[1.00,1.05,1.15]} labels={['EN','AR','EN+AR']} />
                    <AxisRow label="Authority"  hint="Championship credentials. Pro status = price floor protection." value={overrides.o_auth} globalVal={globals.auth} onChange={v => setOverrides(o => ({ ...o, o_auth: v }))} options={[1.00,1.15,1.30,1.50]} labels={['Normal','Proven','Elite','Star']} />
                  </div>
                </div>
              </details>

              {/* Live total + commit */}
              <div className="rounded-lg bg-greenSoft/40 border border-green/30 p-4 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-label">Selection total</div>
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
const GROUP_ORDER = ['Social Media', 'Live & Stream', 'On-Ground & Events', 'Other'];

function DeliverableGroups({
  deliverables, picks, currency, onToggle, onQty, onRate,
}: {
  deliverables: Array<{ key: string; label: string; rate: number; group: string; manual: boolean; suggestedRange: [number, number] | null }>;
  picks: Record<string, RowSel>;
  currency: string;
  onToggle: (k: string, manual: boolean) => void;
  onQty: (k: string, q: number) => void;
  onRate: (k: string, r: number) => void;
}) {
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
                          : `Base ${fmtCurrency(d.rate, currency, 3.75)}`}
                      </div>
                    </div>
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
function AxisRow({ label, hint, value, globalVal, onChange, options, labels }: {
  label: string; hint?: string;
  value: number | null; globalVal: number;
  onChange: (v: number | null) => void;
  options: number[]; labels: string[];
}) {
  const sel = value === null ? 'GLOBAL' : String(value);
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-label font-semibold mb-1 block">{label}</label>
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
