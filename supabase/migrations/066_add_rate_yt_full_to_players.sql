-- Migration 066 — Add rate_yt_full to players + backfill from rate_ig_reel × 3.0.
-- Already applied via Supabase MCP. Recorded here for repo parity.
--
-- Closes the YouTube long-form gap: until now, players had no rate column
-- for sponsored long-form YT videos, even though creators have rate_yt_full
-- and the talent intake page referenced rate_yt_video (which existed on
-- neither table). Both bugs fixed:
--   - Schema: add rate_yt_full to players, backfill 3.0× rate_ig_reel.
--   - Code (separate commit): rename rate_yt_video → rate_yt_full in the
--     Player TS interface, intake DELIVERABLES, and PLAYER_PLATFORMS.
--
-- Backfill ratio (3.0×) derived from the 16 active creators where
-- rate_yt_full averages 3.036× rate_ig_reels.
--
-- Snapshot: public._players_snapshot_pre_066

alter table public.players
  add column if not exists rate_yt_full numeric;

update public.players
set rate_yt_full = round(coalesce(rate_ig_reel, 0) * 3.0)
where rate_yt_full is null and is_active = true;
