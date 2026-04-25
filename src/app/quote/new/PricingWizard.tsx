'use client';
import { useEffect, useMemo, useState } from 'react';
import { computeLine, type MeasurementConfidence } from '@/lib/pricing';
import { fmtMoney, tierClass } from '@/lib/utils';
import {
  PLAYER_PLATFORMS, CREATOR_PLATFORMS,
  type Player, type Creator, type Tier, type PlatformGroup,
} from '@/lib/types';
import {
  ArrowLeft, ArrowRight, Check, ChevronRight, Plus, User, Users, X,
  Megaphone, ExternalLink, Twitter, Instagram, Youtube, Twitch, Facebook,
} from 'lucide-react';
import { SearchInput } from '@/components/SearchInput';
import { newUid, type LineDraft } from './line-draft';

// ───────────────────────────────────────────────────────────────────────────
// Dynamic Pricing Adjustment Matrix — mirrors the Team Falcons Google Sheet
// (wizard-only UI catalog; engine in src/lib/pricing.ts is untouched)
// ───────────────────────────────────────────────────────────────────────────
const MATRIX = {
  engagement: [
    { label: '<2%',   factor: 0.70 },
    { label: '2–4%',  factor: 0.90 },
    { label: '4–6%',  factor: 1.00 },
    { label: '6–8%',  factor: 1.20 },
    { label: '8–10%', factor: 1.40 },
    { label: '>10%',  factor: 1.60 },
  ],
  audience: [
    { label: 'Generic',              factor: 0.85 },
    { label: 'Gaming-adjacent',      factor: 1.00 },
    { label: 'Core Gaming',          factor: 1.20 },
    { label: 'MENA / Saudi',         factor: 1.30 },
    { label: 'Esports-focused',      factor: 1.40 },
    { label: 'Global Esports Elite', factor: 1.50 },
  ],
  seasonality: [
    { label: 'Off-season',       factor: 0.80 },
    { label: 'Regular',          factor: 1.00 },
    { label: 'Holiday / Q4',     factor: 1.20 },
    { label: 'Regional Major',   factor: 1.25 },
    { label: 'Game launch',      factor: 1.30 },
    { label: 'Ramadan MENA',     factor: 1.35 },
    { label: 'Global / Worlds',  factor: 1.40 },
    { label: 'Exec / Mega Peak', factor: 1.50 },
  ],
  contentType: [
    { label: 'Organic',    factor: 0.85 },
    { label: 'Integrated', factor: 1.00 },
    { label: 'Sponsored',  factor: 1.15 },
  ],
  language: [
    { label: 'English',   factor: 1.00 },
    { label: 'Arabic',    factor: 1.05 },
    { label: 'Bilingual', factor: 1.15 },
  ],
  authority: [
    { label: 'Normal',          factor: 1.00 },
    { label: 'Proven',          factor: 1.15 },
    { label: 'Elite Contender', factor: 1.30 },
    { label: 'Global Star',     factor: 1.50 },
  ],
} as const;

// Influencers live in the players table with role='Influencer'.
// 'Player' tab excludes them; 'Influencer' tab is players-where-role-Influencer.
function influencerPredicate(p: Player) { return (p.role || '').toLowerCase() === 'influencer'; }
function isPlayerSource(t: string | null) { return t === 'player' || t === 'influencer'; }

type Globals = {
  eng: number; aud: number; seas: number; ctype: number; lang: number; auth: number;
  obj: number; conf: MeasurementConfidence;
};

type WizardStep = 1 | 2 | 3 | 4 | 5;

type WizardState = {
  step: WizardStep;
  talent_type: 'player' | 'creator' | 'influencer' | null;
  tier_code: string | null;
  game: string | null;
  team: string | null;
  talent_id: number | null;
  platform_key: string | null;
  qty: number;
  manual_rate: number | null; // entered when picking a manual deliverable
  o_ctype: number | null;
  o_eng: number | null;
  o_aud: number | null;
  o_seas: number | null;
  o_lang: number | null;
  o_auth: number | null;
};

