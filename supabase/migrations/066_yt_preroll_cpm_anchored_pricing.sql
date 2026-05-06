-- Migration 066: YouTube pre-roll pricing across all talents (players + creators)
-- CPM-anchored formula with Floor-First clamp.
--   rate_yt_preroll = GREATEST(
--     (followers_yt × tier_view_rate × regional_cpm_usd × 3.75) / 1000,
--     anchor × 1.30
--   )
-- Players: anchor = base_rate_anchor. Creators: anchor = rate_ig_reel.
-- Regional pre-roll CPM (sponsored creator pre-roll, premium):
--   KSA $50 / MENA $45 / EU $40 / NA $55 / APAC $30 / GLOBAL $45
-- View rate by tier (% of subs viewing a typical video):
--   Tier S 15% / Tier 1 12% / Tier 2 10% / Tier 3 8% / Tier 4 6%
-- DB-side already applied via Supabase MCP on 2026-05-05. Repo-of-record companion.

CREATE TABLE IF NOT EXISTS public._players_snapshot_2026_05_05_pre_066 AS
SELECT id, nickname, tier_code, audience_market, followers_yt, base_rate_anchor
FROM public.players;

CREATE TABLE IF NOT EXISTS public._creators_snapshot_2026_05_05_pre_066 AS
SELECT id, nickname, tier_code, audience_market, followers_yt, rate_ig_reel, rate_yt_preroll
FROM public.creators;

ALTER TABLE public.players ADD COLUMN IF NOT EXISTS rate_yt_preroll numeric(12,2);

CREATE OR REPLACE FUNCTION public.platform_ratio(p_platform text)
RETURNS numeric LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  select case p_platform
    when 'ig_reel'         then 1.00
    when 'ig_static'       then 0.65
    when 'ig_story'        then 0.55
    when 'ig_repost'       then 0.50
    when 'ig_share'        then 0.15
    when 'tiktok_video'    then 0.80
    when 'tiktok_repost'   then 0.40
    when 'tiktok_share'    then 0.35
    when 'yt_short'        then 0.32
    when 'yt_short_repost' then 0.16
    when 'yt_full'         then 1.85
    when 'yt_preroll'      then 1.30  -- Mig 066
    when 'x_post'          then 0.20
    when 'x_repost'        then 0.10
    when 'x_share'         then 0.10
    when 'fb_post'         then 0.16
    when 'twitch_stream'   then 1.45
    when 'twitch_integ'    then 0.66
    when 'kick_stream'     then 1.45
    when 'kick_integ'      then 0.66
    when 'irl'             then 2.20
    when 'usage_monthly'   then 1.50
    when 'promo_monthly'   then 1.10
    when 'snapchat'        then 0.40
    when 'snap_repost'     then 0.20
    when 'snap_coverage'   then 0.65
    when 'snap_takeover'   then 1.50
    when 'snap_discover'   then 0.85
    when 'event_snap'      then 1.20
    when 'watchparty'      then 1.65
    when 'game_playthrough_full'    then 2.50
    when 'game_preview_demo'        then 1.80
    when 'game_tutorial'            then 1.40
    when 'game_speedrun_challenge'  then 1.60
    when 'game_reaction_video'      then 0.90
    when 'game_clip_series_short'   then 1.30
    when 'game_branded_skin_use'    then 1.20
    when 'game_sponsored_match'     then 1.50
    when 'game_launch_event_irl'    then 2.50
    when 'game_beta_first_access'   then 1.80
    when 'game_review_long_form'    then 2.20
    when 'game_dev_co_stream'       then 1.60
    when 'twitch_raid'              then 0.50
    when 'watch_along'              then 1.20
    when 'irl_stream'               then 1.80
    when 'charity_stream'           then 1.40
    when 'podcast_guest_live'       then 1.10
    when 'debate_panel'             then 1.30
    when 'hostraid_train'           then 0.85
    when 'subathon_block'           then 2.20
    when '24h_stream'               then 4.50
    when 'first_play_premiere'      then 2.00
    else 0.50
  end;
$$;

CREATE OR REPLACE FUNCTION public.yt_preroll_cpm_usd(p_region text)
RETURNS numeric LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  select case
    when p_region = 'KSA'    then 50.0
    when p_region = 'MENA'   then 45.0
    when p_region = 'EU'     then 40.0
    when p_region = 'NA'     then 55.0
    when p_region = 'APAC'   then 30.0
    else                          45.0
  end;
$$;

CREATE OR REPLACE FUNCTION public.yt_preroll_view_rate(p_tier text)
RETURNS numeric LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  select case p_tier
    when 'Tier S' then 0.15
    when 'Tier 1' then 0.12
    when 'Tier 2' then 0.10
    when 'Tier 3' then 0.08
    when 'Tier 4' then 0.06
    else               0.10
  end;
$$;

UPDATE public.players p SET
  rate_yt_preroll = GREATEST(
    ROUND((COALESCE(p.followers_yt, 0)::numeric
      * public.yt_preroll_view_rate(p.tier_code)
      * public.yt_preroll_cpm_usd(p.audience_market)
      * 3.75) / 1000, 2),
    ROUND(COALESCE(p.base_rate_anchor, 0) * 1.30, 2)
  ),
  updated_at = now()
WHERE p.is_active = true;

UPDATE public.creators c SET
  rate_yt_preroll = GREATEST(
    ROUND((COALESCE(c.followers_yt, 0)::numeric
      * public.yt_preroll_view_rate(c.tier_code)
      * public.yt_preroll_cpm_usd(c.audience_market)
      * 3.75) / 1000, 2),
    ROUND(COALESCE(c.rate_ig_reel, 0) * 1.30, 2)
  ),
  updated_at = now();
