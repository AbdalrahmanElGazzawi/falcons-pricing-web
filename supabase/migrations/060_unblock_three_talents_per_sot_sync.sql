-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 060 — Pair-fix 3 talents per SOT sync (Nocturne, Gustav, DANXY)
-- ───────────────────────────────────────────────────────────────────────────
-- Per SOT sync of the 10 not_ready talents on 2026-05-05:
--
--   • Nocturne (id=194, Aslı Ozbey, MLBB Vega ME) — Turkish MLBB pro, no
--     individual social presence per SOT. Quote via Authority Floor.
--     Action: tag audience_market = 'EU' (Turkey routes through EU bands),
--     rate_source = 'tier_baseline'.
--
--   • Gustav (id=196, Gustav Lykke Bloend, PUBG) — Danish PUBG pro. SOT
--     confirms IG/YT/X/Twitch handles match DB. Just needs metadata tags.
--     Action: audience_market = 'EU', rate_source = 'tier_baseline'.
--
--   • DANXY (id=177, Nguyen Bao Duy, Crossfire) — Vietnamese Crossfire pro,
--     genuine no-socials case per SOT. Currently 'unverified' is too
--     aggressive for an Authority-Floor-quotable pro.
--     Action: rate_source 'unverified' → 'tier_baseline'. Keep
--     audience_market = 'APAC' (already set).
--
-- HELD FOR HUMAN REVIEW (not touched by this migration):
--   • REMUNDO (id=108) — SOT carries the contested LIV/Livy Renata socials
--     that Mig 052 explicitly cleared. SOT spreadsheet is stale on this
--     row (same lesson as Mig 054→055). Stays 'unverified'.
--   • Syrinx (id=195) — SOT has an IG handle DB doesn't (looks like
--     'horus_…'). WebSearch verification required before importing per
--     CLAUDE.md hard rule #8.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public._players_snapshot_2026_05_05_pre_060 as
select * from public.players where id in (177, 194, 196);

-- Nocturne — assign EU market + tier_baseline
update public.players set
  audience_market = 'EU',
  rate_source = 'tier_baseline',
  audience_data_updated_at = now(),
  notes = coalesce(notes, '') || E'\n[2026-05-05 sot sync] Mig 060: tagged EU + tier_baseline. Turkish MLBB pro, no individual socials per SOT — quote via Authority Floor.',
  updated_at = now()
where id = 194;

-- Gustav — assign EU market + tier_baseline
update public.players set
  audience_market = 'EU',
  rate_source = 'tier_baseline',
  audience_data_updated_at = now(),
  notes = coalesce(notes, '') || E'\n[2026-05-05 sot sync] Mig 060: tagged EU + tier_baseline. Danish PUBG pro, SOT confirms socials match DB.',
  updated_at = now()
where id = 196;

-- DANXY — downgrade from unverified to tier_baseline
update public.players set
  rate_source = 'tier_baseline',
  audience_data_updated_at = now(),
  notes = coalesce(notes, '') || E'\n[2026-05-05 sot sync] Mig 060: rate_source unverified → tier_baseline. SOT confirms genuine no-socials case (Vietnamese Crossfire pro). Quote via Authority Floor.',
  updated_at = now()
where id = 177;

insert into public.audit_log (actor_email, actor_kind, action, entity_type, entity_id, diff, created_at)
select 'abdghazzawi1@gmail.com', 'human', 'sot_sync_unblock', 'player', id,
       jsonb_build_object('migration','060','source','SOT spreadsheet sync 2026-05-05'),
       now()
from (values (177),(194),(196)) v(id);
