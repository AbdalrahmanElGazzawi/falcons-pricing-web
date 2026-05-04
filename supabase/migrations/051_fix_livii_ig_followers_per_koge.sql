-- Migration 051: correct Livii (id=106) IG follower count
-- Koge confirmed the dossier's 295k figure for livia.lemmuela is wrong.
-- Real count is 139k. Anchor unchanged (T3 APAC, 1,620 SAR).
-- DB-side already applied via Supabase MCP on 2026-05-04. Repo-of-record companion.

CREATE TABLE IF NOT EXISTS public._players_snapshot_2026_05_04_pre_051 AS
SELECT * FROM public.players WHERE id = 106;

UPDATE public.players SET
  followers_ig             = 139000,
  audience_data_verified   = true,
  audience_data_updated_at = now(),
  followers_data_updated_at= now(),
  pricing_rationale = 'T3 APAC tier baseline (1,620 SAR / 432 USD IG-Reel). Verified ~271k aggregate reach: IG livia.lemmuela 139k, TT 96.8k, YT LiviaLivii 35.4k. MLBB Falcons Vega ID Middle laner. Indonesian audience. Reach-aware uplift via 9-axis stack at quote time.',
  notes             = COALESCE(notes,'') || E'\n[2026-05-04 koge correction] IG followers corrected 295,000 -> 139,000. Dossier 5/3/2026 Master Extreme R116 had inflated 295k; Koge verified actual count is 139k.',
  updated_at        = now()
WHERE id = 106;

INSERT INTO public.audit_log (actor_email, actor_kind, action, entity_type, entity_id, diff, created_at)
VALUES (
  'abdghazzawi1@gmail.com', 'human', 'koge_corrected_followers', 'player', 106,
  jsonb_build_object(
    'migration','051',
    'reason','Koge verified IG follower count is 139k, not 295k as dossier R116 stated.',
    'before', jsonb_build_object('followers_ig',295000),
    'after',  jsonb_build_object('followers_ig',139000)
  ), now()
);
