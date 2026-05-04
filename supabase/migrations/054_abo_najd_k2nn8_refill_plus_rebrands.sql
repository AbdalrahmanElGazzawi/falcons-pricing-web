-- Migration 054: re-fill Abo Najd's K2NN8 socials + apply 8 confirmed rebrands
-- Per Koge confirmation 2026-05-04: Abo Najd (id=2, Riyad Alfahmi) IS K2NN8.
-- Mig 053 wrongly cleared his k2nn8 handles assuming they were impersonation;
-- restoring from _players_snapshot_2026_05_04_pre_053 (no fabrication).
-- Plus 8 high-confidence rebrand handles per Website Esport Data Entry SOT.
-- HELD: REMUNDO (Koge: REMUNDO ≠ LIV — keep cleared from mig 052),
--       Syrinx (Koge unsure), Abo Ghazi twitch (dossier flagged wrong-person).
-- DB-side already applied via Supabase MCP on 2026-05-04. Repo-of-record companion.

CREATE TABLE IF NOT EXISTS public._players_snapshot_2026_05_04_pre_054 AS
SELECT * FROM public.players WHERE id IN (2, 21, 51, 74, 78, 104, 105, 124, 125);

-- Abo Najd (id=2) — restore K2NN8 socials from pre-053 snapshot
UPDATE public.players p SET
  instagram=s.instagram, followers_ig=s.followers_ig,
  tiktok=s.tiktok,       followers_tiktok=s.followers_tiktok,
  youtube=s.youtube,     followers_yt=s.followers_yt,
  x_handle=s.x_handle,   followers_x=s.followers_x,
  twitch=s.twitch,       followers_twitch=s.followers_twitch,
  rate_source='tier_baseline',
  audience_data_verified=true,
  audience_data_updated_at=now(), followers_data_updated_at=now(),
  pricing_rationale='T2 MENA tier baseline (3,800 SAR / 1,013 USD IG-Reel). Verified ~515k aggregate reach across K2NN8 accounts (IG 79k, TT 213k, YT 117k, X 46k, Twitch 61k). Per Koge confirmation 2026-05-04, Abo Najd (Riyad Alfahmi) is K2NN8.',
  notes=COALESCE(p.notes,'') || E'\n[2026-05-04 koge confirm] Abo Najd = K2NN8 confirmed. Restored socials cleared in mig 053 from _pre_053 snapshot.',
  updated_at=now()
FROM public._players_snapshot_2026_05_04_pre_053 s
WHERE p.id=2 AND s.id=2;

-- 8 SOT-confirmed handle rebrands (DB stale -> SOT current). Follower counts
-- cleared because they belonged to the OLD handle; will need re-verification.
UPDATE public.players SET tiktok='https://www.tiktok.com/@missionarysoka', followers_tiktok=NULL,
  audience_data_updated_at=now(), followers_data_updated_at=now(),
  notes=COALESCE(notes,'') || E'\n[2026-05-04 sot rebrand] TT falconsoka -> missionarysoka.',
  updated_at=now() WHERE id=21;

UPDATE public.players SET instagram='https://www.instagram.com/rblz_vejrgang', followers_ig=NULL,
  audience_data_updated_at=now(), followers_data_updated_at=now(),
  notes=COALESCE(notes,'') || E'\n[2026-05-04 sot rebrand] IG flc_vejrgang -> rblz_vejrgang (RB Leipzig branding).',
  updated_at=now() WHERE id=51;

UPDATE public.players SET tiktok='https://www.tiktok.com/@limitxstep8', followers_tiktok=NULL,
  audience_data_updated_at=now(), followers_data_updated_at=now(),
  notes=COALESCE(notes,'') || E'\n[2026-05-04 sot rebrand] TT limitxx7 -> limitxstep8.',
  updated_at=now() WHERE id=74;

UPDATE public.players SET instagram='https://www.instagram.com/protetae', followers_ig=NULL,
  audience_data_updated_at=now(), followers_data_updated_at=now(),
  notes=COALESCE(notes,'') || E'\n[2026-05-04 sot rebrand] IG proteto77 -> protetae (dossier+SOT agree).',
  updated_at=now() WHERE id=78;

UPDATE public.players SET tiktok='https://www.tiktok.com/@fajria.noviana', followers_tiktok=NULL,
  audience_data_updated_at=now(), followers_data_updated_at=now(),
  notes=COALESCE(notes,'') || E'\n[2026-05-04 sot rebrand] TT fajriaviolet -> fajria.noviana.',
  updated_at=now() WHERE id=104;

UPDATE public.players SET tiktok='https://www.tiktok.com/@xev_vi', followers_tiktok=NULL,
  audience_data_updated_at=now(), followers_data_updated_at=now(),
  notes=COALESCE(notes,'') || E'\n[2026-05-04 sot rebrand] TT xev21 -> xev_vi.',
  updated_at=now() WHERE id=105;

UPDATE public.players SET instagram='https://www.instagram.com/ksnkickstart', followers_ig=NULL,
  audience_data_updated_at=now(), followers_data_updated_at=now(),
  notes=COALESCE(notes,'') || E'\n[2026-05-04 sot rebrand] IG kickstart_matt -> ksnkickstart.',
  updated_at=now() WHERE id=124;

UPDATE public.players SET instagram='https://www.instagram.com/tristannowicki', followers_ig=NULL,
  audience_data_updated_at=now(), followers_data_updated_at=now(),
  notes=COALESCE(notes,'') || E'\n[2026-05-04 sot rebrand] IG shrimzytv -> tristannowicki.',
  updated_at=now() WHERE id=125;

INSERT INTO public.audit_log (actor_email, actor_kind, action, entity_type, entity_id, diff, created_at)
SELECT 'abdghazzawi1@gmail.com', 'human', 'sot_refill_or_rebrand', 'player', id,
       jsonb_build_object('migration','054','source','Website Esport Data Entry SOT + Koge confirmation 2026-05-04'),
       now()
FROM (VALUES (2),(21),(51),(74),(78),(104),(105),(124),(125)) v(id);
