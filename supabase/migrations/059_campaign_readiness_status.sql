-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 059 — Bookable status + Profile-strength score (agency model)
-- ───────────────────────────────────────────────────────────────────────────
-- Replaces the original tri-state campaign_readiness draft with the model
-- real talent agencies use:
--
--   1) is_bookable (BOOLEAN) — can the rep quote this talent today?
--      The presumption is YES for almost everyone. Flipped to FALSE only
--      when there's a real blocker:
--         · rate_source IS NULL or 'unverified' (research pending)
--         · tier_code IS NULL or anchor missing/zero
--         · audience_market IS NULL
--      "No socials on file" alone is NOT a blocker — managers, coaches,
--      and IRL-quoted pros are bookable via Authority Floor.
--
--   2) profile_strength_pct (INT 0–100) — how much premium positioning
--      the rep can defend with data. Each filled signal earns points:
--         15  any social handle present
--         15  has_social_data = true
--         10  audience_data_verified = true
--         10  has_audience_demo = true
--         10  has_tournament_data = true
--         10  rate_source IN ('reach_calibrated','methodology_v2_with_data')
--         10  agency_status declared (not 'unknown')
--         10  intake_status = 'submitted'
--          5  pricing_rationale text on file
--          5  liquipedia_url present (relevant for pros)
--      Total = 100. The score gates pricing CONFIDENCE, never bookability.
--
-- Both columns are GENERATED ALWAYS AS … STORED — recompute automatically
-- on UPDATE of any input column. No triggers, no app-side writes.
--
-- Drop-and-rebuild = single ALTER TABLE … DROP/RECREATE if criteria evolve.
-- ═══════════════════════════════════════════════════════════════════════════

-- Tear down any earlier draft of campaign_readiness on these tables, if a
-- prior session got there first. Safe no-op if absent.
alter table public.players  drop column if exists campaign_readiness;
alter table public.creators drop column if exists campaign_readiness;

-- PLAYERS ────────────────────────────────────────────────────────────────────
alter table public.players
  add column if not exists is_bookable boolean generated always as (
    case
      when rate_source is null                       then false
      when rate_source = 'unverified'                then false
      when tier_code is null                         then false
      when base_rate_anchor is null                  then false
      when base_rate_anchor <= 0                     then false
      when audience_market is null                   then false
      else true
    end
  ) stored;

alter table public.players
  add column if not exists profile_strength_pct integer generated always as (
    (case when (instagram is not null or tiktok is not null or youtube is not null
              or x_handle is not null or twitch is not null or kick is not null
              or snapchat is not null or facebook is not null) then 15 else 0 end)
  + (case when has_social_data       = true                                  then 15 else 0 end)
  + (case when audience_data_verified = true                                 then 10 else 0 end)
  + (case when has_audience_demo     = true                                  then 10 else 0 end)
  + (case when has_tournament_data   = true                                  then 10 else 0 end)
  + (case when rate_source in ('reach_calibrated','methodology_v2_with_data') then 10 else 0 end)
  + (case when agency_status in ('direct','agency')                          then 10 else 0 end)
  + (case when intake_status = 'submitted'                                   then 10 else 0 end)
  + (case when coalesce(pricing_rationale, '') <> ''                         then  5 else 0 end)
  + (case when liquipedia_url is not null                                    then  5 else 0 end)
  ) stored;

create index if not exists idx_players_is_bookable
  on public.players(is_bookable) where is_active = true;
create index if not exists idx_players_profile_strength
  on public.players(profile_strength_pct) where is_active = true;

comment on column public.players.is_bookable is
  'Can sales quote this talent today? Computed. False only for hard blockers (no rate_source / unverified / no tier / no anchor / no market). "No socials" alone does NOT block — managers and IRL-quoted pros are bookable.';
comment on column public.players.profile_strength_pct is
  'Profile completeness score 0–100. Drives pricing confidence (floor vs median vs premium pitch), never gates bookability. 10 weighted signals, see Migration 059 SQL.';

-- CREATORS ───────────────────────────────────────────────────────────────────
-- Creators have a simpler model (no audience_market / anchor / intake / agency
-- columns yet). Bookability + strength criteria adapt to what's available.
alter table public.creators
  add column if not exists is_bookable boolean generated always as (
    case
      when rate_source is null                       then false
      when coalesce(rate_ig_reels, 0) <= 0           then false
      when tier_code is null                         then false
      else true
    end
  ) stored;

alter table public.creators
  add column if not exists profile_strength_pct integer generated always as (
    (case when coalesce(rate_ig_reels, 0)    > 0 then 25 else 0 end)
  + (case when coalesce(rate_tiktok_ours, 0) > 0 then 20 else 0 end)
  + (case when coalesce(rate_yt_full, 0)     > 0 then 20 else 0 end)
  + (case when rate_source = 'methodology_v2_with_data' then 20 else 0 end)
  + (case when tier_code is not null             then 10 else 0 end)
  + (case when data_completeness = 'full'        then  5 else 0 end)
  ) stored;

create index if not exists idx_creators_is_bookable
  on public.creators(is_bookable) where is_active = true;
create index if not exists idx_creators_profile_strength
  on public.creators(profile_strength_pct) where is_active = true;

comment on column public.creators.is_bookable is
  'Can sales quote this creator today? Computed.';
comment on column public.creators.profile_strength_pct is
  'Creator profile completeness 0–100. Adapted weights for creator pricing model.';