export function PricingWizard({
  mode, initial, players, creators, tiers, globals, currency,
  addonsUpliftPct, onCancel, onCommit, onCommitAndAnother,
}: {
  mode: 'add' | 'edit';
  initial?: LineDraft;
  players: Player[];
  creators: Creator[];
  tiers: Tier[];
  globals: Globals;
  currency: string;
  addonsUpliftPct: number;
  onCancel: () => void;
  onCommit: (draft: LineDraft) => void;
  onCommitAndAnother?: (draft: LineDraft) => void;
}) {
  // ── Seed state (edit mode = start at step 5 pre-filled; add mode = step 1)
  const [state, setState] = useState<WizardState>(() => {
    if (initial) {
      const p = initial.talent_type === 'player'
        ? players.find(x => x.id === initial.talent_id)
        : null;
      return {
        step: 5,
        talent_type: initial.talent_type,
        tier_code: p?.tier_code ?? null,
        game: p?.game ?? null,
        team: p?.team ?? null,
        talent_id: initial.talent_id,
        platform_key: initial.platform,
        qty: initial.qty,
        manual_rate: initial.platform.startsWith('manual_') ? initial.base_rate : null,
        o_ctype: initial.o_ctype,
        o_eng: initial.o_eng,
        o_aud: initial.o_aud,
        o_seas: initial.o_seas,
        o_lang: initial.o_lang,
        o_auth: initial.o_auth,
      };
    }
    return {
      step: 1,
      talent_type: null, tier_code: null, game: null, team: null,
      talent_id: null, platform_key: null, qty: 1, manual_rate: null,
      o_ctype: null, o_eng: null, o_aud: null, o_seas: null, o_lang: null, o_auth: null,
    };
  });

  const patch = (p: Partial<WizardState>) => setState(s => ({ ...s, ...p }));
  const jumpTo = (step: WizardStep) => setState(s => ({ ...s, step }));

  // Escape cancels
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onCancel]);

  // ── Selected talent objects
  const selectedPlayer = state.talent_id && isPlayerSource(state.talent_type)
    ? players.find(p => p.id === state.talent_id) ?? null
    : null;
  const selectedCreator = state.talent_id && state.talent_type === 'creator'
    ? creators.find(c => c.id === state.talent_id) ?? null
    : null;

  const tierMap = useMemo(() => {
    const m = new Map<string, Tier>();
    tiers.forEach(t => m.set(t.code, t));
    return m;
  }, [tiers]);

  // ── Build current LineDraft shape
  const draft: LineDraft | null = useMemo(() => {
    if (!state.talent_type || !state.talent_id || !state.platform_key) return null;
    if (isPlayerSource(state.talent_type) && selectedPlayer) {
      const opt = PLAYER_PLATFORMS.find(o => o.key === state.platform_key);
      const isManual = !!opt?.manual;
      const rate = isManual
        ? (state.manual_rate ?? 0)
        : ((selectedPlayer as any)[state.platform_key] as number | undefined);
      const tier = selectedPlayer.tier_code ? tierMap.get(selectedPlayer.tier_code) : undefined;
      return {
        uid: initial?.uid ?? newUid(),
        talent_type: 'player',
        talent_id: selectedPlayer.id,
        talent_name: selectedPlayer.nickname,
        platform: state.platform_key,
        platform_label: opt?.label ?? state.platform_key,
        base_rate: rate ?? 0,
        qty: state.qty,
        irl: selectedPlayer.rate_irl || 0,
        floorShare: tier?.floor_share ?? selectedPlayer.floor_share ?? 0.5,
        o_ctype: state.o_ctype, o_eng: state.o_eng, o_aud: state.o_aud,
        o_seas: state.o_seas, o_lang: state.o_lang, o_auth: state.o_auth,
      };
    }
    if (state.talent_type === 'creator' && selectedCreator) {
      const opt = CREATOR_PLATFORMS.find(o => o.key === state.platform_key);
      const rate = (selectedCreator as any)[state.platform_key] as number | undefined;
      const tier = selectedCreator.tier_code ? tierMap.get(selectedCreator.tier_code) : undefined;
      return {
        uid: initial?.uid ?? newUid(),
        talent_type: 'creator',
        talent_id: selectedCreator.id,
        talent_name: selectedCreator.nickname,
        platform: state.platform_key,
        platform_label: opt?.label ?? state.platform_key,
        base_rate: rate ?? 0,
        qty: state.qty,
        irl: 0,
        floorShare: tier?.floor_share ?? 0.5,
        o_ctype: state.o_ctype, o_eng: state.o_eng, o_aud: state.o_aud,
        o_seas: state.o_seas, o_lang: state.o_lang, o_auth: state.o_auth,
      };
    }
    return null;
  }, [state, selectedPlayer, selectedCreator, tierMap, initial?.uid]);

  // ── Live pricing preview (honors overrides, falls back to globals)
  const preview = useMemo(() => {
    if (!draft) return null;
    return computeLine({
      baseFee: draft.base_rate,
      irl: draft.irl,
      eng: draft.o_eng ?? globals.eng,
      aud: draft.o_aud ?? globals.aud,
      seas: draft.o_seas ?? globals.seas,
      ctype: draft.o_ctype ?? globals.ctype,
      lang: draft.o_lang ?? globals.lang,
      auth: draft.o_auth ?? globals.auth,
      obj: globals.obj, conf: globals.conf,
      floorShare: draft.floorShare,
      rightsPct: addonsUpliftPct,
      qty: draft.qty,
    });
  }, [draft, globals, addonsUpliftPct]);

  // Influencer count (shown on Step 1 type card)
  const influencerCount = useMemo(() => players.filter(influencerPredicate).length, [players]);

  // ── Filter counts for step 2
  const tierCounts = useMemo(() => {
    const list: Array<Player | Creator> =
      state.talent_type === 'creator' ? creators :
      state.talent_type === 'influencer' ? players.filter(influencerPredicate) :
      state.talent_type === 'player' ? players.filter(p => !influencerPredicate(p)) :
      players;
    const m = new Map<string, number>();
    list.forEach(t => {
      const code = t.tier_code;
      if (!code) return;
      m.set(code, (m.get(code) ?? 0) + 1);
    });
    return m;
  }, [state.talent_type, players, creators]);

  const gameCounts = useMemo(() => {
    if (state.talent_type !== 'player' || !state.tier_code) return new Map<string, number>();
    const m = new Map<string, number>();
    players
      .filter(p => p.tier_code === state.tier_code && p.game)
      .forEach(p => { m.set(p.game!, (m.get(p.game!) ?? 0) + 1); });
    return m;
  }, [state.talent_type, state.tier_code, players]);

  const teamCounts = useMemo(() => {
    if (state.talent_type !== 'player' || !state.tier_code || !state.game) return new Map<string, number>();
    const m = new Map<string, number>();
    players
      .filter(p => p.tier_code === state.tier_code && p.game === state.game && p.team)
      .forEach(p => { m.set(p.team!, (m.get(p.team!) ?? 0) + 1); });
    return m;
  }, [state.talent_type, state.tier_code, state.game, players]);

  const [search, setSearch] = useState('');
  useEffect(() => { setSearch(''); }, [state.tier_code, state.game, state.team, state.talent_type]);

  const filteredTalents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (state.talent_type === 'creator') {
      let list = creators;
      if (state.tier_code) list = list.filter(c => c.tier_code === state.tier_code);
      if (q) list = list.filter(c => c.nickname.toLowerCase().includes(q));
      return list.map(c => ({
        id: c.id, nickname: c.nickname, tier: c.tier_code || '', game: '', team: '',
      }));
    }
    let list = state.talent_type === 'influencer'
      ? players.filter(influencerPredicate)
      : players.filter(p => !influencerPredicate(p));
    if (state.tier_code) list = list.filter(p => p.tier_code === state.tier_code);
    if (state.talent_type === 'player') {
      if (state.game) list = list.filter(p => p.game === state.game);
      if (state.team) list = list.filter(p => p.team === state.team);
    }
    if (q) list = list.filter(p =>
      p.nickname.toLowerCase().includes(q) ||
      (p.full_name ?? '').toLowerCase().includes(q)
    );
    return list.map(p => ({
      id: p.id, nickname: p.nickname, tier: p.tier_code || '',
      game: p.game || '', team: p.team || '',
    }));
  }, [state, players, creators, search]);

  // ── Step 3 deliverables — grouped, with manual entries always shown
  const deliverables = useMemo(() => {
    if (isPlayerSource(state.talent_type) && selectedPlayer) {
      return PLAYER_PLATFORMS
        .map(p => ({
          key: p.key,
          label: p.label,
          rate: p.manual ? 0 : ((selectedPlayer as any)[p.key] as number) || 0,
          group: p.group,
          manual: p.manual,
        }))
        .filter(d => d.manual || d.rate > 0);
    }
    if (state.talent_type === 'creator' && selectedCreator) {
      return CREATOR_PLATFORMS
        .map(p => ({
          key: p.key,
          label: p.label,
          rate: ((selectedCreator as any)[p.key] as number) || 0,
          group: 'Social Media' as const,
          manual: false,
        }))
        .filter(d => d.rate > 0);
    }
    return [];
  }, [state.talent_type, selectedPlayer, selectedCreator]);

  // ── Breadcrumbs
  const crumbs: Array<{ label: string; step: WizardStep }> = [];
  crumbs.push({
    label: state.talent_type ? (state.talent_type === 'player' ? 'Player' : state.talent_type === 'influencer' ? 'Influencer' : 'Creator') : 'Type',
    step: 1,
  });
  if (state.tier_code) crumbs.push({ label: state.tier_code, step: 2 });
  if (state.game)      crumbs.push({ label: state.game, step: 2 });
  if (state.team)      crumbs.push({ label: state.team, step: 2 });
  if (state.talent_id) {
    const name = selectedPlayer?.nickname ?? selectedCreator?.nickname ?? '';
    if (name) crumbs.push({ label: name, step: 2 });
  }
  if (state.platform_key && draft?.platform_label) {
    crumbs.push({ label: draft.platform_label, step: 3 });
  }

  const canCommit = draft !== null && draft.base_rate > 0;
  const commit = () => { if (draft) onCommit(draft); };
  const commitAnother = () => { if (draft && onCommitAndAnother) onCommitAndAnother(draft); };

  return (
    <div className="rounded-xl border border-line bg-white shadow-lift overflow-hidden mb-6">
      {/* Header with breadcrumbs */}
      <div className="bg-gradient-to-r from-navy via-navyDark to-navy px-5 py-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-[10px] tracking-widest text-green font-semibold whitespace-nowrap">
            {mode === 'add' ? 'ADD DELIVERABLE' : 'EDIT DELIVERABLE'} · STEP {state.step}/5
          </div>
          <div className="flex items-center gap-1 text-sm text-white/90 flex-wrap">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={12} className="text-white/40" />}
                <button
                  onClick={() => jumpTo(c.step)}
                  className="hover:underline underline-offset-2"
                >
                  {c.label}
                </button>
              </span>
            ))}
          </div>
        </div>
        <button onClick={onCancel} className="text-white/70 hover:text-white p-1" aria-label="Close">
          <X size={16} />
        </button>
      </div>

      {/* Step body */}
      <div className="p-4 sm:p-5 md:p-6">
        {state.step === 1 && (
          <StepType
            onPick={(kind) => patch({ talent_type: kind, step: 2 })}
            playerCount={players.length}
            creatorCount={creators.length}
            influencerCount={influencerCount}
          />
        )}
        {state.step === 2 && (
          <StepFilter
            state={state}
            tierCounts={tierCounts}
            gameCounts={gameCounts}
            teamCounts={teamCounts}
            tiersSorted={tiers}
            search={search}
            setSearch={setSearch}
            filteredTalents={filteredTalents}
            onPickTier={(code) => patch({
              tier_code: code, game: null, team: null,
              talent_id: null, platform_key: null,
            })}
            onPickGame={(g) => patch({
              game: g || null, team: null,
              talent_id: null, platform_key: null,
            })}
            onPickTeam={(t) => patch({
              team: t || null, talent_id: null, platform_key: null,
            })}
            onPickTalent={(id) => patch({
              talent_id: id, platform_key: null, step: 3,
            })}
          />
        )}
        {state.step === 3 && (
          <StepDeliverable
            talentName={selectedPlayer?.nickname ?? selectedCreator?.nickname ?? ''}
            tierCode={selectedPlayer?.tier_code ?? selectedCreator?.tier_code}
            game={selectedPlayer?.game}
            team={selectedPlayer?.team}
            talent={selectedPlayer ?? selectedCreator}
            deliverables={deliverables}
            selectedKey={state.platform_key}
            selectedManual={(() => {
              if (!state.platform_key) return false;
              const opt = PLAYER_PLATFORMS.find(o => o.key === state.platform_key);
              return !!opt?.manual;
            })()}
            manualRate={state.manual_rate}
            qty={state.qty}
            currency={currency}
            onPick={(key, manual) => patch({ platform_key: key, manual_rate: manual ? state.manual_rate : null })}
            onQty={(q) => patch({ qty: q })}
            onManualRate={(n) => patch({ manual_rate: n })}
            onBack={() => jumpTo(2)}
            onNext={() => jumpTo(4)}
          />
        )}
        {state.step === 4 && (
          <StepAxes
            globals={globals}
            state={state}
            patch={patch}
            preview={preview}
            draft={draft}
            currency={currency}
            onBack={() => jumpTo(3)}
            onNext={() => jumpTo(5)}
          />
        )}
        {state.step === 5 && (
          <StepReview
            state={state}
            draft={draft}
            preview={preview}
            currency={currency}
            mode={mode}
            canCommit={canCommit}
            onBack={() => jumpTo(4)}
            onCommit={commit}
            onCommitAndAnother={onCommitAndAnother ? commitAnother : undefined}
          />
        )}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Step 1 — Type
