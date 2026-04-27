-- ═══════════════════════════════════════════════════════════════════════
-- Migration 019 — Full-roster methodology repricing
-- ═══════════════════════════════════════════════════════════════════════
-- Apply methodology-derived rates to every active talent.
-- Tier baseline × platform ratio, snapped to nearest 250 SAR.
-- Multipliers (engagement, audience, seasonality) are applied at QUOTE TIME
-- by the pricing engine, not baked into the base rate.
--
-- For 22 talents we have follower data on, use data-driven tier (some tiers
-- shifted up — e.g., 9leeh Tier 3 → Tier 1, oPiiLz Tier 1 → Tier S).
-- For everyone else, use system tier_code as-is.
--
-- After this migration, every rate_xxx column on every active talent reflects
-- methodology rates. Sales can override per-quote via the multipliers; the
-- Authority Floor protects staff/coaches at appearance-fee value.
--
-- Generated: 2026-04-27
-- ═══════════════════════════════════════════════════════════════════════

-- Step 1: Add governance columns
alter table public.players
  add column if not exists rate_source     text,
  add column if not exists audience_market text;

alter table public.creators
  add column if not exists rate_source     text,
  add column if not exists audience_market text;

alter table public.players  drop constraint if exists chk_player_rate_source;
alter table public.players  add constraint chk_player_rate_source check (
  rate_source is null or rate_source in (
    'methodology_v2', 'methodology_v2_with_data', 'shikenso_v1',
    'negotiated_card', 'manual_override',
    'tier_baseline', 'tier_baseline_legacy', 'unverified'
  )
);
alter table public.creators drop constraint if exists chk_creator_rate_source;
alter table public.creators add constraint chk_creator_rate_source check (
  rate_source is null or rate_source in (
    'methodology_v2', 'methodology_v2_with_data', 'shikenso_v1',
    'negotiated_card', 'manual_override',
    'tier_baseline', 'tier_baseline_legacy', 'unverified'
  )
);

alter table public.players  drop constraint if exists chk_player_audience_market;
alter table public.players  add constraint chk_player_audience_market check (
  audience_market is null or audience_market in ('MENA','NA','EU','APAC','LATAM','GLOBAL')
);
alter table public.creators drop constraint if exists chk_creator_audience_market;
alter table public.creators add constraint chk_creator_audience_market check (
  audience_market is null or audience_market in ('MENA','NA','EU','APAC','LATAM','GLOBAL')
);

create index if not exists idx_players_rate_source  on public.players  (rate_source);
create index if not exists idx_creators_rate_source on public.creators (rate_source);

-- Step 2: Repricing UPDATEs (one per talent, all columns at methodology rates)

-- Abo Najd (Influencer) — Tier 3 (methodology_v2_with_data)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'methodology_v2_with_data', audience_market = 'MENA', tier_code = 'Tier 3' where id = 2;

-- Bijw (Influencer) — Tier 2 (methodology_v2_with_data)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'methodology_v2_with_data', audience_market = 'MENA', tier_code = 'Tier 2' where id = 1;

-- Exnid (Player) — Tier 2 (methodology_v2_with_data)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'methodology_v2_with_data', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 10;

