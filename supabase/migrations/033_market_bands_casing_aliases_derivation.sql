-- ============================================================================
-- Migration 033 — Market bands: casing + KSA + platform backfill + derivation
--
-- Three problems fixed in one go (all idempotent — safe to re-run):
--
--   1. Casing mismatch made 'Global' bands unreachable. Player constraint
--      uses 'GLOBAL'; bands had 'Global'. Normalised to 'GLOBAL'.
--
--   2. 'KSA' was used in bands (5 manual_override rows tuned to Msdossary7)
--      but wasn't a valid value in the player/creator audience_market
--      constraint. So no talent could match a KSA band. Adds KSA to the
--      enum so KSA bands become a real premium overlay over MENA bands.
--      (Decision: KSA is a PREMIUM overlay — talents stay tagged MENA by
--      default; only specifically Saudi-anchored ones get audience_market='KSA'.)
--
--   3. Only 6 platforms had bands. Backfilled player-side rate column names
--      (rate_ig_static aliased from rate_ig_post — same concept, different
--      column name in the players table) and derived repost/share variants
--      using the documented Migration 015 ratios. ~79 new rows.
--
--   4. New 'derivation' jsonb column on every band — kills "based on what?"
--      forever. Every row carries its method + sources + version.
-- ============================================================================

-- ── 1. CASING + KSA SUPPORT ───────────────────────────────────────────────
alter table public.players  drop constraint if exists chk_player_audience_market;
alter table public.players  add  constraint chk_player_audience_market check (
  audience_market is null or audience_market in ('KSA','MENA','NA','EU','APAC','LATAM','GLOBAL')
);
alter table public.creators drop constraint if exists chk_creator_audience_market;
alter table public.creators add  constraint chk_creator_audience_market check (
  audience_market is null or audience_market in ('KSA','MENA','NA','EU','APAC','LATAM','GLOBAL')
);

update public.market_bands set audience_market = 'GLOBAL' where audience_market = 'Global';

-- ── 2. DERIVATION COLUMN — kill "based on what?" ─────────────────────────
alter table public.market_bands add column if not exists derivation jsonb default '{}'::jsonb;

update public.market_bands
   set derivation = jsonb_build_object(
     'method', 'sot_v1_baseline',
     'note',   'Auto-derived from SOT v1 tier baseline × market × platform multipliers.',
     'version','sot_v1.0'
   )
 where source = 'methodology_v2_baseline'
   and (derivation is null or derivation = '{}'::jsonb);

update public.market_bands
   set derivation = jsonb_build_object(
     'method', 'manual_peer_card',
     'note',   coalesce(source_notes, 'Manually calibrated against peer rate cards / observed deals.'),
     'version','manual'
   )
 where source = 'manual_override'
   and (derivation is null or derivation = '{}'::jsonb);

-- ── 3. PLATFORM ALIAS — rate_ig_post (creator) ⇄ rate_ig_static (player) ─
-- Same concept; different column name in players vs creators tables.
-- Duplicate every rate_ig_post row as rate_ig_static so the F/A/S/C panel
-- finds a band when looking up player rates.
insert into public.market_bands
  (tier_code, game, audience_market, platform, min_sar, median_sar, max_sar, source, source_notes, derivation)
select
  tier_code, game, audience_market, 'rate_ig_static', min_sar, median_sar, max_sar,
  'derived_alias',
  'Aliased from rate_ig_post — same concept, player-side rate column name.',
  jsonb_build_object(
    'method','platform_alias',
    'aliased_from','rate_ig_post',
    'note','Players store IG single posts under rate_ig_static; creators store the same concept under rate_ig_post. Numbers are identical.',
    'version','v033'
  )
from public.market_bands m1
where m1.platform = 'rate_ig_post'
  and not exists (
    select 1 from public.market_bands m2
    where m2.tier_code       = m1.tier_code
      and m2.audience_market = m1.audience_market
      and m2.platform        = 'rate_ig_static'
      and coalesce(m2.game,'_') = coalesce(m1.game,'_')
  );

