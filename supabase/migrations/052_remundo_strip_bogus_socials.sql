-- Migration 052: clear REMUNDO (id=108) bogus socials
-- The dossier 5/3/2026 R115 row was a 3-way conflation: it mixed REMUNDO (Nadiya
-- Bahktita) with LIV (Olivia Benita Wijaya, livyipp YT/TT/IG) and Livy Renata
-- (Indonesian celeb, livyyrenata X / Livy Renata FB). Mig 047 + mig 050 trusted
-- those columns. None of the URLs/counts can be verified as REMUNDO's. Clear all.
-- DB-side already applied via Supabase MCP on 2026-05-04. Repo-of-record companion.

CREATE TABLE IF NOT EXISTS public._players_snapshot_2026_05_04_pre_052 AS
SELECT * FROM public.players WHERE id = 108;

UPDATE public.players SET
  instagram=NULL, followers_ig=NULL,
  youtube=NULL,   followers_yt=NULL,
  tiktok=NULL,    followers_tiktok=NULL,
  x_handle=NULL,  followers_x=NULL,
  facebook=NULL,  followers_fb=NULL,
  rate_source='unverified',
  audience_data_verified=false,
  audience_data_updated_at=now(),
  followers_data_updated_at=now(),
  pricing_rationale = 'T3 APAC tier baseline (1,620 SAR / 432 USD IG-Reel). Social data UNVERIFIED — pending manual research. The dossier 5/3/2026 R115 row had her socials conflated with two other people. Cleared until verified handles + follower counts can be sourced directly.',
  notes = COALESCE(notes,'') || E'\n[2026-05-04] All socials cleared. Dossier row was a 3-way identity conflation. Need first-party verification of REMUNDO''s actual handles and follower counts.',
  updated_at=now()
WHERE id = 108;

INSERT INTO public.audit_log (actor_email, actor_kind, action, entity_type, entity_id, diff, created_at)
VALUES (
  'abdghazzawi1@gmail.com', 'human', 'remundo_clear_bogus_socials', 'player', 108,
  jsonb_build_object('migration','052','reason','Dossier R115 conflated REMUNDO with LIV and Livy Renata. All social URLs/counts cleared. rate_source set unverified.'),
  now()
);
