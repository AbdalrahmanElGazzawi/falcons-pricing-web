-- 086 — intake metrics + brand-fit + creators parity + yt col rename + Abo Najd backfill
-- Applied via Supabase MCP on 2026-05-13.

-- 1. PLAYERS · 30d performance metrics
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS twitch_30d_unique_viewers      integer,
  ADD COLUMN IF NOT EXISTS twitch_30d_hours_watched       integer,
  ADD COLUMN IF NOT EXISTS yt_28d_avg_watch_time_seconds  integer,
  ADD COLUMN IF NOT EXISTS yt_28d_new_viewers_reached     integer,
  ADD COLUMN IF NOT EXISTS ig_30d_reach                   integer,
  ADD COLUMN IF NOT EXISTS ig_30d_avg_reel_views          integer,
  ADD COLUMN IF NOT EXISTS tiktok_30d_avg_views           integer,
  ADD COLUMN IF NOT EXISTS posts_per_week_ig              smallint,
  ADD COLUMN IF NOT EXISTS posts_per_week_tiktok          smallint,
  ADD COLUMN IF NOT EXISTS videos_per_week_yt             smallint,
  ADD COLUMN IF NOT EXISTS streams_per_week_twitch        smallint;

-- 2. PLAYERS · brand-fit / availability
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS english_proficiency  text,
  ADD COLUMN IF NOT EXISTS min_lead_time_days   smallint,
  ADD COLUMN IF NOT EXISTS editing_team_size    smallint;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'players_english_proficiency_chk') THEN
    ALTER TABLE public.players ADD CONSTRAINT players_english_proficiency_chk
      CHECK (english_proficiency IS NULL OR english_proficiency IN ('native','fluent','conversational','basic','none'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'players_min_lead_time_chk') THEN
    ALTER TABLE public.players ADD CONSTRAINT players_min_lead_time_chk
      CHECK (min_lead_time_days IS NULL OR (min_lead_time_days >= 0 AND min_lead_time_days <= 90));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'players_editing_team_chk') THEN
    ALTER TABLE public.players ADD CONSTRAINT players_editing_team_chk
      CHECK (editing_team_size IS NULL OR (editing_team_size >= 0 AND editing_team_size <= 20));
  END IF;
END $$;

-- 3. Column documentation
COMMENT ON COLUMN public.players.twitch_30d_unique_viewers IS 'Twitch Creator Dashboard / Insights -> Unique Viewers (last 30 days).';
COMMENT ON COLUMN public.players.twitch_30d_hours_watched IS 'Twitch Creator Dashboard / Insights -> Total Hours Watched (viewer-hours) over last 30 days.';
COMMENT ON COLUMN public.players.yt_28d_avg_watch_time_seconds IS 'YouTube Studio -> average view duration (seconds) over last 28 days.';
COMMENT ON COLUMN public.players.yt_28d_new_viewers_reached IS 'YouTube Studio: new viewers reached in last 28 days. Successor of yt_28d_unique_viewers.';
COMMENT ON COLUMN public.players.yt_28d_unique_viewers IS 'DEPRECATED - use yt_28d_new_viewers_reached.';
COMMENT ON COLUMN public.players.ig_30d_reach IS 'Instagram Insights: total unique accounts reached in last 30 days.';
COMMENT ON COLUMN public.players.ig_30d_avg_reel_views IS 'Instagram Insights: average Reel plays over last 30 days.';
COMMENT ON COLUMN public.players.tiktok_30d_avg_views IS 'TikTok Analytics: average views per post over last 30 days.';
COMMENT ON COLUMN public.players.english_proficiency IS 'Self-reported English fluency: native / fluent / conversational / basic / none.';
COMMENT ON COLUMN public.players.min_lead_time_days IS 'Minimum days notice required from brief delivery to talent execution.';
COMMENT ON COLUMN public.players.editing_team_size IS 'Number of editors / production staff on the talents team.';

