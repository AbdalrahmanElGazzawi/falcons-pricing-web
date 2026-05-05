-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 064 — Phase 3 unblocks (REMUNDO + Syrinx + TheWitty21)
-- ───────────────────────────────────────────────────────────────────────────
-- REMUNDO  (player id=108) — Liquipedia confirmed real IG @mbr.remundddd
--   (https://liquipedia.net/mobilelegends/Remund). Mig 052 cleared all
--   her socials due to LIV/Livy Renata conflation; restoring the verified
--   handle. audience_market = APAC, rate_source = tier_baseline. Followers
--   count cleared pending fresh data.
--
-- SYRINX   (player id=195) — Egyptian MLBB pro (Safa Mohamed Abdelaziz).
--   DB already has real TT 231k. Just needs metadata: audience_market =
--   MENA, rate_source = tier_baseline. The 'hor...' IG from Website Esport
--   Data Entry SOT is NOT auto-imported — pending direct verification per
--   CLAUDE.md hard rule #8 (Mig 054→055 lesson).
--
-- THEWITTY21 (creator id=16) — set rate_source = methodology_v2_with_data.
--   NOTE: This update targeted the wrong id (16 = Hamad, not TheWitty21).
--   No-op on Hamad (already methodology_v2_with_data). Mig 065 applied
--   the correct fix on id=18.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public._players_snapshot_2026_05_05_pre_064 as
select * from public.players where id in (108, 195);

update public.players set
  instagram = 'https://www.instagram.com/mbr.remundddd',
  followers_ig = null,
  audience_market = 'APAC',
  rate_source = 'tier_baseline',
  audience_data_updated_at = now(),
  notes = coalesce(notes,'') || E'\n[2026-05-05 mig 064] Liquipedia-verified IG mbr.remundddd restored. Indonesian MLBB roamer Falcons Vega. audience_market = APAC, rate_source = tier_baseline.',
  updated_at = now()
  where id = 108;

update public.players set
  audience_market = 'MENA',
  rate_source = 'tier_baseline',
  audience_data_updated_at = now(),
  notes = coalesce(notes,'') || E'\n[2026-05-05 mig 064] audience_market = MENA + rate_source = tier_baseline. Existing TT 231k verified. IG handle pending direct verification.',
  updated_at = now()
  where id = 195;

update public.creators set rate_source = 'methodology_v2_with_data' where id = 16;

insert into public.audit_log (actor_email, actor_kind, action, entity_type, entity_id, diff, created_at)
values
  ('abdghazzawi1@gmail.com','human','sot_sync_unblock','player',108,
   jsonb_build_object('migration','064','source','Liquipedia https://liquipedia.net/mobilelegends/Remund'),
   now()),
  ('abdghazzawi1@gmail.com','human','sot_sync_unblock','player',195,
   jsonb_build_object('migration','064','action','tag MENA tier_baseline'),
   now()),
  ('abdghazzawi1@gmail.com','human','set_rate_source','creator',16,
   jsonb_build_object('migration','064','note','no-op; wrong id targeted, fixed in Mig 065'),
   now());
