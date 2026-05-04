-- Migration 053: clear wrong-person socials surfaced by 2026-05-04 full-roster audit
-- Cross-referenced DB vs dossier vs Website Esport Data Entry SOT. Pattern matches
-- the Abo Ghazi mig 047 case: similar-name impersonation by larger creators, plus
-- team accounts misfiled as personal handles.
-- DB-side already applied via Supabase MCP on 2026-05-04. Repo-of-record companion.

CREATE TABLE IF NOT EXISTS public._players_snapshot_2026_05_04_pre_053 AS
SELECT * FROM public.players WHERE id IN (2, 4, 112, 177, 178, 195);

-- 1) Abo Najd (id=2) — same-name impersonation by K2NN8 across all platforms
UPDATE public.players SET
  instagram=NULL, followers_ig=NULL, tiktok=NULL, followers_tiktok=NULL,
  youtube=NULL,   followers_yt=NULL, x_handle=NULL, followers_x=NULL,
  twitch=NULL,    followers_twitch=NULL, kick=NULL, followers_kick=NULL,
  facebook=NULL,  followers_fb=NULL,
  rate_source='unverified', audience_data_verified=false,
  audience_data_updated_at=now(), followers_data_updated_at=now(),
  pricing_rationale='T2 MENA tier baseline — UNVERIFIED. All prior socials belonged to K2NN8 (separate Saudi creator with ~3M YT, similar-name confusion). Cleared until verified Riyad Alfahmi handles can be sourced directly.',
  notes = COALESCE(notes,'') || E'\n[2026-05-04 audit] All socials cleared. k2nn8 handles belong to K2NN8 — not Riyad Alfahmi. Same pattern as Abo Ghazi.',
  updated_at=now()
WHERE id = 2;

-- 2) Abo Ghazi (id=4) — FB missed by mig 047
UPDATE public.players SET
  facebook=NULL, followers_fb=NULL,
  audience_data_updated_at=now(), followers_data_updated_at=now(),
  notes = COALESCE(notes,'') || E'\n[2026-05-04 audit] FB cleared — abughazigaming93/1.5M (exactly round) was the wrong AbuGhazi Gaming account, missed by mig 047 which only cleared YT/TT/IG.',
  updated_at=now()
WHERE id = 4;

-- 3) DANXY (id=177) — team accounts + random handle
UPDATE public.players SET
  instagram=NULL, followers_ig=NULL,
  x_handle=NULL,  followers_x=NULL,
  facebook=NULL,  followers_fb=NULL,
  rate_source='unverified', audience_data_verified=false,
  audience_data_updated_at=now(), followers_data_updated_at=now(),
  pricing_rationale='T4 APAC tier baseline — UNVERIFIED. All prior socials were team accounts (teamfalconsgg/falconsesport) or random unrelated handles (wolfempirecf).',
  notes = COALESCE(notes,'') || E'\n[2026-05-04 audit] IG/X/FB cleared — all were team or random handles, not Nguyen Bao Duy''s.',
  updated_at=now()
WHERE id = 177;

-- 4) LDX (id=178) — random/team accounts on TT/FB
UPDATE public.players SET
  tiktok=NULL, followers_tiktok=NULL, facebook=NULL, followers_fb=NULL,
  audience_data_updated_at=now(), followers_data_updated_at=now(),
  notes = COALESCE(notes,'') || E'\n[2026-05-04 audit] TT (dotkichvtconline) and FB (teamfalcongg) cleared — random/team accounts, not Luong Duc Tuan''s.',
  updated_at=now()
WHERE id = 178;

-- 5) Ren (id=112) — Falcons PH team FB misfiled as personal
UPDATE public.players SET
  facebook=NULL, followers_fb=NULL,
  audience_data_updated_at=now(), followers_data_updated_at=now(),
  notes = COALESCE(notes,'') || E'\n[2026-05-04 audit] FB cleared — teamfalconsph is the Falcons PH team account, not Daren Paul Vitug''s personal FB.',
  updated_at=now()
WHERE id = 112;

-- 6) Syrinx (id=195) — misfiled IG (was Velvet's per dossier+SOT)
UPDATE public.players SET
  instagram=NULL, followers_ig=NULL,
  audience_data_updated_at=now(), followers_data_updated_at=now(),
  notes = COALESCE(notes,'') || E'\n[2026-05-04 audit] IG (_syylustforlife) cleared — dossier+SOT both pointed to horrible.velvet which is actually Velvet (id=103)''s handle. Misfiled either way.',
  updated_at=now()
WHERE id = 195;

INSERT INTO public.audit_log (actor_email, actor_kind, action, entity_type, entity_id, diff, created_at)
SELECT 'abdghazzawi1@gmail.com', 'human', 'audit_clear_wrong_socials', 'player', id,
       jsonb_build_object('migration','053','source','2026-05-04 full-roster handle audit','reason','Wrong-person socials cleared.'),
       now()
FROM (VALUES (2),(4),(112),(177),(178),(195)) v(id);
