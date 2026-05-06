-- Migration 067: re-anchor pre-roll CPMs to CITED industry benchmarks.
-- Mig 066 used rules-of-thumb CPMs that were systematically inflated, especially
-- for KSA / MENA / APAC. Re-calibrated against published 2024-2025 sources.
--
-- Sources (cited inline in the function):
--   - InfluenceFlow YouTube Sponsorship Rates 2025 Guide
--   - Cloutboost Gaming Influencer Marketing Guide 2024
--     ("60-90s integration $25 low end to ~$40 high end")
--   - ExchangeWire MENA Micro-Influencer Report 2025
--     ("UAE/Saudi $8-14 general for luxury and tech")
--   - Page One Formula Influencer Marketing CPM Benchmarks 2024-2025
--     ("Branded tech integration $30-50 ... gaming/entertainment $8-25")
--   - Influencer Marketing Hub MENA Report
--
-- Re-calibrated rates (sponsored creator pre-roll, gaming vertical, USD/1000):
--   NA      $40   (was $55)
--   EU      $30   (was $40)
--   KSA     $25   (was $50, ~2x reality)
--   MENA    $12   (was $45, conflated with KSA-gulf rates)
--   APAC    $12   (was $30)
--   GLOBAL  $25   (was $45)
-- DB-side already applied via Supabase MCP on 2026-05-05. Repo-of-record companion.

CREATE TABLE IF NOT EXISTS public._players_snapshot_2026_05_05_pre_067 AS
SELECT id, nickname, tier_code, audience_market, followers_yt, base_rate_anchor, rate_yt_preroll
FROM public.players;

CREATE TABLE IF NOT EXISTS public._creators_snapshot_2026_05_05_pre_067 AS
SELECT id, nickname, tier_code, audience_market, followers_yt, rate_ig_reel, rate_yt_preroll
FROM public.creators;

CREATE OR REPLACE FUNCTION public.yt_preroll_cpm_usd(p_region text)
RETURNS numeric LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  -- Cited from InfluenceFlow / Cloutboost / ExchangeWire / Page One Formula 2024-2025.
  -- Sponsored creator pre-roll CPM, gaming vertical, USD per 1000 estimated views.
  select case
    when p_region = 'NA'     then 40.0  -- Page One Formula: $30-50 branded tech
    when p_region = 'EU'     then 30.0  -- Cloutboost: $25-40 gaming sponsored
    when p_region = 'KSA'    then 25.0  -- ExchangeWire: $8-14 general x 2x sponsored = ~$20-28
    when p_region = 'MENA'   then 12.0  -- ExchangeWire: Egypt/Algeria/Levant ~$10-15
    when p_region = 'APAC'   then 12.0  -- Cloutboost: gaming median across APAC
    else                          25.0  -- weighted median
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

INSERT INTO public.audit_log (actor_email, actor_kind, action, entity_type, entity_id, diff, created_at)
VALUES (
  'abdghazzawi1@gmail.com', 'human', 'preroll_recalibrate_mig067', 'system', 0,
  jsonb_build_object(
    'migration','067',
    'reason','Mig 066 used uncited rule-of-thumb CPMs that were ~2-4x real published benchmarks for KSA/MENA/APAC.',
    'old_cpms_usd', jsonb_build_object('KSA',50,'MENA',45,'EU',40,'NA',55,'APAC',30,'GLOBAL',45),
    'new_cpms_usd', jsonb_build_object('KSA',25,'MENA',12,'EU',30,'NA',40,'APAC',12,'GLOBAL',25),
    'sources','InfluenceFlow 2025; Cloutboost Gaming 2024; ExchangeWire MENA 2025; Page One Formula 2024-2025; InfluencerMarketingHub MENA'
  ), now()
);