-- Shadow X (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 61;

-- Dongy (Player) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 3' where id = 20;

-- CAROT (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'APAC', tier_code = 'Tier 2' where id = 176;

-- ChiYo (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 114;

-- Gild (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 187;

-- Farzeen (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 151;

-- Xiaohai (Player) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 3' where id = 147;

-- Luckyboi (Head Coach) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'APAC', tier_code = 'Tier 2' where id = 110;

-- vacwep (Influencer) — Tier 2 (methodology_v2_with_data)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'methodology_v2_with_data', audience_market = 'MENA', tier_code = 'Tier 2' where id = 8;

-- Spy (Player) — Tier 3 (methodology_v2_with_data)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'methodology_v2_with_data', audience_market = 'GLOBAL', tier_code = 'Tier 3' where id = 69;

-- madv (Player) — Tier 2 (methodology_v2_with_data)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'methodology_v2_with_data', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 158;

-- Rw9 (Player) — Tier 2 (methodology_v2_with_data)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'methodology_v2_with_data', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 140;

-- xizx7 (Player) — Tier 1 (tier_baseline)
update public.players set rate_x_post = 3500, rate_x_repost = 1750, rate_x_share = 1750, rate_ig_static = 11750, rate_ig_story = 10000, rate_ig_reel = 18000, rate_ig_repost = 4250, rate_ig_share = 2500, rate_tiktok_video = 14000, rate_tiktok_repost = 4250, rate_tiktok_share = 6250, rate_yt_short = 5750, rate_fb_post = 2750, rate_twitch_stream = 26000, rate_twitch_integ = 11750, rate_kick_stream = 26000, rate_kick_integ = 11750, rate_irl = 39500, rate_usage_monthly = 27000, rate_promo_monthly = 19750, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 1' where id = 17;

-- Boyet (Player) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'APAC', tier_code = 'Tier 3' where id = 85;

-- Ghirlanda (Manager) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 3' where id = 154;

-- KingAbody (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 13;

-- m0NESY (Player) — Tier S (tier_baseline)
update public.players set rate_x_post = 5500, rate_x_repost = 2750, rate_x_share = 2750, rate_ig_static = 18250, rate_ig_story = 15500, rate_ig_reel = 28000, rate_ig_repost = 6500, rate_ig_share = 4000, rate_tiktok_video = 21750, rate_tiktok_repost = 6500, rate_tiktok_share = 9750, rate_yt_short = 9000, rate_fb_post = 4250, rate_twitch_stream = 40500, rate_twitch_integ = 18250, rate_kick_stream = 40500, rate_kick_integ = 18250, rate_irl = 61500, rate_usage_monthly = 42000, rate_promo_monthly = 30750, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier S' where id = 27;

-- ImperialHal (Player) — Tier S (tier_baseline)
update public.players set rate_x_post = 5500, rate_x_repost = 2750, rate_x_share = 2750, rate_ig_static = 18250, rate_ig_story = 15500, rate_ig_reel = 28000, rate_ig_repost = 6500, rate_ig_share = 4000, rate_tiktok_video = 21750, rate_tiktok_repost = 6500, rate_tiktok_share = 9750, rate_yt_short = 9000, rate_fb_post = 4250, rate_twitch_stream = 40500, rate_twitch_integ = 18250, rate_kick_stream = 40500, rate_kick_integ = 18250, rate_irl = 61500, rate_usage_monthly = 42000, rate_promo_monthly = 30750, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier S' where id = 183;

-- Ren (Manager) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'APAC', tier_code = 'Tier 3' where id = 112;

-- Privacy (Analyst) — Tier 1 (tier_baseline)
update public.players set rate_x_post = 3500, rate_x_repost = 1750, rate_x_share = 1750, rate_ig_static = 11750, rate_ig_story = 10000, rate_ig_reel = 18000, rate_ig_repost = 4250, rate_ig_share = 2500, rate_tiktok_video = 14000, rate_tiktok_repost = 4250, rate_tiktok_share = 6250, rate_yt_short = 5750, rate_fb_post = 2750, rate_twitch_stream = 26000, rate_twitch_integ = 11750, rate_kick_stream = 26000, rate_kick_integ = 11750, rate_irl = 39500, rate_usage_monthly = 27000, rate_promo_monthly = 19750, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 1' where id = 184;

-- kyxsan (Player) — Tier 1 (tier_baseline)
update public.players set rate_x_post = 3500, rate_x_repost = 1750, rate_x_share = 1750, rate_ig_static = 11750, rate_ig_story = 10000, rate_ig_reel = 18000, rate_ig_repost = 4250, rate_ig_share = 2500, rate_tiktok_video = 14000, rate_tiktok_repost = 4250, rate_tiktok_share = 6250, rate_yt_short = 5750, rate_fb_post = 2750, rate_twitch_stream = 26000, rate_twitch_integ = 11750, rate_kick_stream = 26000, rate_kick_integ = 11750, rate_irl = 39500, rate_usage_monthly = 27000, rate_promo_monthly = 19750, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 1' where id = 26;

-- DANXY (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'APAC', tier_code = 'Tier 2' where id = 177;

-- Atif Butt (Player) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 3' where id = 150;

-- Gntl (Player) — Tier 3 (methodology_v2_with_data)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'methodology_v2_with_data', audience_market = 'GLOBAL', tier_code = 'Tier 3' where id = 67;

-- Arcitys (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 14;

-- Pred (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 12;

-- Paulehx (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 15;

-- MER1T (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 118;

-- NineK (Head Coach) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 119;

-- Levi (Manager) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 117;

-- Zonic (Head Coach) — Tier 1 (tier_baseline)
update public.players set rate_x_post = 3500, rate_x_repost = 1750, rate_x_share = 1750, rate_ig_static = 11750, rate_ig_story = 10000, rate_ig_reel = 18000, rate_ig_repost = 4250, rate_ig_share = 2500, rate_tiktok_video = 14000, rate_tiktok_repost = 4250, rate_tiktok_share = 6250, rate_yt_short = 5750, rate_fb_post = 2750, rate_twitch_stream = 26000, rate_twitch_integ = 11750, rate_kick_stream = 26000, rate_kick_integ = 11750, rate_irl = 39500, rate_usage_monthly = 27000, rate_promo_monthly = 19750, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 1' where id = 32;

-- ATF (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 41;

-- Javivillar7 (Coach) — Tier 1 (tier_baseline)
update public.players set rate_x_post = 3500, rate_x_repost = 1750, rate_x_share = 1750, rate_ig_static = 11750, rate_ig_story = 10000, rate_ig_reel = 18000, rate_ig_repost = 4250, rate_ig_share = 2500, rate_tiktok_video = 14000, rate_tiktok_repost = 4250, rate_tiktok_share = 6250, rate_yt_short = 5750, rate_fb_post = 2750, rate_twitch_stream = 26000, rate_twitch_integ = 11750, rate_kick_stream = 26000, rate_kick_integ = 11750, rate_irl = 39500, rate_usage_monthly = 27000, rate_promo_monthly = 19750, rate_source = 'tier_baseline', audience_market = 'MENA', tier_code = 'Tier 1' where id = 49;

-- Peterbot (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 65;

-- jume (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 173;

-- Checkmate (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 172;

-- SOMEONE (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 120;

-- Draugr (Head Coach) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 182;

-- Kakashi (Manager) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'APAC', tier_code = 'Tier 3' where id = 88;

-- kyousuke (Player) — Tier 1 (tier_baseline)
update public.players set rate_x_post = 3500, rate_x_repost = 1750, rate_x_share = 1750, rate_ig_static = 11750, rate_ig_story = 10000, rate_ig_reel = 18000, rate_ig_repost = 4250, rate_ig_share = 2500, rate_tiktok_video = 14000, rate_tiktok_repost = 4250, rate_tiktok_share = 6250, rate_yt_short = 5750, rate_fb_post = 2750, rate_twitch_stream = 26000, rate_twitch_integ = 11750, rate_kick_stream = 26000, rate_kick_integ = 11750, rate_irl = 39500, rate_usage_monthly = 27000, rate_promo_monthly = 19750, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 1' where id = 25;

-- Kamiyu (Player) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 3' where id = 157;

-- hmoodx (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 16;

-- Penna (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'MENA', tier_code = 'Tier 2' where id = 77;

-- Numan (Player) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 3' where id = 152;

-- Pollo (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 167;

-- Tapewaare (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 166;

-- Yonx (Player) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 3' where id = 70;

-- Alexy (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 155;

-- Soka (Player) — Tier 1 (tier_baseline)
update public.players set rate_x_post = 3500, rate_x_repost = 1750, rate_x_share = 1750, rate_ig_static = 11750, rate_ig_story = 10000, rate_ig_reel = 18000, rate_ig_repost = 4250, rate_ig_share = 2500, rate_tiktok_video = 14000, rate_tiktok_repost = 4250, rate_tiktok_share = 6250, rate_yt_short = 5750, rate_fb_post = 2750, rate_twitch_stream = 26000, rate_twitch_integ = 11750, rate_kick_stream = 26000, rate_kick_integ = 11750, rate_irl = 39500, rate_usage_monthly = 27000, rate_promo_monthly = 19750, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 1' where id = 21;

-- Msdossary (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'MENA', tier_code = 'Tier 2' where id = 50;

-- mok (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 59;

-- Azzam (Manager) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 3' where id = 136;

-- Craime (Player) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 3' where id = 144;

-- Xyzzy (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 63;

-- LikEfac (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 131;

-- Moaz (Influencer) — Tier 3 (methodology_v2_with_data)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'methodology_v2_with_data', audience_market = 'MENA', tier_code = 'Tier 3' where id = 7;

-- BriD (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 127;

-- NiKo (Player) — Tier S (tier_baseline)
update public.players set rate_x_post = 5500, rate_x_repost = 2750, rate_x_share = 2750, rate_ig_static = 18250, rate_ig_story = 15500, rate_ig_reel = 28000, rate_ig_repost = 6500, rate_ig_share = 4000, rate_tiktok_video = 21750, rate_tiktok_repost = 6500, rate_tiktok_share = 9750, rate_yt_short = 9000, rate_fb_post = 4250, rate_twitch_stream = 40500, rate_twitch_integ = 18250, rate_kick_stream = 40500, rate_kick_integ = 18250, rate_irl = 61500, rate_usage_monthly = 42000, rate_promo_monthly = 30750, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier S' where id = 28;

-- Aymeinstein (Assistant Coach) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 31;

-- Spammiej (Coach) — Tier 1 (tier_baseline)
update public.players set rate_x_post = 3500, rate_x_repost = 1750, rate_x_share = 1750, rate_ig_static = 11750, rate_ig_story = 10000, rate_ig_reel = 18000, rate_ig_repost = 4250, rate_ig_share = 2500, rate_tiktok_video = 14000, rate_tiktok_repost = 4250, rate_tiktok_share = 6250, rate_yt_short = 5750, rate_fb_post = 2750, rate_twitch_stream = 26000, rate_twitch_integ = 11750, rate_kick_stream = 26000, rate_kick_integ = 11750, rate_irl = 39500, rate_usage_monthly = 27000, rate_promo_monthly = 19750, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 1' where id = 161;

-- Yuzus (Player) — Tier 1 (tier_baseline)
update public.players set rate_x_post = 3500, rate_x_repost = 1750, rate_x_share = 1750, rate_ig_static = 11750, rate_ig_story = 10000, rate_ig_reel = 18000, rate_ig_repost = 4250, rate_ig_share = 2500, rate_tiktok_video = 14000, rate_tiktok_repost = 4250, rate_tiktok_share = 6250, rate_yt_short = 5750, rate_fb_post = 2750, rate_twitch_stream = 26000, rate_twitch_integ = 11750, rate_kick_stream = 26000, rate_kick_integ = 11750, rate_irl = 39500, rate_usage_monthly = 27000, rate_promo_monthly = 19750, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 1' where id = 134;

-- FHD (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 66;

-- shirazi (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 175;

-- Sneyking (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 43;

-- Fielder (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 115;

-- Hanbin (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 116;

-- Ghala (Influencer) — Tier 3 (methodology_v2_with_data)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'methodology_v2_with_data', audience_market = 'MENA', tier_code = 'Tier 3' where id = 6;

-- Dola (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'APAC', tier_code = 'Tier 2' where id = 179;

-- Kakashi (Manager) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'APAC', tier_code = 'Tier 3' where id = 87;

-- 1OS (Player) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'MENA', tier_code = 'Tier 3' where id = 190;

-- Livii (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'APAC', tier_code = 'Tier 2' where id = 106;

-- Junkbuck (Coach) — Tier 4 (tier_baseline)
update public.players set rate_x_post = 750, rate_x_repost = 250, rate_x_share = 250, rate_ig_static = 2250, rate_ig_story = 2000, rate_ig_reel = 3500, rate_ig_repost = 750, rate_ig_share = 500, rate_tiktok_video = 2750, rate_tiktok_repost = 750, rate_tiktok_share = 1250, rate_yt_short = 1000, rate_fb_post = 500, rate_twitch_stream = 5000, rate_twitch_integ = 2250, rate_kick_stream = 5000, rate_kick_integ = 2250, rate_irl = 7750, rate_usage_monthly = 5250, rate_promo_monthly = 3750, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 4' where id = 192;

-- Skwal (Manager) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 84;

-- fantasea (Manager) — Tier 1 (tier_baseline)
update public.players set rate_x_post = 3500, rate_x_repost = 1750, rate_x_share = 1750, rate_ig_static = 11750, rate_ig_story = 10000, rate_ig_reel = 18000, rate_ig_repost = 4250, rate_ig_share = 2500, rate_tiktok_video = 14000, rate_tiktok_repost = 4250, rate_tiktok_share = 6250, rate_yt_short = 5750, rate_fb_post = 2750, rate_twitch_stream = 26000, rate_twitch_integ = 11750, rate_kick_stream = 26000, rate_kick_integ = 11750, rate_irl = 39500, rate_usage_monthly = 27000, rate_promo_monthly = 19750, rate_source = 'tier_baseline', audience_market = 'APAC', tier_code = 'Tier 1' where id = 113;

-- dralii (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 138;

-- AfromOush (Manager) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 45;

-- Swooty (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 165;

-- Shady (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'APAC', tier_code = 'Tier 2' where id = 180;

-- grecu (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 34;

-- Abu Omar (Player) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 3' where id = 55;

-- Ghirlanda (Manager) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 3' where id = 57;

-- Neoskai (Manager) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 37;

-- Agatha (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'APAC', tier_code = 'Tier 2' where id = 109;

-- SP9RK1E (Coach) — Tier 1 (tier_baseline)
update public.players set rate_x_post = 3500, rate_x_repost = 1750, rate_x_share = 1750, rate_ig_static = 11750, rate_ig_story = 10000, rate_ig_reel = 18000, rate_ig_repost = 4250, rate_ig_share = 2500, rate_tiktok_video = 14000, rate_tiktok_repost = 4250, rate_tiktok_share = 6250, rate_yt_short = 5750, rate_fb_post = 2750, rate_twitch_stream = 26000, rate_twitch_integ = 11750, rate_kick_stream = 26000, rate_kick_integ = 11750, rate_irl = 39500, rate_usage_monthly = 27000, rate_promo_monthly = 19750, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 1' where id = 121;

-- Moody (Assistant Coach) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'APAC', tier_code = 'Tier 2' where id = 96;

-- Nucleonz (Player) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 3' where id = 38;

-- Kiimo7 (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'MENA', tier_code = 'Tier 2' where id = 53;

-- Cr1t- (Player) — Tier 1 (tier_baseline)
update public.players set rate_x_post = 3500, rate_x_repost = 1750, rate_x_share = 1750, rate_ig_static = 11750, rate_ig_story = 10000, rate_ig_reel = 18000, rate_ig_repost = 4250, rate_ig_share = 2500, rate_tiktok_video = 14000, rate_tiktok_repost = 4250, rate_tiktok_share = 6250, rate_yt_short = 5750, rate_fb_post = 2750, rate_twitch_stream = 26000, rate_twitch_integ = 11750, rate_kick_stream = 26000, rate_kick_integ = 11750, rate_irl = 39500, rate_usage_monthly = 27000, rate_promo_monthly = 19750, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 1' where id = 42;

-- eaglemees (Analyst) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 3' where id = 128;

-- Sai (Player) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 3' where id = 60;

-- Solotov (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 132;

-- Troll (Player) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'APAC', tier_code = 'Tier 3' where id = 92;

-- KERORO (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'MENA', tier_code = 'Tier 2' where id = 73;

-- Kusanagi (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 145;

-- Rashed (Manager) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 3' where id = 54;

-- SAINOI (Manager) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'MENA', tier_code = 'Tier 3' where id = 79;

-- Matteo (Manager) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 3' where id = 71;

-- NaToSaphiX (Head Coach) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 36;

-- Kindevu (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 58;

-- Kickstart (Player) — Tier 1 (tier_baseline)
update public.players set rate_x_post = 3500, rate_x_repost = 1750, rate_x_share = 1750, rate_ig_static = 11750, rate_ig_story = 10000, rate_ig_reel = 18000, rate_ig_repost = 4250, rate_ig_share = 2500, rate_tiktok_video = 14000, rate_tiktok_repost = 4250, rate_tiktok_share = 6250, rate_yt_short = 5750, rate_fb_post = 2750, rate_twitch_stream = 26000, rate_twitch_integ = 11750, rate_kick_stream = 26000, rate_kick_integ = 11750, rate_irl = 39500, rate_usage_monthly = 27000, rate_promo_monthly = 19750, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 1' where id = 124;

-- TeSeS (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 30;

-- Frenchi (Manager) — Tier 1 (tier_baseline)
update public.players set rate_x_post = 3500, rate_x_repost = 1750, rate_x_share = 1750, rate_ig_static = 11750, rate_ig_story = 10000, rate_ig_reel = 18000, rate_ig_repost = 4250, rate_ig_share = 2500, rate_tiktok_video = 14000, rate_tiktok_repost = 4250, rate_tiktok_share = 6250, rate_yt_short = 5750, rate_fb_post = 2750, rate_twitch_stream = 26000, rate_twitch_integ = 11750, rate_kick_stream = 26000, rate_kick_integ = 11750, rate_irl = 39500, rate_usage_monthly = 27000, rate_promo_monthly = 19750, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 1' where id = 129;

-- Frenchi (Manager) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 3' where id = 135;

-- Skiter (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 39;

-- ONFIRE (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'MENA', tier_code = 'Tier 2' where id = 76;

-- Owgwen (Player) — Tier 1 (tier_baseline)
update public.players set rate_x_post = 3500, rate_x_repost = 1750, rate_x_share = 1750, rate_ig_static = 11750, rate_ig_story = 10000, rate_ig_reel = 18000, rate_ig_repost = 4250, rate_ig_share = 2500, rate_tiktok_video = 14000, rate_tiktok_repost = 4250, rate_tiktok_share = 6250, rate_yt_short = 5750, rate_fb_post = 2750, rate_twitch_stream = 26000, rate_twitch_integ = 11750, rate_kick_stream = 26000, rate_kick_integ = 11750, rate_irl = 39500, rate_usage_monthly = 27000, rate_promo_monthly = 19750, rate_source = 'tier_baseline', audience_market = 'APAC', tier_code = 'Tier 1' where id = 93;

-- JPDigits (Analyst) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 189;

-- Jon Ellis (Manager) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 3' where id = 24;

-- Naif Alfaleh (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 81;

-- Pol Urra (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 82;

-- Hadji (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'APAC', tier_code = 'Tier 2' where id = 95;

-- Nucci (Player) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'APAC', tier_code = 'Tier 3' where id = 101;

-- Julio (Coach) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 130;

-- Malr1ne (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 40;

-- Stooflex (Head Coach) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 133;

-- enerii (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 156;

-- clockzi (Player) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 3' where id = 33;

-- Gunner (Head Coach) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 122;

-- Super Marco (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'APAC', tier_code = 'Tier 2' where id = 94;

-- Ghirlanda (Manager) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 3' where id = 148;

-- Koba (Head Coach) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'APAC', tier_code = 'Tier 3' where id = 99;

-- Names (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'APAC', tier_code = 'Tier 2' where id = 100;

-- Aqeel9 (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 149;

-- Saano (Player) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'APAC', tier_code = 'Tier 3' where id = 89;

-- KiSMET (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 11;

-- Xiaohai (Player) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 3' where id = 64;

-- Mozia (Analyst) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'APAC', tier_code = 'Tier 2' where id = 111;

-- CarlJr (Player) — Tier 1 (tier_baseline)
update public.players set rate_x_post = 3500, rate_x_repost = 1750, rate_x_share = 1750, rate_ig_static = 11750, rate_ig_story = 10000, rate_ig_reel = 18000, rate_ig_repost = 4250, rate_ig_share = 2500, rate_tiktok_video = 14000, rate_tiktok_repost = 4250, rate_tiktok_share = 6250, rate_yt_short = 5750, rate_fb_post = 2750, rate_twitch_stream = 26000, rate_twitch_integ = 11750, rate_kick_stream = 26000, rate_kick_integ = 11750, rate_irl = 39500, rate_usage_monthly = 27000, rate_promo_monthly = 19750, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 1' where id = 160;

-- Usama Abbasi (Player) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 3' where id = 153;

-- Hafez (Coach) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'MENA', tier_code = 'Tier 3' where id = 48;

-- Ferdz (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'APAC', tier_code = 'Tier 2' where id = 170;

-- A9 (Manager) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'MENA', tier_code = 'Tier 3' where id = 52;

-- LDX (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'APAC', tier_code = 'Tier 2' where id = 178;

-- VENO (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 35;

-- 2ReaL (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 162;

-- Wesam Khalil (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 83;

-- VR3N (Analyst) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'APAC', tier_code = 'Tier 2' where id = 97;

-- Wxltzy (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 185;

-- FMG (Influencer) — Tier 4 (methodology_v2_with_data)
update public.players set rate_x_post = 750, rate_x_repost = 250, rate_x_share = 250, rate_ig_static = 2250, rate_ig_story = 2000, rate_ig_reel = 3500, rate_ig_repost = 750, rate_ig_share = 500, rate_tiktok_video = 2750, rate_tiktok_repost = 750, rate_tiktok_share = 1250, rate_yt_short = 1000, rate_fb_post = 500, rate_twitch_stream = 5000, rate_twitch_integ = 2250, rate_kick_stream = 5000, rate_kick_integ = 2250, rate_irl = 7750, rate_usage_monthly = 5250, rate_promo_monthly = 3750, rate_source = 'methodology_v2_with_data', audience_market = 'MENA', tier_code = 'Tier 4' where id = 3;

-- Abo Ghazi (Tier 3) — UNVERIFIED, sales must escalate
update public.players set rate_source = 'unverified', audience_market = 'MENA' where id = 4;

-- OMYA (Manager) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 3' where id = 29;

-- Alpine (Manager) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 3' where id = 181;

-- KnoX (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 164;

-- KyleTzy (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'APAC', tier_code = 'Tier 2' where id = 169;

-- Aui_2000 (Head Coach) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 44;

-- Bonkers (Analyst) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 3' where id = 46;

-- GoatMoh (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'MENA', tier_code = 'Tier 2' where id = 47;

-- Vejrgang (Player) — Tier S (tier_baseline)
update public.players set rate_x_post = 5500, rate_x_repost = 2750, rate_x_share = 2750, rate_ig_static = 18250, rate_ig_story = 15500, rate_ig_reel = 28000, rate_ig_repost = 6500, rate_ig_share = 4000, rate_tiktok_video = 21750, rate_tiktok_repost = 6500, rate_tiktok_share = 9750, rate_yt_short = 9000, rate_fb_post = 4250, rate_twitch_stream = 40500, rate_twitch_integ = 18250, rate_kick_stream = 40500, rate_kick_integ = 18250, rate_irl = 61500, rate_usage_monthly = 42000, rate_promo_monthly = 30750, rate_source = 'tier_baseline', audience_market = 'MENA', tier_code = 'Tier S' where id = 51;

-- Cuffin (Player) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'APAC', tier_code = 'Tier 3' where id = 86;

-- NM7 (Player) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 3' where id = 68;

-- Conan (Head Coach) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'MENA', tier_code = 'Tier 2' where id = 72;

-- ONEMORE (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'MENA', tier_code = 'Tier 2' where id = 75;

-- PROTETO (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'MENA', tier_code = 'Tier 2' where id = 78;

-- Clayster (Head Coach) — Tier S (tier_baseline)
update public.players set rate_x_post = 5500, rate_x_repost = 2750, rate_x_share = 2750, rate_ig_static = 18250, rate_ig_story = 15500, rate_ig_reel = 28000, rate_ig_repost = 6500, rate_ig_share = 4000, rate_tiktok_video = 21750, rate_tiktok_repost = 6500, rate_tiktok_share = 9750, rate_yt_short = 9000, rate_fb_post = 4250, rate_twitch_stream = 40500, rate_twitch_integ = 18250, rate_kick_stream = 40500, rate_kick_integ = 18250, rate_irl = 61500, rate_usage_monthly = 42000, rate_promo_monthly = 30750, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier S' where id = 186;

-- Tarzaan (Player) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'APAC', tier_code = 'Tier 3' where id = 91;

-- Nana (Player) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'APAC', tier_code = 'Tier 3' where id = 102;

-- Cellium (Player) — Tier S (tier_baseline)
update public.players set rate_x_post = 5500, rate_x_repost = 2750, rate_x_share = 2750, rate_ig_static = 18250, rate_ig_story = 15500, rate_ig_reel = 28000, rate_ig_repost = 6500, rate_ig_share = 4000, rate_tiktok_video = 21750, rate_tiktok_repost = 6500, rate_tiktok_share = 9750, rate_yt_short = 9000, rate_fb_post = 4250, rate_twitch_stream = 40500, rate_twitch_integ = 18250, rate_kick_stream = 40500, rate_kick_integ = 18250, rate_irl = 61500, rate_usage_monthly = 42000, rate_promo_monthly = 30750, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier S' where id = 9;

-- LIMIT (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'MENA', tier_code = 'Tier 2' where id = 74;

-- Sanji (Player) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'APAC', tier_code = 'Tier 3' where id = 90;

-- Violet (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'APAC', tier_code = 'Tier 2' where id = 104;

-- Manny (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 163;

-- Xev (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'APAC', tier_code = 'Tier 2' where id = 105;

-- LIV (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'APAC', tier_code = 'Tier 2' where id = 107;

-- REMUNDO (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'APAC', tier_code = 'Tier 2' where id = 108;

-- d7oom24 (Head Coach) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 137;

-- Kiileerrz (Player) — Tier 2 (methodology_v2_with_data)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'methodology_v2_with_data', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 139;

-- Shrimzy (Player) — Tier 1 (tier_baseline)
update public.players set rate_x_post = 3500, rate_x_repost = 1750, rate_x_share = 1750, rate_ig_static = 11750, rate_ig_story = 10000, rate_ig_reel = 18000, rate_ig_repost = 4250, rate_ig_share = 2500, rate_tiktok_video = 14000, rate_tiktok_repost = 4250, rate_tiktok_share = 6250, rate_yt_short = 5750, rate_fb_post = 2750, rate_twitch_stream = 26000, rate_twitch_integ = 11750, rate_kick_stream = 26000, rate_kick_integ = 11750, rate_irl = 39500, rate_usage_monthly = 27000, rate_promo_monthly = 19750, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 1' where id = 125;

-- Alpine (Manager) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 3' where id = 18;

-- MoT3yyB (Assistant Coach) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 188;

-- E.T. (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 56;

-- Alireza Firouzja (Player) — Tier 1 (tier_baseline)
update public.players set rate_x_post = 3500, rate_x_repost = 1750, rate_x_share = 1750, rate_ig_static = 11750, rate_ig_story = 10000, rate_ig_reel = 18000, rate_ig_repost = 4250, rate_ig_share = 2500, rate_tiktok_video = 14000, rate_tiktok_repost = 4250, rate_tiktok_share = 6250, rate_yt_short = 5750, rate_fb_post = 2750, rate_twitch_stream = 26000, rate_twitch_integ = 11750, rate_kick_stream = 26000, rate_kick_integ = 11750, rate_irl = 39500, rate_usage_monthly = 27000, rate_promo_monthly = 19750, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 1' where id = 22;

-- Jose Serrano (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 2' where id = 80;

-- Velvet (Player) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'APAC', tier_code = 'Tier 3' where id = 103;

-- FlapTzy (Player) — Tier 2 (tier_baseline)
update public.players set rate_x_post = 2250, rate_x_repost = 1000, rate_x_share = 1000, rate_ig_static = 7250, rate_ig_story = 6000, rate_ig_reel = 11000, rate_ig_repost = 2500, rate_ig_share = 1500, rate_tiktok_video = 8500, rate_tiktok_repost = 2500, rate_tiktok_share = 3750, rate_yt_short = 3500, rate_fb_post = 1750, rate_twitch_stream = 16000, rate_twitch_integ = 7250, rate_kick_stream = 16000, rate_kick_integ = 7250, rate_irl = 24250, rate_usage_monthly = 16500, rate_promo_monthly = 12000, rate_source = 'tier_baseline', audience_market = 'APAC', tier_code = 'Tier 2' where id = 168;

-- Ducky (Head Coach) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'APAC', tier_code = 'Tier 3' where id = 171;

-- Fvvn (Player) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'APAC', tier_code = 'Tier 3' where id = 98;

-- karrigan (Coach) — Tier 1 (tier_baseline)
update public.players set rate_x_post = 3500, rate_x_repost = 1750, rate_x_share = 1750, rate_ig_static = 11750, rate_ig_story = 10000, rate_ig_reel = 18000, rate_ig_repost = 4250, rate_ig_share = 2500, rate_tiktok_video = 14000, rate_tiktok_repost = 4250, rate_tiktok_share = 6250, rate_yt_short = 5750, rate_fb_post = 2750, rate_twitch_stream = 26000, rate_twitch_integ = 11750, rate_kick_stream = 26000, rate_kick_integ = 11750, rate_irl = 39500, rate_usage_monthly = 27000, rate_promo_monthly = 19750, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 1' where id = 193;

-- Hikaru Nakamura (Player) — Tier S (tier_baseline)
update public.players set rate_x_post = 5500, rate_x_repost = 2750, rate_x_share = 2750, rate_ig_static = 18250, rate_ig_story = 15500, rate_ig_reel = 28000, rate_ig_repost = 6500, rate_ig_share = 4000, rate_tiktok_video = 21750, rate_tiktok_repost = 6500, rate_tiktok_share = 9750, rate_yt_short = 9000, rate_fb_post = 4250, rate_twitch_stream = 40500, rate_twitch_integ = 18250, rate_kick_stream = 40500, rate_kick_integ = 18250, rate_irl = 61500, rate_usage_monthly = 42000, rate_promo_monthly = 30750, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier S' where id = 23;

-- TGLTN (Player) — Tier 1 (tier_baseline)
update public.players set rate_x_post = 3500, rate_x_repost = 1750, rate_x_share = 1750, rate_ig_static = 11750, rate_ig_story = 10000, rate_ig_reel = 18000, rate_ig_repost = 4250, rate_ig_share = 2500, rate_tiktok_video = 14000, rate_tiktok_repost = 4250, rate_tiktok_share = 6250, rate_yt_short = 5750, rate_fb_post = 2750, rate_twitch_stream = 26000, rate_twitch_integ = 11750, rate_kick_stream = 26000, rate_kick_integ = 11750, rate_irl = 39500, rate_usage_monthly = 27000, rate_promo_monthly = 19750, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 1' where id = 126;

-- Tamago (Player) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 3' where id = 62;

-- Newbz (Player) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 3' where id = 19;

-- Dannyto (Head Coach) — Tier 3 (tier_baseline)
update public.players set rate_x_post = 1250, rate_x_repost = 750, rate_x_share = 750, rate_ig_static = 4250, rate_ig_story = 3500, rate_ig_reel = 6500, rate_ig_repost = 1500, rate_ig_share = 1000, rate_tiktok_video = 5000, rate_tiktok_repost = 1500, rate_tiktok_share = 2250, rate_yt_short = 2000, rate_fb_post = 1000, rate_twitch_stream = 9500, rate_twitch_integ = 4250, rate_kick_stream = 9500, rate_kick_integ = 4250, rate_irl = 14250, rate_usage_monthly = 9750, rate_promo_monthly = 7250, rate_source = 'tier_baseline', audience_market = 'GLOBAL', tier_code = 'Tier 3' where id = 159;

-- ─── Creators ─────────────────────────────────────────────
-- BanderitaX — Tier S (methodology_v2_with_data)
update public.creators set rate_x_repost = 2750, rate_ig_story = 15500, rate_usage_monthly = 42000, rate_promo_monthly = 30750, rate_x_post_quote = 5500, rate_ig_post = 18250, rate_ig_reels = 28000, rate_yt_full = 70000, rate_yt_preroll = 36500, rate_yt_shorts = 9000, rate_snapchat = 12500, rate_tiktok_ours = 21750, rate_tiktok_client = 15500, rate_event_snap = 61500, rate_twitch_kick_live = 40500, rate_kick_irl = 26500, rate_telegram = 8500, rate_source = 'methodology_v2_with_data', audience_market = 'MENA', tier_code = 'Tier S' where id = 1;

-- oPiiLz — Tier S (methodology_v2_with_data)
update public.creators set rate_x_repost = 2750, rate_ig_story = 15500, rate_usage_monthly = 42000, rate_promo_monthly = 30750, rate_x_post_quote = 5500, rate_ig_post = 18250, rate_ig_reels = 28000, rate_yt_full = 70000, rate_yt_preroll = 36500, rate_yt_shorts = 9000, rate_snapchat = 12500, rate_tiktok_ours = 21750, rate_tiktok_client = 15500, rate_event_snap = 61500, rate_twitch_kick_live = 40500, rate_kick_irl = 26500, rate_telegram = 8500, rate_source = 'methodology_v2_with_data', audience_market = 'MENA', tier_code = 'Tier S' where id = 2;

-- Msdossary7 — Tier 1 (methodology_v2_with_data)
update public.creators set rate_x_repost = 1750, rate_ig_story = 10000, rate_usage_monthly = 27000, rate_promo_monthly = 19750, rate_x_post_quote = 3500, rate_ig_post = 11750, rate_ig_reels = 18000, rate_yt_full = 45000, rate_yt_preroll = 23500, rate_yt_shorts = 5750, rate_snapchat = 8000, rate_tiktok_ours = 14000, rate_tiktok_client = 10000, rate_event_snap = 39500, rate_twitch_kick_live = 26000, rate_kick_irl = 17000, rate_telegram = 5500, rate_source = 'methodology_v2_with_data', audience_market = 'MENA', tier_code = 'Tier 1' where id = 3;

-- Aziz — Tier 1 (methodology_v2_with_data)
update public.creators set rate_x_repost = 1750, rate_ig_story = 10000, rate_usage_monthly = 27000, rate_promo_monthly = 19750, rate_x_post_quote = 3500, rate_ig_post = 11750, rate_ig_reels = 18000, rate_yt_full = 45000, rate_yt_preroll = 23500, rate_yt_shorts = 5750, rate_snapchat = 8000, rate_tiktok_ours = 14000, rate_tiktok_client = 10000, rate_event_snap = 39500, rate_twitch_kick_live = 26000, rate_kick_irl = 17000, rate_telegram = 5500, rate_source = 'methodology_v2_with_data', audience_market = 'MENA', tier_code = 'Tier 1' where id = 4;

-- Bo3omar22 — Tier 1 (methodology_v2_with_data)
update public.creators set rate_x_repost = 1750, rate_ig_story = 10000, rate_usage_monthly = 27000, rate_promo_monthly = 19750, rate_x_post_quote = 3500, rate_ig_post = 11750, rate_ig_reels = 18000, rate_yt_full = 45000, rate_yt_preroll = 23500, rate_yt_shorts = 5750, rate_snapchat = 8000, rate_tiktok_ours = 14000, rate_tiktok_client = 10000, rate_event_snap = 39500, rate_twitch_kick_live = 26000, rate_kick_irl = 17000, rate_telegram = 5500, rate_source = 'methodology_v2_with_data', audience_market = 'MENA', tier_code = 'Tier 1' where id = 5;

-- Abu abeer — Tier 1 (methodology_v2_with_data)
update public.creators set rate_x_repost = 1750, rate_ig_story = 10000, rate_usage_monthly = 27000, rate_promo_monthly = 19750, rate_x_post_quote = 3500, rate_ig_post = 11750, rate_ig_reels = 18000, rate_yt_full = 45000, rate_yt_preroll = 23500, rate_yt_shorts = 5750, rate_snapchat = 8000, rate_tiktok_ours = 14000, rate_tiktok_client = 10000, rate_event_snap = 39500, rate_twitch_kick_live = 26000, rate_kick_irl = 17000, rate_telegram = 5500, rate_source = 'methodology_v2_with_data', audience_market = 'MENA', tier_code = 'Tier 1' where id = 6;

-- LLE — Tier 1 (methodology_v2_with_data)
update public.creators set rate_x_repost = 1750, rate_ig_story = 10000, rate_usage_monthly = 27000, rate_promo_monthly = 19750, rate_x_post_quote = 3500, rate_ig_post = 11750, rate_ig_reels = 18000, rate_yt_full = 45000, rate_yt_preroll = 23500, rate_yt_shorts = 5750, rate_snapchat = 8000, rate_tiktok_ours = 14000, rate_tiktok_client = 10000, rate_event_snap = 39500, rate_twitch_kick_live = 26000, rate_kick_irl = 17000, rate_telegram = 5500, rate_source = 'methodology_v2_with_data', audience_market = 'MENA', tier_code = 'Tier 1' where id = 7;

-- Oden — Tier 1 (methodology_v2_with_data)
update public.creators set rate_x_repost = 1750, rate_ig_story = 10000, rate_usage_monthly = 27000, rate_promo_monthly = 19750, rate_x_post_quote = 3500, rate_ig_post = 11750, rate_ig_reels = 18000, rate_yt_full = 45000, rate_yt_preroll = 23500, rate_yt_shorts = 5750, rate_snapchat = 8000, rate_tiktok_ours = 14000, rate_tiktok_client = 10000, rate_event_snap = 39500, rate_twitch_kick_live = 26000, rate_kick_irl = 17000, rate_telegram = 5500, rate_source = 'methodology_v2_with_data', audience_market = 'MENA', tier_code = 'Tier 1' where id = 8;

-- xSMA333 — Tier 1 (methodology_v2_with_data)
update public.creators set rate_x_repost = 1750, rate_ig_story = 10000, rate_usage_monthly = 27000, rate_promo_monthly = 19750, rate_x_post_quote = 3500, rate_ig_post = 11750, rate_ig_reels = 18000, rate_yt_full = 45000, rate_yt_preroll = 23500, rate_yt_shorts = 5750, rate_snapchat = 8000, rate_tiktok_ours = 14000, rate_tiktok_client = 10000, rate_event_snap = 39500, rate_twitch_kick_live = 26000, rate_kick_irl = 17000, rate_telegram = 5500, rate_source = 'methodology_v2_with_data', audience_market = 'MENA', tier_code = 'Tier 1' where id = 9;

-- 3ADEL — Tier 1 (methodology_v2_with_data)
update public.creators set rate_x_repost = 1750, rate_ig_story = 10000, rate_usage_monthly = 27000, rate_promo_monthly = 19750, rate_x_post_quote = 3500, rate_ig_post = 11750, rate_ig_reels = 18000, rate_yt_full = 45000, rate_yt_preroll = 23500, rate_yt_shorts = 5750, rate_snapchat = 8000, rate_tiktok_ours = 14000, rate_tiktok_client = 10000, rate_event_snap = 39500, rate_twitch_kick_live = 26000, rate_kick_irl = 17000, rate_telegram = 5500, rate_source = 'methodology_v2_with_data', audience_market = 'MENA', tier_code = 'Tier 1' where id = 10;

-- RAED — Tier 1 (methodology_v2_with_data)
update public.creators set rate_x_repost = 1750, rate_ig_story = 10000, rate_usage_monthly = 27000, rate_promo_monthly = 19750, rate_x_post_quote = 3500, rate_ig_post = 11750, rate_ig_reels = 18000, rate_yt_full = 45000, rate_yt_preroll = 23500, rate_yt_shorts = 5750, rate_snapchat = 8000, rate_tiktok_ours = 14000, rate_tiktok_client = 10000, rate_event_snap = 39500, rate_twitch_kick_live = 26000, rate_kick_irl = 17000, rate_telegram = 5500, rate_source = 'methodology_v2_with_data', audience_market = 'MENA', tier_code = 'Tier 1' where id = 11;

-- Falcons — Tier 1 (methodology_v2_with_data)
update public.creators set rate_x_repost = 1750, rate_ig_story = 10000, rate_usage_monthly = 27000, rate_promo_monthly = 19750, rate_x_post_quote = 3500, rate_ig_post = 11750, rate_ig_reels = 18000, rate_yt_full = 45000, rate_yt_preroll = 23500, rate_yt_shorts = 5750, rate_snapchat = 8000, rate_tiktok_ours = 14000, rate_tiktok_client = 10000, rate_event_snap = 39500, rate_twitch_kick_live = 26000, rate_kick_irl = 17000, rate_telegram = 5500, rate_source = 'methodology_v2_with_data', audience_market = 'MENA', tier_code = 'Tier 1' where id = 12;

-- Drb7h — Tier 1 (methodology_v2_with_data)
update public.creators set rate_x_repost = 1750, rate_ig_story = 10000, rate_usage_monthly = 27000, rate_promo_monthly = 19750, rate_x_post_quote = 3500, rate_ig_post = 11750, rate_ig_reels = 18000, rate_yt_full = 45000, rate_yt_preroll = 23500, rate_yt_shorts = 5750, rate_snapchat = 8000, rate_tiktok_ours = 14000, rate_tiktok_client = 10000, rate_event_snap = 39500, rate_twitch_kick_live = 26000, rate_kick_irl = 17000, rate_telegram = 5500, rate_source = 'methodology_v2_with_data', audience_market = 'MENA', tier_code = 'Tier 1' where id = 13;

-- FZX — Tier 1 (methodology_v2_with_data)
update public.creators set rate_x_repost = 1750, rate_ig_story = 10000, rate_usage_monthly = 27000, rate_promo_monthly = 19750, rate_x_post_quote = 3500, rate_ig_post = 11750, rate_ig_reels = 18000, rate_yt_full = 45000, rate_yt_preroll = 23500, rate_yt_shorts = 5750, rate_snapchat = 8000, rate_tiktok_ours = 14000, rate_tiktok_client = 10000, rate_event_snap = 39500, rate_twitch_kick_live = 26000, rate_kick_irl = 17000, rate_telegram = 5500, rate_source = 'methodology_v2_with_data', audience_market = 'MENA', tier_code = 'Tier 1' where id = 14;

-- SaudCast — Tier 1 (methodology_v2_with_data)
update public.creators set rate_x_repost = 1750, rate_ig_story = 10000, rate_usage_monthly = 27000, rate_promo_monthly = 19750, rate_x_post_quote = 3500, rate_ig_post = 11750, rate_ig_reels = 18000, rate_yt_full = 45000, rate_yt_preroll = 23500, rate_yt_shorts = 5750, rate_snapchat = 8000, rate_tiktok_ours = 14000, rate_tiktok_client = 10000, rate_event_snap = 39500, rate_twitch_kick_live = 26000, rate_kick_irl = 17000, rate_telegram = 5500, rate_source = 'methodology_v2_with_data', audience_market = 'MENA', tier_code = 'Tier 1' where id = 15;

-- Hamad — Tier 1 (methodology_v2_with_data)
update public.creators set rate_x_repost = 1750, rate_ig_story = 10000, rate_usage_monthly = 27000, rate_promo_monthly = 19750, rate_x_post_quote = 3500, rate_ig_post = 11750, rate_ig_reels = 18000, rate_yt_full = 45000, rate_yt_preroll = 23500, rate_yt_shorts = 5750, rate_snapchat = 8000, rate_tiktok_ours = 14000, rate_tiktok_client = 10000, rate_event_snap = 39500, rate_twitch_kick_live = 26000, rate_kick_irl = 17000, rate_telegram = 5500, rate_source = 'methodology_v2_with_data', audience_market = 'MENA', tier_code = 'Tier 1' where id = 16;

-- 9leeh — Tier 1 (methodology_v2_with_data)
update public.creators set rate_x_repost = 1750, rate_ig_story = 10000, rate_usage_monthly = 27000, rate_promo_monthly = 19750, rate_x_post_quote = 3500, rate_ig_post = 11750, rate_ig_reels = 18000, rate_yt_full = 45000, rate_yt_preroll = 23500, rate_yt_shorts = 5750, rate_snapchat = 8000, rate_tiktok_ours = 14000, rate_tiktok_client = 10000, rate_event_snap = 39500, rate_twitch_kick_live = 26000, rate_kick_irl = 17000, rate_telegram = 5500, rate_source = 'methodology_v2_with_data', audience_market = 'MENA', tier_code = 'Tier 1' where id = 17;


-- Step 3: Sanity checks (run as separate SELECT after applying)
-- select rate_source, count(*) from public.players  group by rate_source;
-- select rate_source, count(*) from public.creators group by rate_source;
-- select tier_code, count(*), round(avg(rate_ig_reel)) as avg_ig_reel from public.players group by tier_code order by tier_code;
-- select tier_code, count(*), round(avg(rate_ig_reels)) as avg_ig_reels from public.creators group by tier_code order by tier_code;
