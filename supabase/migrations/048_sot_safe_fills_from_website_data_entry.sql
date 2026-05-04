-- Migration 048: safe fills from "Website Esport Data Entry.xlsx" SOT
-- Applies only DB-blank -> SOT-has-value fills + 1 DOB fill.
-- Skips ~33 "corrections" where DB is canonical (x.com vs twitter.com,
-- login-wall URLs, /#, /videos suffix, legacy youtube.com/c/ form).
-- Skips real handle migrations (need verification) and new-player creates.
-- DB-side already applied via Supabase MCP on 2026-05-04. Repo-of-record companion.

CREATE TABLE IF NOT EXISTS public._players_snapshot_2026_05_04_pre_048 AS
SELECT id, nickname, instagram, twitch, youtube, tiktok, x_handle, facebook, kick, date_of_birth, updated_at
FROM public.players
WHERE id IN (17, 51, 61, 100, 110, 115, 134, 169, 6, 193);

UPDATE public.players SET instagram='https://www.instagram.com/Jawxd7',                                    updated_at=now() WHERE id=17  AND instagram IS NULL;        -- xizx7
UPDATE public.players SET twitch='https://www.twitch.tv/ChonFx',                                           updated_at=now() WHERE id=61  AND twitch IS NULL;           -- Shadow X
UPDATE public.players SET tiktok='https://www.tiktok.com/@kyletzyofficial3',                               updated_at=now() WHERE id=169 AND tiktok IS NULL;           -- KyleTzy
UPDATE public.players SET tiktok='https://www.tiktok.com/@names_es',                                       updated_at=now() WHERE id=100 AND tiktok IS NULL;           -- Names
UPDATE public.players SET instagram='https://www.instagram.com/putraeka672_',                              updated_at=now() WHERE id=110 AND instagram IS NULL;        -- Luckyboi
UPDATE public.players SET youtube='https://www.youtube.com/channel/UCKLTHj9SshU_IwDLO12aDSw',              updated_at=now() WHERE id=115 AND youtube IS NULL;          -- Fielder
UPDATE public.players SET youtube='https://www.youtube.com/@julioakajulio',                                updated_at=now() WHERE id=134 AND youtube IS NULL;          -- Yuzus
UPDATE public.players SET youtube='https://www.youtube.com/@pg_ghala3',                                    updated_at=now() WHERE id=6   AND youtube IS NULL;          -- Ghala
UPDATE public.players SET date_of_birth='1990-04-14',                                                       updated_at=now() WHERE id=193 AND date_of_birth IS NULL;    -- karrigan

-- Abo Ghazi (id=4) twitch fill INTENTIONALLY SKIPPED — mig 047 cleared the URL because the
-- dossier flagged it as belonging to a different user. Don't reintroduce.

INSERT INTO public.audit_log (actor_email, actor_kind, action, entity_type, entity_id, diff, created_at)
SELECT 'abdghazzawi1@gmail.com', 'ai', 'sot_fill', 'player', id,
       jsonb_build_object('migration','048','source','Website Esport Data Entry.xlsx'),
       now()
FROM public.players
WHERE id IN (17, 51, 61, 100, 110, 115, 134, 169, 6, 193)
  AND updated_at::date = now()::date;
