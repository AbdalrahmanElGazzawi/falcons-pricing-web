-- Migration 047: dossier-driven data drift fix
-- Talents: Abo Ghazi (id=4), LIV (id=107), REMUNDO (id=108)
-- Source: Falcons_Extreme_Roster_Dossier 5_3_2026.xlsx (Master Extreme rows 77, 115, 127 + Source Notes & Citations rows 7, 11, 138)
-- No anchor changes — anchors are tier × region post-045. Data quality only.
-- DB-side already applied via Supabase MCP on 2026-05-04. This file is the repo-of-record companion.

-- 1) Snapshot before-state for rollback
CREATE TABLE IF NOT EXISTS public._players_snapshot_2026_05_04_pre_047 AS
SELECT * FROM public.players WHERE id IN (4, 107, 108);

-- 2) Abo Ghazi (id=4) — replace handles/socials of the wrong "AbuGhazi Gaming" personality
--    with verified Mohammed Albaqami handles. Total verified social reach drops from claimed
--    millions to ~4.8k (IG iAbuGhazi 644 + X Mohxamedz 2.2k + Kick iabughazi 2k).
--    Flip rate_source from 'unverified' to 'tier_baseline' (T3 MENA floor 2,000 SAR);
--    set audience_data_verified = true. Resolves the original UNVERIFIED quote-block.
UPDATE public.players SET
  instagram                 = 'https://www.instagram.com/iAbuGhazi',
  followers_ig              = 644,
  x_handle                  = 'https://x.com/Mohxamedz',
  followers_x               = 2196,
  youtube                   = NULL,
  followers_yt              = NULL,
  tiktok                    = NULL,
  followers_tiktok          = NULL,
  twitch                    = NULL,
  followers_twitch          = NULL,
  kick                      = 'https://kick.com/iabughazi',
  followers_kick            = 2000,
  rate_source               = 'tier_baseline',
  audience_data_verified    = true,
  audience_data_updated_at  = now(),
  followers_data_updated_at = now(),
  pricing_rationale         = 'T3 MENA tier baseline (2,000 SAR / 533 USD IG-Reel). Total verified social reach ~4.8k across IG (iAbuGhazi 644), X (Mohxamedz 2.2k), Kick (iabughazi 2k). Previous DB rows had socials of a separate "AbuGhazi Gaming" Saudi YouTube creator (3.12M YT, 785k TT) — not this talent. Reach calibration not applicable; price stands at tier×region floor until reach uplift is sourced.',
  notes                     = 'Verified via Falcons_Extreme_Roster_Dossier 5_3_2026 (Master Extreme R77 + Source Notes R11). Real name Mohammed Albaqami. Prior YT/TT/IG handles (AbuGhaziGaming / abughazi_gaming / xAbuGhazi @ 9.5k) belonged to a different Saudi gaming creator with a similar name and were ingested in error during migration 046. Flagged UNVERIFIED in original SOT — now resolved.',
  updated_at                = now()
WHERE id = 4;

-- 3) REMUNDO (id=108) — keep big livyrenata-family socials (correctly identified by mig 046),
--    update full_name to reflect dossier real-name disambiguation, fix Liquipedia URL.
UPDATE public.players SET
  full_name                 = 'Nadiya Bahktita (a.k.a. Livy Renata / Olivia Benita Wijaya)',
  liquipedia_url            = 'https://liquipedia.net/mobilelegends/Remund',
  audience_data_verified    = true,
  audience_data_updated_at  = now(),
  followers_data_updated_at = now(),
  pricing_rationale         = COALESCE(pricing_rationale, '') || E'\n[2026-05-04] T3 APAC tier baseline (1,620 SAR IG-Reel). Verified ~4.5M aggregate reach across livyrenata-family accounts (IG 3M, TT 3.3M, YT 1.2M, X 346k). Mainstream Indonesian audience — reach uplift available via 9-axis stack at quote time.',
  notes                     = COALESCE(notes, '') || E'\n[2026-05-04 dossier verify] Dossier Source Notes R7 flagged real-name ambiguity: in-game roster lists "Nadiya Bahktita" but multiple sources (Wikipedia, Liquipedia, Linktree) refer to her as Olivia Benita Wijaya / Livy Renata. Keeping all three names linked. Possible duplicate with id=107 (LIV) — same real name on dossier citation but different game-roles, Liquipedia profiles, and earnings; treating as distinct until confirmed.',
  updated_at                = now()