-- 4. CREATORS · full parity
ALTER TABLE public.creators
  ADD COLUMN IF NOT EXISTS twitch_30d_avg_ccv             integer,
  ADD COLUMN IF NOT EXISTS twitch_30d_peak_ccv            integer,
  ADD COLUMN IF NOT EXISTS twitch_30d_hours_streamed      numeric(7,2),
  ADD COLUMN IF NOT EXISTS twitch_30d_live_views          integer,
  ADD COLUMN IF NOT EXISTS twitch_30d_new_follows         integer,
  ADD COLUMN IF NOT EXISTS twitch_30d_unique_viewers      integer,
  ADD COLUMN IF NOT EXISTS twitch_30d_hours_watched       integer,
  ADD COLUMN IF NOT EXISTS yt_28d_views                   integer,
  ADD COLUMN IF NOT EXISTS yt_28d_impressions             bigint,
  ADD COLUMN IF NOT EXISTS yt_28d_unique_viewers          integer,
  ADD COLUMN IF NOT EXISTS yt_28d_new_viewers_reached     integer,
  ADD COLUMN IF NOT EXISTS yt_28d_ctr_pct                 numeric(5,2),
  ADD COLUMN IF NOT EXISTS yt_28d_avg_watch_time_seconds  integer,
  ADD COLUMN IF NOT EXISTS ig_30d_reach                   integer,
  ADD COLUMN IF NOT EXISTS ig_30d_avg_reel_views          integer,
  ADD COLUMN IF NOT EXISTS tiktok_30d_avg_views           integer,
  ADD COLUMN IF NOT EXISTS posts_per_week_ig              smallint,
  ADD COLUMN IF NOT EXISTS posts_per_week_tiktok          smallint,
  ADD COLUMN IF NOT EXISTS videos_per_week_yt             smallint,
  ADD COLUMN IF NOT EXISTS streams_per_week_twitch        smallint,
  ADD COLUMN IF NOT EXISTS english_proficiency            text,
  ADD COLUMN IF NOT EXISTS min_lead_time_days             smallint,
  ADD COLUMN IF NOT EXISTS editing_team_size              smallint,
  ADD COLUMN IF NOT EXISTS metrics_30d_synced_at          timestamptz;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'creators_english_proficiency_chk') THEN
    ALTER TABLE public.creators ADD CONSTRAINT creators_english_proficiency_chk
      CHECK (english_proficiency IS NULL OR english_proficiency IN ('native','fluent','conversational','basic','none'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'creators_min_lead_time_chk') THEN
    ALTER TABLE public.creators ADD CONSTRAINT creators_min_lead_time_chk
      CHECK (min_lead_time_days IS NULL OR (min_lead_time_days >= 0 AND min_lead_time_days <= 90));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'creators_editing_team_chk') THEN
    ALTER TABLE public.creators ADD CONSTRAINT creators_editing_team_chk
      CHECK (editing_team_size IS NULL OR (editing_team_size >= 0 AND editing_team_size <= 20));
  END IF;
END $$;

-- 5. Copy existing yt_28d_unique_viewers values forward
UPDATE public.players
SET yt_28d_new_viewers_reached = yt_28d_unique_viewers
WHERE yt_28d_unique_viewers IS NOT NULL AND yt_28d_new_viewers_reached IS NULL;

-- 6. Backfill Abo Najd from 2026-05-13 dashboard pull
UPDATE public.players SET
  twitch_30d_avg_ccv             = 566,
  twitch_30d_hours_streamed      = 156.37,
  twitch_30d_live_views          = 663185,
  twitch_30d_new_follows         = 2324,
  twitch_30d_unique_viewers      = 144757,
  twitch_30d_hours_watched       = 199000,
  yt_28d_avg_watch_time_seconds  = 817,
  yt_28d_new_viewers_reached     = 43088,
  audience_country_mix           = jsonb_build_object(
    'twitch', jsonb_build_object('SA', 0.68, 'KW', 0.04, 'AE', 0.04, 'IL', 0.03, 'MA', 0.03)
  ),
  rate_source                    = 'reach_calibrated',
  metrics_30d_synced_at          = now(),
  updated_at                     = now()
WHERE id = 2;
