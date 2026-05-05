-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 063 — Tier 1/2/3 recalibration: lower bases + region retag
-- ───────────────────────────────────────────────────────────────────────────
-- Same Floor-First lower-base + region-retag move as Mig 061 (Tier S),
-- now applied across Tier 1/2/3. 87 GLOBAL-tagged talents retagged to
-- their actual primary audience market (NA / EU / APAC / MENA / KSA),
-- anchors lowered to band median for the new region.
--
-- Strategy (per Koge call 2026-05-05): lower base, push with multipliers.
-- Floor-First means base_rate_anchor is the MINIMUM acceptable; multipliers
-- (Authority, Country mix, Audience age, Integration depth, etc.) lift
-- quote-time price ABOVE the floor. Setting the floor at band median per
-- actual region preserves negotiation room while keeping deals closeable.
--
-- New anchors (band median per region):
--   Tier   NA       EU       APAC    KSA     MENA
--   Tier 1 15,210   12,870   9,945   6,000   5,500
--   Tier 2  9,360    7,920   6,120   3,800   3,500
--   Tier 3  5,460    4,620   3,570   2,000   1,800
--
-- 2 talents kept GLOBAL (Jon Ellis + KnoX — no nationality data).
--
-- Snapshot: public._players_snapshot_2026_05_05_pre_063
-- Audit log: 1 'tier_123_recalibration' row per retagged talent.
-- DB-side already applied via Supabase MCP. Repo-of-record companion.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public._players_snapshot_2026_05_05_pre_063 as
select * from public.players
where audience_market = 'GLOBAL' and tier_code in ('Tier 1','Tier 2','Tier 3') and is_active;

-- TIER 1
update public.players set audience_market='NA', base_rate_anchor=15210, updated_at=now(),
  notes = coalesce(notes,'') || E'\n[2026-05-05 mig 063] GLOBAL -> NA. Tier 1 NA band median.'
  where id = any(array[11,12,14,19,20,125,167,187]);

update public.players set audience_market='EU', base_rate_anchor=12870, updated_at=now(),
  notes = coalesce(notes,'') || E'\n[2026-05-05 mig 063] GLOBAL -> EU. Tier 1 EU band median.'
  where id = any(array[25,30,127,131,132,193]);

update public.players set audience_market='APAC', base_rate_anchor=9945, updated_at=now(),
  notes = coalesce(notes,'') || E'\n[2026-05-05 mig 063] GLOBAL -> APAC. Tier 1 APAC band median.'
  where id = any(array[21,115,118,120,172,185]);

update public.players set audience_market='MENA', base_rate_anchor=5500, updated_at=now(),
  notes = coalesce(notes,'') || E'\n[2026-05-05 mig 063] GLOBAL -> MENA. Tier 1 MENA band median.'
  where id = 138;

-- TIER 2
update public.players set audience_market='NA', base_rate_anchor=9360, updated_at=now(),
  notes = coalesce(notes,'') || E'\n[2026-05-05 mig 063] GLOBAL -> NA. Tier 2 NA band median.'
  where id = any(array[43,44,162]);

update public.players set audience_market='EU', base_rate_anchor=7920, updated_at=now(),
  notes = coalesce(notes,'') || E'\n[2026-05-05 mig 063] GLOBAL -> EU. Tier 2 EU band median.'
  where id = any(array[22,38,40,42]);

-- TIER 3
update public.players set audience_market='NA', base_rate_anchor=5460, updated_at=now(),
  notes = coalesce(notes,'') || E'\n[2026-05-05 mig 063] GLOBAL -> NA. Tier 3 NA band median.'
  where id = any(array[15,18,61,62,122,124,130,144,160,163,165,181]);

update public.players set audience_market='EU', base_rate_anchor=4620, updated_at=now(),
  notes = coalesce(notes,'') || E'\n[2026-05-05 mig 063] GLOBAL -> EU. Tier 3 EU band median.'
  where id = any(array[29,31,32,33,34,35,36,37,39,46,57,71,128,133,134,135,145,148,154,159,161,166,173,184,189]);

update public.players set audience_market='APAC', base_rate_anchor=3570, updated_at=now(),
  notes = coalesce(notes,'') || E'\n[2026-05-05 mig 063] GLOBAL -> APAC. Tier 3 APAC band median.'
  where id = any(array[56,59,63,64,114,116,117,119,121,147,150,151,152,182,192]);

update public.players set audience_market='KSA', base_rate_anchor=2000, updated_at=now(),
  notes = coalesce(notes,'') || E'\n[2026-05-05 mig 063] GLOBAL -> KSA. Tier 3 KSA band median.'
  where id = any(array[54,136,137,188]);

update public.players set audience_market='MENA', base_rate_anchor=1800, updated_at=now(),
  notes = coalesce(notes,'') || E'\n[2026-05-05 mig 063] GLOBAL -> MENA. Tier 3 MENA band median.'
  where id = 45;

insert into public.audit_log (actor_email, actor_kind, action, entity_type, entity_id, diff, created_at)
select 'abdghazzawi1@gmail.com', 'human', 'tier_123_recalibration', 'player', id,
       jsonb_build_object('migration','063','strategy','lower_bases_lift_with_multipliers',
                          'tier_scope','Tier 1, 2, 3 GLOBAL retag + band-median anchors'),
       now()
from public.players where audience_market in ('NA','EU','APAC','MENA','KSA')
  and tier_code in ('Tier 1','Tier 2','Tier 3') and is_active
  and id in (select id from public._players_snapshot_2026_05_05_pre_063);
