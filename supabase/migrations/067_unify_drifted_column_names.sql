-- Migration 067 — Unify drifted column names between players + creators.
-- Already applied via Supabase MCP. Recorded here for repo parity.
--
-- Renames (winner kept, loser renamed to canonical):
--   players.rate_ig_static       → rate_ig_post   (match market_bands + creators)
--   creators.rate_ig_reels       → rate_ig_reel   (match players + market_bands)
--   creators.rate_yt_shorts      → rate_yt_short  (match players + market_bands)
--   creators.rate_yt_shorts_repost → rate_yt_short_repost (match players)
--
-- The talent_pricing_inputs view referenced the old names AND emitted JSONB
-- keys matching them. Postgres auto-updates column refs after RENAME but
-- not string literals, so the view is dropped + recreated.
--
-- Untouched (legitimate per-talent-type concepts, not drift):
--   - rate_x_repost (player) vs rate_x_post_quote (creator)
--   - rate_twitch_stream + rate_kick_stream (player) vs rate_twitch_kick_live (creator)
--   - All player-only rate_game_* / rate_subathon_block / rate_charity_stream
--   - Creator-only rate_yt_preroll / rate_telegram / rate_tiktok_client / ours

drop view if exists public.talent_pricing_inputs;

alter table public.players  rename column rate_ig_static       to rate_ig_post;
alter table public.creators rename column rate_ig_reels        to rate_ig_reel;
alter table public.creators rename column rate_yt_shorts       to rate_yt_short;
alter table public.creators rename column rate_yt_shorts_repost to rate_yt_short_repost;

-- View recreated with new names in both column refs + JSONB keys.
-- See Supabase migration log for full text.