WHERE id = 108;

-- 4) LIV (id=107) — replace stub data with dossier-verified livyipp handles.
UPDATE public.players SET
  instagram                 = 'https://www.instagram.com/livyipp',
  followers_ig              = 6411,
  tiktok                    = 'https://www.tiktok.com/@livyipp',
  followers_tiktok          = 6523,
  youtube                   = 'https://www.youtube.com/@Livyipp',
  followers_yt              = 4140,
  audience_data_verified    = true,
  audience_data_updated_at  = now(),
  followers_data_updated_at = now(),
  pricing_rationale         = 'T3 APAC tier baseline (1,620 SAR IG-Reel). Verified ~17k aggregate social reach across livyipp-family accounts (IG 6.4k, TT 6.5k, YT 4.1k). Falcons Vega ID Gold Lane MLBB player. Reach uplift not yet calibrated.',
  notes                     = COALESCE(notes, '') || E'\n[2026-05-04 dossier verify] Updated per Falcons dossier R127 + Source Notes R138 — replaced stub IG (oliviawijayas / 12k unverified) and placeholder TT handle (remundddd) with verified livyipp accounts. Possible duplicate identity with id=108 (REMUNDO) per dossier citation R7; treating as distinct until confirmed.',
  updated_at                = now()
WHERE id = 107;

-- 5) Audit log entries (actor_kind enforced to 'human' / 'ai' / 'system')
INSERT INTO public.audit_log (actor_email, actor_kind, action, entity_type, entity_id, diff, created_at)
VALUES
  ('abdghazzawi1@gmail.com', 'ai', 'dossier_drift_fix', 'player', 4,
   jsonb_build_object(
     'migration','047',
     'source','Falcons_Extreme_Roster_Dossier 5_3_2026 (Master Extreme R77, Source Notes R11)',
     'before', jsonb_build_object('rate_source','unverified','followers_yt',3120000,'followers_tiktok',784600,'followers_kick',94700,'followers_x',9514),
     'after',  jsonb_build_object('rate_source','tier_baseline','followers_yt',null,'followers_tiktok',null,'followers_kick',2000,'followers_x',2196,'followers_ig',644),
     'reason','Prior socials belonged to different "AbuGhazi Gaming" creator. Verified Mohammed Albaqami handles loaded.'
   ), now()),
  ('abdghazzawi1@gmail.com', 'ai', 'dossier_drift_fix', 'player', 108,
   jsonb_build_object(
     'migration','047',
     'source','Falcons_Extreme_Roster_Dossier 5_3_2026 (Master Extreme R115, Source Notes R7)',
     'before', jsonb_build_object('full_name','Nadiya Bahktita','liquipedia_url','https://liquipedia.net/mobilelegends/Liv','audience_data_verified',false),
     'after',  jsonb_build_object('full_name','Nadiya Bahktita (a.k.a. Livy Renata / Olivia Benita Wijaya)','liquipedia_url','https://liquipedia.net/mobilelegends/Remund','audience_data_verified',true),
     'reason','Real-name ambiguity confirmed via dossier citation. Liquipedia URL corrected.'
   ), now()),
  ('abdghazzawi1@gmail.com', 'ai', 'dossier_drift_fix', 'player', 107,
   jsonb_build_object(
     'migration','047',
     'source','Falcons_Extreme_Roster_Dossier 5_3_2026 (Master Extreme R127, Source Notes R138)',
     'before', jsonb_build_object('instagram','https://www.instagram.com/oliviawijayas','followers_ig',12000,'tiktok','remundddd','youtube',null,'followers_tiktok',null,'followers_yt',null,'audience_data_verified',false),
     'after',  jsonb_build_object('instagram','https://www.instagram.com/livyipp','followers_ig',6411,'tiktok','https://www.tiktok.com/@livyipp','youtube','https://www.youtube.com/@Livyipp','followers_tiktok',6523,'followers_yt',4140,'audience_data_verified',true),
     'reason','Replaced stub data with dossier-verified livyipp handles.'
   ), now());
