-- Migration 055: revert 5 of 8 rebrands shipped in mig 054
-- WebSearch verification 2026-05-04 showed the SOT had stale or wrong handles for
-- these talents — DB's pre-054 values were confirmed-current. Restore from snapshot.
--
--  51 Vejrgang IG   rblz_vejrgang   -> flc_vejrgang   (Falcons branded current; rblz_ is old)
--  74 LIMIT    TT   limitxstep8     -> limitxx7       (FLCN.LIMITx7, 67k, Apr 2026 active)
-- 105 Xev      TT   xev_vi          -> xev21          (no evidence either way; revert)
-- 124 Kickstart IG  ksnkickstart    -> kickstart_matt (kickstart_matt = IG; ksnkickstart = X/YT)
-- 125 Shrimzy  IG   tristannowicki  -> shrimzytv      (shrimzytv is current PUBG IG)
--
-- Kept from mig 054 (verified or no contradicting evidence):
--    2 Abo Najd K2NN8  — confirmed by Koge + WebSearch
--   21 Soka TT          — missionarysoka confirmed active
--   78 PROTETO IG       — dossier + SOT both agreed
--  104 Violet TT        — IG handle confirmed; TT may still be SOT-correct
-- DB-side already applied via Supabase MCP on 2026-05-04. Repo-of-record companion.

CREATE TABLE IF NOT EXISTS public._players_snapshot_2026_05_04_pre_055 AS
SELECT * FROM public.players WHERE id IN (51, 74, 105, 124, 125);

UPDATE public.players p SET
  instagram=s.instagram, followers_ig=s.followers_ig,
  audience_data_updated_at=now(), followers_data_updated_at=now(),
  notes = COALESCE(p.notes,'') || E'\n[2026-05-04 websearch revert] IG reverted to flc_vejrgang. WebSearch confirms current Falcons-branded IG (232k followers).',
  updated_at=now()
FROM public._players_snapshot_2026_05_04_pre_054 s
WHERE p.id=51 AND s.id=51;

UPDATE public.players p SET
  tiktok=s.tiktok, followers_tiktok=s.followers_tiktok,
  audience_data_updated_at=now(), followers_data_updated_at=now(),
  notes = COALESCE(p.notes,'') || E'\n[2026-05-04 websearch revert] TT reverted to limitxx7. FLCN.LIMITx7, 67.2k followers, Apr 2026 Falcons content.',
  updated_at=now()
FROM public._players_snapshot_2026_05_04_pre_054 s
WHERE p.id=74 AND s.id=74;

UPDATE public.players p SET
  tiktok=s.tiktok, followers_tiktok=s.followers_tiktok,
  audience_data_updated_at=now(), followers_data_updated_at=now(),
  notes = COALESCE(p.notes,'') || E'\n[2026-05-04 websearch revert] TT reverted to xev21. No evidence either way; conservative revert.',
  updated_at=now()
FROM public._players_snapshot_2026_05_04_pre_054 s
WHERE p.id=105 AND s.id=105;

UPDATE public.players p SET
  instagram=s.instagram, followers_ig=s.followers_ig,
  audience_data_updated_at=now(), followers_data_updated_at=now(),
  notes = COALESCE(p.notes,'') || E'\n[2026-05-04 websearch revert] IG reverted to kickstart_matt. ksnkickstart is his X/YT, kickstart_matt is IG.',
  updated_at=now()
FROM public._players_snapshot_2026_05_04_pre_054 s
WHERE p.id=124 AND s.id=124;

UPDATE public.players p SET
  instagram=s.instagram, followers_ig=s.followers_ig,
  audience_data_updated_at=now(), followers_data_updated_at=now(),
  notes = COALESCE(p.notes,'') || E'\n[2026-05-04 websearch revert] IG reverted to shrimzytv. WebSearch confirms current IG (4.4k, "PUBG for Team Falcons").',
  updated_at=now()
FROM public._players_snapshot_2026_05_04_pre_054 s
WHERE p.id=125 AND s.id=125;

INSERT INTO public.audit_log (actor_email, actor_kind, action, entity_type, entity_id, diff, created_at)
SELECT 'abdghazzawi1@gmail.com', 'human', 'websearch_revert_sot_rebrand', 'player', id,
       jsonb_build_object('migration','055','reason','SOT had stale/wrong handle; DB pre-054 confirmed current per WebSearch.'),
       now()
FROM (VALUES (51),(74),(105),(124),(125)) v(id);
