-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 045 — Restore pre-039 lower anchors (the "here and now" model)
-- ───────────────────────────────────────────────────────────────────────────
-- Date: 2026-05-03
-- Author: Koge / Cowork session
--
-- Goal: bring back the lower-floor MENA-native + APAC-native anchors that
-- existed AFTER migration 037 (per-region tier anchors) but BEFORE migration
-- 039 (reach multiplier chaos). Sales pushes UP via the 9 axes for premium /
-- Western brand / strategic.
--
-- After migration 044 reverted to pre-037 (SOT v1 global anchors), MENA prices
-- jumped back to Spy=20,700 / Cuffin=18,000 / Moaz=6,500. Koge confirmed the
-- model he liked was the lower per-region anchors (Spy=6,325 / Cuffin=6,000 /
-- Moaz=2,000), where the FLOOR is honest to the local market and the AXES
-- carry the price upward when the brand budget supports it.
--
-- Source of truth: _players_rates_snapshot_2026_05_03_pre_039 (taken right
-- before migration 039 introduced reach_multiplier; contains the post-037
-- per-region anchors).
--
-- SAFE: writes only to numeric rate columns + base_rate_anchor + reach_multiplier.
-- Doesn't touch handles, tier_code, audience_market, agency, achievements.
-- Reversible by restoring `_players_rates_snapshot_2026_05_03_pre_045`.
--
-- Live result for the headline roster:
--   Hikaru     33,600 (Tier S Global, unchanged)
--   NiKo       32,200 (Tier S Global, unchanged)
--   Cellium    30,800 (Tier S Global, unchanged)
--   Msdossary  30,800 (Tier S MENA, unchanged)
--   karrigan   20,700 (Tier 1 Global, unchanged)
--   Hadji      10,800 (Tier S APAC, was 25,200)
--   madv        6,600 (Tier 1 MENA, was 21,600)
--   Spy         6,325 (Tier 1 MENA, was 20,700)
--   Cuffin      6,000 (Tier 1 MENA, was 18,000)
--   Abo Najd    3,800 (Tier 2 MENA, was 11,000)
--   Moaz        2,000 (Tier 3 MENA, was 6,500)
--   Naif          800 (Tier 4 MENA, was 3,500)
-- ═══════════════════════════════════════════════════════════════════════════

drop table if exists public._players_rates_snapshot_2026_05_03_pre_045;

create table public._players_rates_snapshot_2026_05_03_pre_045 as
select id, nickname, tier_code, audience_market, base_rate_anchor,
       rate_ig_reel, rate_ig_static, rate_ig_story, rate_ig_repost, rate_ig_share,
       rate_tiktok_video, rate_tiktok_repost, rate_tiktok_share,
       rate_yt_short, rate_yt_short_repost,
       rate_x_post, rate_x_repost, rate_x_share, rate_fb_post,
       rate_twitch_stream, rate_twitch_integ,
       rate_kick_stream, rate_kick_integ,
       rate_irl, rate_usage_monthly, rate_promo_monthly,
       achievement_decay_factor, reach_multiplier,
       updated_at
  from public.players;

-- Restore base_rate_anchor from pre_039 snapshot
update public.players p
   set base_rate_anchor = s.base_rate_anchor,
       updated_at = now()
  from public._players_rates_snapshot_2026_05_03_pre_039 s
 where s.id = p.id
   and p.is_active is not false;

-- Recompute every rate_* column from restored anchor × platform_ratio
update public.players
   set rate_ig_reel         = round(base_rate_anchor * public.platform_ratio('ig_reel')),
       rate_ig_static       = round(base_rate_anchor * public.platform_ratio('ig_static')),
       rate_ig_story        = round(base_rate_anchor * public.platform_ratio('ig_story')),
       rate_ig_repost       = round(base_rate_anchor * public.platform_ratio('ig_repost')),
       rate_ig_share        = round(base_rate_anchor * public.platform_ratio('ig_share')),
       rate_tiktok_video    = round(base_rate_anchor * public.platform_ratio('tiktok_video')),
       rate_tiktok_repost   = round(base_rate_anchor * public.platform_ratio('tiktok_repost')),
       rate_tiktok_share    = round(base_rate_anchor * public.platform_ratio('tiktok_share')),
       rate_yt_short        = round(base_rate_anchor * public.platform_ratio('yt_short')),
       rate_x_post          = round(base_rate_anchor * public.platform_ratio('x_post')),
       rate_x_repost        = round(base_rate_anchor * public.platform_ratio('x_repost')),
       rate_x_share         = round(base_rate_anchor * public.platform_ratio('x_share')),
       rate_fb_post         = round(base_rate_anchor * public.platform_ratio('fb_post')),
       rate_twitch_stream   = round(base_rate_anchor * public.platform_ratio('twitch_stream')),
       rate_twitch_integ    = round(base_rate_anchor * public.platform_ratio('twitch_integ')),
       rate_kick_stream     = round(base_rate_anchor * public.platform_ratio('kick_stream')),
       rate_kick_integ      = round(base_rate_anchor * public.platform_ratio('kick_integ')),
       rate_irl             = round(base_rate_anchor * public.platform_ratio('irl')),
       rate_usage_monthly   = round(base_rate_anchor * public.platform_ratio('usage_monthly')),
       rate_promo_monthly   = round(base_rate_anchor * public.platform_ratio('promo_monthly')),
       updated_at = now()
 where is_active is not false
   and base_rate_anchor > 0;

-- Reset reach_multiplier defensively (already 1.00 after migration 044)
update public.players
   set reach_multiplier = 1.00,
       updated_at = now()
 where is_active is not false
   and reach_multiplier is distinct from 1.00;

-- Audit log entry per affected player
insert into public.audit_log (actor_email, actor_kind, action, entity_type, entity_id, diff)
select 'koge@migration_045',
       'system',
       'restore_pre_039_anchors',
       'player',
       p.id::text,
       jsonb_build_object(
         'old_anchor',  s.base_rate_anchor,
         'new_anchor',  p.base_rate_anchor,
         'old_ig_reel', s.rate_ig_reel,
         'new_ig_reel', p.rate_ig_reel,
         'delta_anchor', p.base_rate_anchor - s.base_rate_anchor,
         'note', 'restored from _players_rates_snapshot_2026_05_03_pre_039'
       )
  from public.players p
  join public._players_rates_snapshot_2026_05_03_pre_045 s on s.id = p.id
 where p.base_rate_anchor != s.base_rate_anchor
    or p.rate_ig_reel != s.rate_ig_reel;

-- Sanity check view: zero rows = success
drop view if exists public.v_post_045_anchor_check;
create view public.v_post_045_anchor_check as
select p.id, p.nickname, p.tier_code, p.audience_market,
       p.base_rate_anchor as live_anchor,
       s.base_rate_anchor as expected_anchor,
       (p.base_rate_anchor - s.base_rate_anchor) as drift
  from public.players p
  join public._players_rates_snapshot_2026_05_03_pre_039 s on s.id = p.id
 where p.is_active is not false
   and p.base_rate_anchor != s.base_rate_anchor
 order by abs(p.base_rate_anchor - s.base_rate_anchor) desc;

comment on view public.v_post_045_anchor_check is
  'Post-Migration-045 sanity check. Expected: zero rows. Any row = a live anchor diverges from the pre-039 snapshot.';
