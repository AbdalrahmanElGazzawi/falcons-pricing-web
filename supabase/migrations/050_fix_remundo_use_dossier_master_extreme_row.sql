-- Migration 050: revert REMUNDO (id=108) to the actual Master Extreme R115 dossier row
-- Mig 047 mistakenly trusted the dossier's Source Notes citation (which conflated REMUNDO
-- with Livy Renata the Indonesian celeb) and kept the big livyrenata-family socials from
-- mig 046. They aren't REMUNDO's. The Master Extreme R115 row is the verified researcher
-- data and shows real handles + much smaller real reach (~563k vs ~4.5M).
-- DB-side already applied via Supabase MCP on 2026-05-04. Repo-of-record companion.

CREATE TABLE IF NOT EXISTS public._players_snapshot_2026_05_04_pre_050 AS
SELECT * FROM public.players WHERE id = 108;

UPDATE public.players SET
  full_name        = 'Nadiya Bahktita',
  instagram        = 'https://www.instagram.com/olivia.wijayaa/',
  followers_ig     = 9000,
  youtube          = 'https://www.youtube.com/@Livyipp',
  followers_yt     = 4140,
  tiktok           = 'https://www.tiktok.com/@livyipp',
  followers_tiktok = 6523,
  x_handle         = 'https://x.com/livyyrenata',
  followers_x      = 346600,
  facebook         = 'https://www.facebook.com/p/Livy-Renata-100082593348087/',
  followers_fb     = 197000,
  audience_data_verified   = true,
  audience_data_updated_at = now(),
  followers_data_updated_at= now(),
  pricing_rationale = 'T3 APAC tier baseline (1,620 SAR / 432 USD IG-Reel). Verified ~563k aggregate reach across her livyipp YT/TT, olivia.wijayaa IG, livyyrenata X, and Livy Renata FB per Falcons_Extreme_Roster_Dossier 5_3_2026 Master Extreme R115. MLBB Falcons Vega ID Roamer, Indonesian audience.',
  notes             = 'Verified per Falcons dossier 5/3/2026 Master Extreme R115. Real name Nadiya Bahktita. NOTE: dossier Source Notes R7 incorrectly conflated REMUNDO with Livy Renata (Indonesian celeb, ~4.5M follower main accounts) — those big numbers were mistakenly applied in mig 046 + mig 047 and are reverted here. REMUNDO is a separate person.',
  updated_at        = now()
WHERE id = 108;

INSERT INTO public.audit_log (actor_email, actor_kind, action, entity_type, entity_id, diff, created_at)
VALUES (
  'abdghazzawi1@gmail.com', 'ai', 'remundo_revert', 'player', 108,
  jsonb_build_object(
    'migration','050',
    'reason','Mig 047 trusted dossier citation R7 over Master Extreme R115. R7 conflated REMUNDO with Livy Renata. Reverted to R115 actual row data.',
    'before', jsonb_build_object('followers_ig',3000000,'followers_yt',1200000,'followers_tiktok',3300000,'followers_fb',null),
    'after',  jsonb_build_object('followers_ig',9000,'followers_yt',4140,'followers_tiktok',6523,'followers_fb',197000)
  ), now()
);
