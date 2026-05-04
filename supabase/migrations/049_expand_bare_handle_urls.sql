-- Migration 049: expand bare-handle social values to canonical URLs
-- 35 columns across 20 player rows stored bare handles like 'pg_ghala3', 'ChonFx',
-- 'UCKLTHj9SshU_IwDLO12aDSw' that rendered as broken URLs in the UI. This migration
-- normalizes them to canonical URL form, platform-aware:
--   IG     -> https://www.instagram.com/{h}
--   TT     -> https://www.tiktok.com/@{h}
--   Twitch -> https://www.twitch.tv/{h}
--   X      -> https://x.com/{h}
--   FB     -> https://www.facebook.com/{h}
--   YouTube: if matches ^UC[A-Za-z0-9_-]{22}$ -> /channel/{id}, else -> /@{handle}.
--            Strip trailing '/featured' if present.
-- Skips: id=5 Mary twitch='mary' (too generic, may be wrong account).
-- DB-side already applied via Supabase MCP on 2026-05-04. Repo-of-record companion.

CREATE TABLE IF NOT EXISTS public._players_snapshot_2026_05_04_pre_049 AS
SELECT id, nickname, instagram, twitch, youtube, tiktok, x_handle, facebook
FROM public.players
WHERE
  (instagram IS NOT NULL AND instagram NOT ILIKE 'http%') OR
  (twitch    IS NOT NULL AND twitch    NOT ILIKE 'http%') OR
  (youtube   IS NOT NULL AND youtube   NOT ILIKE 'http%') OR
  (tiktok    IS NOT NULL AND tiktok    NOT ILIKE 'http%') OR
  (x_handle  IS NOT NULL AND x_handle  NOT ILIKE 'http%') OR
  (facebook  IS NOT NULL AND facebook  NOT ILIKE 'http%');

UPDATE public.players
SET instagram = 'https://www.instagram.com/' || instagram, updated_at=now()
WHERE instagram IS NOT NULL AND instagram NOT ILIKE 'http%';

UPDATE public.players
SET tiktok = 'https://www.tiktok.com/' || CASE WHEN tiktok LIKE '@%' THEN tiktok ELSE '@' || tiktok END,
    updated_at=now()
WHERE tiktok IS NOT NULL AND tiktok NOT ILIKE 'http%';

UPDATE public.players
SET twitch = 'https://www.twitch.tv/' || twitch, updated_at=now()
WHERE twitch IS NOT NULL AND twitch NOT ILIKE 'http%' AND id <> 5;

UPDATE public.players
SET x_handle = 'https://x.com/' || x_handle, updated_at=now()
WHERE x_handle IS NOT NULL AND x_handle NOT ILIKE 'http%';

UPDATE public.players
SET facebook = 'https://www.facebook.com/' || facebook, updated_at=now()
WHERE facebook IS NOT NULL AND facebook NOT ILIKE 'http%';

UPDATE public.players
SET youtube = regexp_replace(youtube, '/featured$', ''), updated_at=now()
WHERE youtube IS NOT NULL AND youtube ~ '/featured$' AND youtube NOT ILIKE 'http%';

UPDATE public.players
SET youtube = CASE
                WHEN youtube ~ '^UC[A-Za-z0-9_-]{22}$' THEN 'https://www.youtube.com/channel/' || youtube
                WHEN youtube LIKE '@%'                  THEN 'https://www.youtube.com/' || youtube
                ELSE 'https://www.youtube.com/@' || youtube
              END,
    updated_at=now()
WHERE youtube IS NOT NULL AND youtube NOT ILIKE 'http%';

INSERT INTO public.audit_log (actor_email, actor_kind, action, entity_type, entity_id, diff, created_at)
SELECT 'abdghazzawi1@gmail.com', 'ai', 'bare_handle_url_expand', 'player', id,
       jsonb_build_object('migration','049','source','data_quality_audit','note','Bare handles expanded to canonical URLs.'),
       now()
FROM public._players_snapshot_2026_05_04_pre_049;