-- ── 4. RATIO-DERIVED ROWS (Migration 015 documented ratios) ──────────────
-- rate_ig_repost     = 0.35 × rate_ig_static
-- rate_tiktok_repost = 0.30 × rate_tiktok_video
-- rate_tiktok_share  = 0.45 × rate_tiktok_video
-- rate_yt_short_repost = 0.30 × rate_yt_short
-- (rate_x_repost / rate_x_share / rate_ig_share need parent platforms that
--  aren't seeded yet — skipped here, admin to add manually via editor.)

-- 4a. rate_ig_repost
insert into public.market_bands
  (tier_code, game, audience_market, platform, min_sar, median_sar, max_sar, source, source_notes, derivation)
select
  tier_code, game, audience_market, 'rate_ig_repost',
  round(min_sar    * 0.35),
  round(median_sar * 0.35),
  round(max_sar    * 0.35),
  'derived_from_v015_ratio',
  'Derived: rate_ig_repost = 0.35 × rate_ig_static (Migration 015 ratio).',
  jsonb_build_object(
    'method','ratio_from_parent','parent_platform','rate_ig_static','ratio',0.35,
    'origin','migration_015','version','v033'
  )
from public.market_bands m1
where m1.platform = 'rate_ig_static'
  and not exists (
    select 1 from public.market_bands m2
    where m2.tier_code       = m1.tier_code
      and m2.audience_market = m1.audience_market
      and m2.platform        = 'rate_ig_repost'
      and coalesce(m2.game,'_') = coalesce(m1.game,'_')
  );

-- 4b. rate_tiktok_repost
insert into public.market_bands
  (tier_code, game, audience_market, platform, min_sar, median_sar, max_sar, source, source_notes, derivation)
select
  tier_code, game, audience_market, 'rate_tiktok_repost',
  round(min_sar    * 0.30),
  round(median_sar * 0.30),
  round(max_sar    * 0.30),
  'derived_from_v015_ratio',
  'Derived: rate_tiktok_repost = 0.30 × rate_tiktok_video (Migration 015 ratio).',
  jsonb_build_object(
    'method','ratio_from_parent','parent_platform','rate_tiktok_video','ratio',0.30,
    'origin','migration_015','version','v033'
  )
from public.market_bands m1
where m1.platform = 'rate_tiktok_video'
  and not exists (
    select 1 from public.market_bands m2
    where m2.tier_code       = m1.tier_code
      and m2.audience_market = m1.audience_market
      and m2.platform        = 'rate_tiktok_repost'
      and coalesce(m2.game,'_') = coalesce(m1.game,'_')
  );

-- 4c. rate_tiktok_share
insert into public.market_bands
  (tier_code, game, audience_market, platform, min_sar, median_sar, max_sar, source, source_notes, derivation)
select
  tier_code, game, audience_market, 'rate_tiktok_share',
  round(min_sar    * 0.45),
  round(median_sar * 0.45),
  round(max_sar    * 0.45),
  'derived_from_v015_ratio',
  'Derived: rate_tiktok_share = 0.45 × rate_tiktok_video (Migration 015 ratio).',
  jsonb_build_object(
    'method','ratio_from_parent','parent_platform','rate_tiktok_video','ratio',0.45,
    'origin','migration_015','version','v033'
  )
from public.market_bands m1
where m1.platform = 'rate_tiktok_video'
  and not exists (
    select 1 from public.market_bands m2
    where m2.tier_code       = m1.tier_code
      and m2.audience_market = m1.audience_market
      and m2.platform        = 'rate_tiktok_share'
      and coalesce(m2.game,'_') = coalesce(m1.game,'_')
  );

-- 4d. rate_yt_short_repost
insert into public.market_bands
  (tier_code, game, audience_market, platform, min_sar, median_sar, max_sar, source, source_notes, derivation)
select
  tier_code, game, audience_market, 'rate_yt_short_repost',
  round(min_sar    * 0.30),
  round(median_sar * 0.30),
  round(max_sar    * 0.30),
  'derived_from_v015_ratio',
  'Derived: rate_yt_short_repost = 0.30 × rate_yt_short (Migration 015 ratio).',
  jsonb_build_object(
    'method','ratio_from_parent','parent_platform','rate_yt_short','ratio',0.30,
    'origin','migration_015','version','v033'
  )
from public.market_bands m1
where m1.platform = 'rate_yt_short'
  and not exists (
    select 1 from public.market_bands m2
    where m2.tier_code       = m1.tier_code
      and m2.audience_market = m1.audience_market
      and m2.platform        = 'rate_yt_short_repost'
      and coalesce(m2.game,'_') = coalesce(m1.game,'_')
  );