// ───────────────────────────────────────────────────────────────────────────
function StepType({ onPick, playerCount, creatorCount, influencerCount }: {
  onPick: (k: 'player' | 'creator' | 'influencer') => void;
  playerCount: number; creatorCount: number; influencerCount: number;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">What are we pricing?</h2>
      <p className="text-sm text-label mb-5">Pick a roster to narrow down from.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TypeCard
          kind="player"
          title="Player"
          count={playerCount - influencerCount}
          subtitle="Team Falcons pro players + coaching staff. Filter by tier, game, team."
          onClick={() => onPick('player')}
        />
        <TypeCard
          kind="influencer"
          title="Esports Influencer"
          count={influencerCount}
          subtitle="Roster-side influencers — gaming-adjacent personalities under the Falcons banner."
          onClick={() => onPick('influencer')}
        />
        <TypeCard
          kind="creator"
          title="Content Creator"
          count={creatorCount}
          subtitle="Partner creators with ceiling-based rates and scripted/organic options."
          onClick={() => onPick('creator')}
        />
      </div>
    </div>
  );
}

function TypeCard({ kind, title, count, subtitle, onClick }: {
  kind: 'player' | 'creator' | 'influencer'; title: string; count: number; subtitle: string; onClick: () => void;
}) {
  const Icon = kind === 'player' ? Users : kind === 'influencer' ? Megaphone : User;
  return (
    <button
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
      className="group text-left rounded-xl border-2 border-line hover:border-green hover:bg-greenSoft transition p-5 md:p-6 focus:outline-none focus:ring-2 focus:ring-green/40"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-navy text-white grid place-items-center">
          <Icon size={20} />
        </div>
        <div>
          <div className="text-lg font-semibold text-ink leading-tight">{title}</div>
          <div className="text-xs text-mute">{count} available</div>
        </div>
      </div>
      <div className="text-sm text-label">{subtitle}</div>
      <div className="mt-4 text-sm text-greenDark font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
        Continue <ArrowRight size={14} />
      </div>
    </button>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Step 2 — Filter
// ───────────────────────────────────────────────────────────────────────────
function StepFilter({
  state, tierCounts, gameCounts, teamCounts, tiersSorted,
  search, setSearch, filteredTalents,
  onPickTier, onPickGame, onPickTeam, onPickTalent,
}: {
  state: WizardState;
  tierCounts: Map<string, number>;
  gameCounts: Map<string, number>;
  teamCounts: Map<string, number>;
  tiersSorted: Tier[];
  search: string;
  setSearch: (s: string) => void;
  filteredTalents: Array<{ id: number; nickname: string; tier: string; game: string; team: string }>;
  onPickTier: (code: string) => void;
  onPickGame: (g: string) => void;
  onPickTeam: (t: string) => void;
  onPickTalent: (id: number) => void;
}) {
  const isPlayer = state.talent_type === 'player';
  const games = Array.from(gameCounts.keys()).sort();
  const teams = Array.from(teamCounts.keys()).sort();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold mb-1">Narrow down the roster</h2>
        <p className="text-sm text-label">
          {isPlayer
            ? 'Filter by tier, then game, then (optionally) team.'
            : 'Filter by tier, then pick a creator.'}
        </p>
      </div>

      {/* Tier */}
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-label mb-2">Tier</div>
        <div className="flex flex-wrap gap-2">
          {tiersSorted.map(t => {
            const count = tierCounts.get(t.code) ?? 0;
            return (
              <FilterChip
                key={t.code}
                active={state.tier_code === t.code}
                disabled={count === 0}
                onClick={() => onPickTier(t.code)}
              >
                {t.code} <span className="opacity-60">({count})</span>
              </FilterChip>
            );
          })}
        </div>
      </div>

      {/* Game */}
      {isPlayer && state.tier_code && games.length > 0 && (
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-label mb-2">Game</div>
          <div className="flex flex-wrap gap-2">
            <FilterChip active={!state.game} onClick={() => onPickGame('')}>
              All games <span className="opacity-60">({Array.from(gameCounts.values()).reduce((a, b) => a + b, 0)})</span>
            </FilterChip>
            {games.map(g => (
              <FilterChip
                key={g}
                active={state.game === g}
                onClick={() => onPickGame(g)}
              >
                {g} <span className="opacity-60">({gameCounts.get(g) ?? 0})</span>
              </FilterChip>
            ))}
          </div>
        </div>
      )}

      {/* Team */}
      {isPlayer && state.tier_code && state.game && teams.length > 0 && (
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-label mb-2">
            Team <span className="opacity-60 normal-case">(optional)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterChip active={!state.team} onClick={() => onPickTeam('')}>
              Any team <span className="opacity-60">({Array.from(teamCounts.values()).reduce((a, b) => a + b, 0)})</span>
            </FilterChip>
            {teams.map(t => (
              <FilterChip
                key={t}
                active={state.team === t}
                onClick={() => onPickTeam(t)}
              >
                {t} <span className="opacity-60">({teamCounts.get(t) ?? 0})</span>
              </FilterChip>
            ))}
          </div>
        </div>
      )}

      {/* Search + list */}
      <div>
        <SearchInput
          autoFocus
          value={search}
          onChange={setSearch}
          placeholder={`Search ${filteredTalents.length} ${isPlayer ? 'player' : 'creator'}${filteredTalents.length === 1 ? '' : 's'}…`}
          size="sm"
        />
        <div className="mt-3 max-h-80 overflow-y-auto border border-line rounded-lg divide-y divide-line">
          {filteredTalents.length === 0 && (
            <div className="px-4 py-6 text-xs text-mute text-center">
              No matches — try a broader filter.
            </div>
          )}
          {filteredTalents.slice(0, 300).map(t => (
            <button
              key={t.id}
              onClick={() => onPickTalent(t.id)}
              onKeyDown={(e) => { if (e.key === 'Enter') onPickTalent(t.id); }}
              className="w-full text-left px-4 py-2.5 hover:bg-greenSoft text-sm focus:bg-greenSoft focus:outline-none"
            >
              <div className="font-medium text-ink truncate">{t.nickname}</div>
              {(t.tier || t.game || t.team) && (
                <div className="text-[11px] text-mute flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {t.tier && (
                    <span className={`chip border ${tierClass(t.tier)} !px-1.5 !py-0 text-[10px]`}>
                      {t.tier}
                    </span>
                  )}
                  {t.game && <span className="truncate">{t.game}</span>}
                  {t.team && <span className="opacity-75">· {t.team}</span>}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function FilterChip({ active, disabled, onClick, children }: {
  active: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'px-3 py-1.5 rounded-full text-sm border transition focus:outline-none focus:ring-2 focus:ring-green/40',
        active
          ? 'bg-green text-white border-green'
          : disabled
            ? 'bg-bg text-mute border-line cursor-not-allowed opacity-60'
            : 'bg-white text-ink border-line hover:border-green hover:bg-greenSoft',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Step 3 — Deliverable (grouped + manual-rate aware + clickable socials)
// ───────────────────────────────────────────────────────────────────────────
const GROUP_ORDER: PlatformGroup[] = ['Social Media', 'Live & Stream', 'On-Ground & Events', 'Other'];

function StepDeliverable({
  talentName, tierCode, game, team, talent, deliverables, selectedKey, selectedManual,
  manualRate, qty, currency, onPick, onQty, onManualRate, onBack, onNext,
}: {
  talentName: string; tierCode?: string; game?: string; team?: string;
  talent?: Player | Creator | null;
  deliverables: Array<{ key: string; label: string; rate: number; group: string; manual: boolean }>;
  selectedKey: string | null;
  selectedManual: boolean;
  manualRate: number | null;
  qty: number; currency: string;
  onPick: (key: string, manual: boolean) => void;
  onQty: (q: number) => void;
  onManualRate: (n: number | null) => void;
  onBack: () => void; onNext: () => void;
}) {
  const groups: Record<string, typeof deliverables> = {};
  for (const d of deliverables) {
    const g = d.group || 'Other';
    (groups[g] ||= []).push(d);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-line bg-bg px-4 py-3">
        <div className="font-semibold text-ink">{talentName || 'No talent selected'}</div>
        <div className="text-xs text-mute mt-0.5">
          {tierCode && <span>{tierCode}</span>}
          {game && <span> · {game}</span>}
          {team && <span> · {team}</span>}
        </div>
        <SocialChips talent={talent} />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-1">Pick a deliverable</h2>
        <p className="text-sm text-label">Grouped by category. Manual entries below let you enter a one-off rate.</p>
      </div>

      {GROUP_ORDER.filter(g => groups[g]?.length).map(g => (
        <div key={g}>
          <div className="text-[11px] uppercase tracking-wider text-label font-semibold mb-2">{g}</div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {groups[g].map(d => {
              const active = selectedKey === d.key;
              return (
                <button
                  key={d.key}
                  onClick={() => onPick(d.key, d.manual)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { onPick(d.key, d.manual); if (!d.manual) onNext(); } }}
                  className={[
                    'text-left rounded-lg border-2 p-3 transition focus:outline-none focus:ring-2 focus:ring-green/40',
                    active ? 'border-green bg-greenSoft' : 'border-line bg-white hover:border-green/60',
                    d.manual ? 'border-dashed' : '',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm font-medium text-ink">{d.label}</div>
                    {active && <Check size={14} className="text-green" />}
                  </div>
                  <div className="text-[10px] text-mute uppercase tracking-wide">{d.manual ? 'Enter rate' : 'Base'}</div>
                  <div className="text-sm font-semibold text-ink">
                    {d.manual ? <span className="text-mute italic text-xs">manual</span> : fmtMoney(d.rate, currency)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {deliverables.length === 0 && (
        <div className="rounded-lg border border-line bg-bg p-4 text-sm text-mute">
          This talent has no deliverable rates set. Go back and pick another.
        </div>
      )}

      {selectedKey && selectedManual && (
        <div className="rounded-lg border border-green/40 bg-greenSoft/40 p-3">
          <label className="label">Manual base rate ({currency})</label>
          <input
            type="number" min={0} value={manualRate ?? ''} placeholder="e.g. 5000"
            onChange={e => onManualRate(e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value) || 0))}
            className="input"
          />
          <p className="text-xs text-mute mt-1.5">No fixed rate is stored for this deliverable. Negotiate per campaign and enter the SAR amount here.</p>
        </div>
      )}

      {selectedKey && (
        <div className="flex items-center gap-3">
          <label className="label !mb-0">Quantity</label>
          <input
            type="number" min={1} value={qty}
            onChange={e => onQty(Math.max(1, parseInt(e.target.value) || 1))}
            className="input py-1.5 px-3 w-24"
          />
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack} className="btn btn-ghost text-sm">
          <ArrowLeft size={14} /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!selectedKey}
          className="btn btn-primary text-sm disabled:opacity-50"
        >
          Next <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Step 4 — Axes
// ───────────────────────────────────────────────────────────────────────────
function StepAxes({
  globals, state, patch, preview, draft, currency, onBack, onNext,
}: {
  globals: Globals;
  state: WizardState;
  patch: (p: Partial<WizardState>) => void;
  preview: ReturnType<typeof computeLine> | null;
  draft: LineDraft | null;
  currency: string;
  onBack: () => void; onNext: () => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr,280px] gap-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-1">Fine-tune axes</h2>
          <p className="text-sm text-label">
            Click a chip to override the campaign default for this line. Leave on Campaign default to inherit.
          </p>
        </div>

        <AxisRow
          label="Engagement"
          sourceHint="Matrix — Engagement band"
          options={MATRIX.engagement}
          globalVal={globals.eng}
          value={state.o_eng}
          onChange={v => patch({ o_eng: v })}
        />
        <AxisRow
          label="Audience Quality"
          sourceHint="Matrix — Audience Quality"
          options={MATRIX.audience}
          globalVal={globals.aud}
          value={state.o_aud}
          onChange={v => patch({ o_aud: v })}
        />
        <AxisRow
          label="Seasonality"
          sourceHint="Matrix — Seasonality window"
          options={MATRIX.seasonality}
          globalVal={globals.seas}
          value={state.o_seas}
          onChange={v => patch({ o_seas: v })}
        />
        <AxisRow
          label="Content Type"
          sourceHint="Matrix — Content type"
          options={MATRIX.contentType}
          globalVal={globals.ctype}
          value={state.o_ctype}
          onChange={v => patch({ o_ctype: v })}
        />
        <AxisRow
          label="Language"
          sourceHint="Matrix — Language"
          options={MATRIX.language}
          globalVal={globals.lang}
          value={state.o_lang}
          onChange={v => patch({ o_lang: v })}
        />
        <AxisRow
          label="Authority"
          sourceHint="Matrix — Authority tier"
          options={MATRIX.authority}
          globalVal={globals.auth}
          value={state.o_auth}
          onChange={v => patch({ o_auth: v })}
        />

        <div className="flex items-center justify-between pt-2">
          <button onClick={onBack} className="btn btn-ghost text-sm">
            <ArrowLeft size={14} /> Back
          </button>
          <button onClick={onNext} className="btn btn-primary text-sm">
            Next <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Sticky live price sidebar */}
      <div>
        <div className="lg:sticky lg:top-4 rounded-xl border border-line bg-bg p-4">
          <div className="text-[10px] tracking-widest text-label uppercase font-semibold mb-3">
            Live price
          </div>
          {draft && preview ? (
            <div className="space-y-1.5 text-sm">
              <Row label="Base" value={fmtMoney(draft.base_rate, currency)} muted />
              <Row label="Social price" value={fmtMoney(preview.socialPrice, currency)} muted />
              <Row label="Unit" value={fmtMoney(preview.finalUnit, currency)} />
              <div className="mt-2 rounded-lg bg-green text-white px-3 py-2">
                <div className="text-[10px] tracking-widest opacity-80">LINE TOTAL · {draft.qty}×</div>
                <div className="text-xl font-bold">{fmtMoney(preview.finalAmount, currency)}</div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-mute">Pick a deliverable first.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function AxisRow({ label, sourceHint, options, globalVal, value, onChange }: {
  label: string; sourceHint: string;
  options: readonly { readonly label: string; readonly factor: number }[];
  globalVal: number;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const isInherited = value === null;
  return (
    <div className="border-t border-line pt-4 first:border-t-0 first:pt-0">
      <div className="flex items-baseline justify-between gap-3 mb-2 flex-wrap">
        <div className="font-medium text-sm text-ink">{label}</div>
        <div className="text-[10px] text-mute uppercase tracking-wide">{sourceHint}</div>
      </div>
      <div className="flex flex-wrap gap-2">
        <FilterChip active={isInherited} onClick={() => onChange(null)}>
          <span className="opacity-80">Campaign default</span>{' '}
          <span className="opacity-60">({globalVal.toFixed(2)}x)</span>
        </FilterChip>
        {options.map(o => {
          const active = !isInherited && Math.abs((value ?? -999) - o.factor) < 0.0001;
          return (
            <FilterChip key={o.label} active={active} onClick={() => onChange(o.factor)}>
              {o.label} <span className="opacity-60">({o.factor.toFixed(2)}x)</span>
            </FilterChip>
          );
        })}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Step 5 — Review
// ───────────────────────────────────────────────────────────────────────────
function StepReview({
  state, draft, preview, currency, mode, canCommit,
  onBack, onCommit, onCommitAndAnother,
}: {
  state: WizardState;
  draft: LineDraft | null;
  preview: ReturnType<typeof computeLine> | null;
  currency: string;
  mode: 'add' | 'edit';
  canCommit: boolean;
  onBack: () => void;
  onCommit: () => void;
  onCommitAndAnother?: () => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-6">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Review</h2>
        {draft ? (
          <div className="rounded-lg border border-line divide-y divide-line overflow-hidden">
            <SumRow label="Talent"       value={draft.talent_name} />
            <SumRow label="Type"         value={draft.talent_type === 'player' ? (state.talent_type === 'influencer' ? 'Esports Influencer' : 'Player') : 'Creator'} />
            <SumRow label="Deliverable"  value={draft.platform_label} />
            <SumRow label="Quantity"     value={String(draft.qty)} />
            <SumRow label="Base rate"    value={fmtMoney(draft.base_rate, currency)} />
            <SumRow label="Engagement"   value={overrideLabel(state.o_eng)} />
            <SumRow label="Audience"     value={overrideLabel(state.o_aud)} />
            <SumRow label="Seasonality"  value={overrideLabel(state.o_seas)} />
            <SumRow label="Content type" value={overrideLabel(state.o_ctype)} />
            <SumRow label="Language"     value={overrideLabel(state.o_lang)} />
            <SumRow label="Authority"    value={overrideLabel(state.o_auth)} />
          </div>
        ) : (
          <div className="rounded-lg border border-line bg-bg p-4 text-sm text-mute">
            Nothing to review yet — step through the wizard to build a line.
          </div>
        )}
      </div>

      <div>
        <div className="lg:sticky lg:top-4 space-y-4">
          {draft && preview ? (
            <div className="rounded-xl overflow-hidden border border-green/30 shadow-card">
              <div className="bg-gradient-to-br from-green to-greenDark text-white p-5">
                <div className="text-[10px] tracking-widest opacity-80 mb-1">FINAL PRICE</div>
                <div className="text-3xl font-bold leading-tight">
                  {fmtMoney(preview.finalAmount, currency)}
                </div>
                <div className="text-xs opacity-90 mt-1">
                  {fmtMoney(preview.finalUnit, currency)} × {draft.qty}
                </div>
              </div>
              <div className="p-4 text-xs text-label space-y-1.5 bg-white">
                <Row label="Base rate"        value={fmtMoney(draft.base_rate, currency)} muted />
                <Row label="Social price"     value={fmtMoney(preview.socialPrice, currency)} muted />
                <Row label="Authority floor"  value={fmtMoney(preview.floorPrice, currency)} muted />
                <Row label="Confidence cap"   value={`× ${preview.confCap.toFixed(2)}`} muted />
                <Row label="Unit price"       value={fmtMoney(preview.finalUnit, currency)} />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-line bg-bg p-5 text-sm text-mute">
              Complete earlier steps to see the final price.
            </div>
          )}

          <div className="flex flex-col gap-2">
            <button onClick={onBack} className="btn btn-ghost justify-center">
              <ArrowLeft size={14} /> Back
            </button>
            {mode === 'add' && onCommitAndAnother && (
              <button
                onClick={onCommitAndAnother}
                disabled={!canCommit}
                className="btn btn-ghost justify-center disabled:opacity-50"
              >
                <Plus size={14} /> Add & another
              </button>
            )}
            <button
              onClick={onCommit}
              disabled={!canCommit}
              className="btn btn-primary justify-center disabled:opacity-50"
            >
              <Check size={14} /> {mode === 'add' ? 'Add to quote' : 'Save line'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function overrideLabel(v: number | null) {
  if (v === null) return 'Campaign default';
  return `${v.toFixed(2)}×`;
}

// ───────────────────────────────────────────────────────────────────────────
// Shared row components
// ───────────────────────────────────────────────────────────────────────────
function SumRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 text-sm">
      <span className="text-label">{label}</span>
      <span className="text-ink font-medium">{value}</span>
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

// Clickable social-handle chips for the talent summary card on Step 3.
// Falls through any field that is empty / not a real URL.
function SocialChips({ talent }: { talent?: Player | Creator | null }) {
  if (!talent) return null;
  const t = talent as any;
  const items: Array<{ key: string; href: string; label: string; icon: any }> = [];
  function pushIfUrl(key: string, label: string, icon: any) {
    const v = t[key];
    if (!v || typeof v !== 'string') return;
    const s = v.trim();
    if (!s || s === '-' || s === '—') return;
    const href = /^https?:\/\//i.test(s) ? s : `https://${s.replace(/^@/, '')}`;
    items.push({ key, href, label, icon });
  }
  pushIfUrl('x_handle',  'X / Twitter', Twitter);
  pushIfUrl('instagram', 'Instagram',   Instagram);
  pushIfUrl('twitch',    'Twitch',      Twitch);
  pushIfUrl('youtube',   'YouTube',     Youtube);
  pushIfUrl('facebook',  'Facebook',    Facebook);
  pushIfUrl('tiktok',    'TikTok',      ExternalLink);
  pushIfUrl('kick',      'Kick',        ExternalLink);
  if (items.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {items.map(it => {
        const Icon = it.icon;
        return (
          <a
            key={it.key}
            href={it.href}
            target="_blank"
            rel="noopener noreferrer"
            title={it.label}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-line text-[11px] text-label hover:text-ink hover:border-green hover:bg-greenSoft transition"
          >
            <Icon size={12} />
            <span>{it.label}</span>
            <ExternalLink size={10} className="opacity-50" />
          </a>
        );
      })}
    </div>
  );
}

