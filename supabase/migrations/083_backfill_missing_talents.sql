-- ============================================================================
-- 083_backfill_missing_talents.sql
-- Applied: 2026-05-11 via Supabase MCP.
--
-- Backfill the 8 talents that existed in the Website Esport Data Entry sheet
-- but were never ingested into the live DB. Diff surfaced during the
-- 2026-05-11 Koge×Claude session (WhatsApp×GameSir thread): "Uploaded to
-- website = FALSE" gating step never ran for these 8 talents.
--
-- 5 TFT players (CSFX, LIGhtYgo, LiShao, Serein, YGQF) — entire squad missing
-- 2 VAL Vega staff (Dav1 assistant coach, Marit manager)
-- 1 Street Fighter player (Micky — the one that started the whole thread)
--
-- Defaults applied:
--   tier_code      = 'Tier 3'
--   authority_tier = 'AT-5' for players, 'AT-0' for staff
--   archetype      = 'tournament_athlete' for players, 'grassroots_competitor' for staff
--   is_active      = true
--   rate_source    = 'tier_baseline'
--   commission     = column default (0.30)
--   floor_share    = column default (0.5)
--
-- NOTE: Micky (Chan Pak Yin) is 17 (DOB 2008-10-14). Surface in any commercial
-- deal — guardian consent path required for KSA brand activation.
-- ============================================================================

insert into public.players (
  nickname, full_name, role, game, team, nationality, date_of_birth, ingame_role,
  tier_code, archetype, authority_tier, is_active,
  x_handle, instagram, twitch, youtube, tiktok, kick, facebook,
  rate_source, notes, updated_at, created_at
) values
  ('Micky', 'Chan Pak Yin', 'Player', 'Street Fighter', 'Street Fighter',
   'China', date '2008-10-14', null,
   'Tier 3', 'tournament_athlete', 'AT-5', true,
   'https://x.com/Micky1014_', 'https://www.instagram.com/micky1014_', 'https://www.twitch.tv/micky1014_',
   null, null, null, null,
   'tier_baseline',
   'Backfill 2026-05-11. MINOR (DOB 2008) — flag for commercial activations.',
   now(), now()),
  ('CSFX', 'Junwei Zhang', 'Player', 'Teamfight Tactics', 'Team Falcons',
   'Chinese', null, null, 'Tier 3', 'tournament_athlete', 'AT-5', true,
   null, null, null, null, null, null, null, 'tier_baseline',
   'Backfill 2026-05-11. DOB missing — request from team manager.', now(), now()),
  ('LIGhtYgo', 'You Guangming', 'Coach', 'Teamfight Tactics', 'Team Falcons',
   'Chinese', date '1997-10-26', null, 'Tier 3', 'grassroots_competitor', 'AT-0', true,
   null, null, null, null, null, null, null, 'tier_baseline',
   'Backfill 2026-05-11.', now(), now()),
  ('LiShao', 'Chengyu Li', 'Player', 'Teamfight Tactics', 'Team Falcons',
   'Chinese', date '2003-05-18', null, 'Tier 3', 'tournament_athlete', 'AT-5', true,
   null, null, null, null, null, null, null, 'tier_baseline',
   'Backfill 2026-05-11.', now(), now()),
  ('Serein', 'Yuchao Qiu', 'Player', 'Teamfight Tactics', 'Team Falcons',
   'Chinese', date '1995-03-18', null, 'Tier 3', 'tournament_athlete', 'AT-5', true,
   null, null, null, null, null, null, null, 'tier_baseline',
   'Backfill 2026-05-11.', now(), now()),
  ('YGQF', 'Jie Liu', 'Player', 'Teamfight Tactics', 'Team Falcons',
   'Chinese', date '1992-10-14', null, 'Tier 3', 'tournament_athlete', 'AT-5', true,
   null, null, null, null, null, null, null, 'tier_baseline',
   'Backfill 2026-05-11.', now(), now()),
  ('Dav1', 'David Miljanić', 'Assistant Coach', 'VALORANT', 'Falcons Vega',
   'Serbian', date '1991-08-01', null, 'Tier 3', 'grassroots_competitor', 'AT-0', true,
   'https://x.com/DavtheRedfox', null, null, null, null, null, null, 'tier_baseline',
   'Backfill 2026-05-11.', now(), now()),
  ('Marit', 'Marit de Lange', 'Manager', 'VALORANT', 'Falcons Vega',
   'Dutch', date '1998-01-30', null, 'Tier 3', 'grassroots_competitor', 'AT-0', true,
   'https://x.com/m_rittt', null, null, null, null, null, null, 'tier_baseline',
   'Backfill 2026-05-11.', now(), now());
