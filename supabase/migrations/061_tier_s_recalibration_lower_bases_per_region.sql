-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 061 — Tier S recalibration: lower bases + region retag
-- ───────────────────────────────────────────────────────────────────────────
-- Per Koge call 2026-05-05: "lower base as we mentioned then we push with
-- multipliers also". Per audit findings:
--
--   Frame A (our market_bands)     — current GLOBAL Tier S anchors at 30-33K
--                                     SAR sit 35-50% ABOVE GLOBAL band MAX.
--                                     MENA brand deal flow won't pay that.
--
--   Frame B (industry comps)        — same anchors at 30-33K SAR are at the
--                                     bottom of US Tier 1 (Cloud9 low end /
--                                     NRG mid). Conservative for global brands.
--
--   Resolution                       — MOST of our GLOBAL-tagged Tier S are
--                                     not actually GLOBAL; they're NA-pros
--                                     (American CoD/Apex/Fortnite/chess) or
--                                     EU-pros (CS2 EU scene). Re-tag them to
--                                     their actual audience market and pull
--                                     anchors to the band median for that
--                                     market. Engine multipliers (Authority,
--                                     Audience, Country-mix, etc.) lift
--                                     above the floor at quote time.
--
-- Current and new anchors (IG Reel SAR):
--   id  talent          old_market  new_market  old_anchor  new_anchor  delta
--   ──────────────────────────────────────────────────────────────────────────
--   23  Hikaru Nakamura GLOBAL      NA          33,600      23,660      -30%
--   65  Peterbot        GLOBAL      NA          32,200      23,660      -27%
--   27  m0NESY          GLOBAL      EU          32,200      20,020      -38%
--   28  NiKo            GLOBAL      EU          32,200      20,020      -38%
--   186 Clayster        GLOBAL      NA          30,800      23,660      -23%
--   50  Msdossary       MENA        KSA         30,800      30,800       0%
--   9   Cellium         GLOBAL      NA          30,800      23,660      -23%
--   51  Vejrgang        MENA        EU          30,800      20,020      -35%
--   183 ImperialHal     GLOBAL      NA          29,400      23,660      -19%
--   126 TGLTN           GLOBAL      APAC        28,000      15,470      -45%
--   168 FlapTzy         APAC        APAC        10,800      10,800       0%
--   95  Hadji           APAC        APAC        10,800      10,800       0%
--
-- Why band median (not max):
--   Floor-First (Mig 030) means base_rate_anchor is the MINIMUM acceptable.
--   Multipliers stack ABOVE — Authority (1.50× for global star), Country mix
--   (1.20×-1.40× for aligned audience), Audience age, First-look exclusivity,
--   etc. all push the quoted price UP from the floor. Setting the floor at
--   median preserves negotiation room while keeping deals closeable.
--
--   Worked example: NiKo NA→EU at 20,020 floor, then quote-time:
--     × 1.50 Authority (Global Star/Major Winner)
--     × 1.20 Country mix (40-70% aligned)
--     × 1.10 Engagement (5-7%)
--     × 1.20 Integration depth (Endorsement)
--     = 47,553 SAR per IG Reel before rights/seasonality
--   That's higher than today's 32,200 floor while being defensible to the
--   brand because each multiplier is justified by data.
--
-- Snapshot + audit:
--   public._players_snapshot_2026_05_05_pre_061 contains pre-state for
--   the 12 Tier S rows. Audit log gets one tier_s_recalibration row per id.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public._players_snapshot_2026_05_05_pre_061 as
select * from public.players where tier_code = 'Tier S' and is_active;

-- Re-tag to actual audience market (where their brands and audience actually live)
update public.players set audience_market = 'NA',
  notes = coalesce(notes,'') || E'\n[2026-05-05 mig 061] audience_market GLOBAL -> NA. American esports pro; quoted to NA brands at NA band rates.',
  updated_at = now()
  where id in (23, 65, 9, 186, 183);  -- Hikaru, Peterbot, Cellium, Clayster, ImperialHal

update public.players set audience_market = 'EU',
  notes = coalesce(notes,'') || E'\n[2026-05-05 mig 061] audience_market -> EU. European esports scene; EU band rates apply.',
  updated_at = now()
  where id in (27, 28, 51);  -- m0NESY, NiKo, Vejrgang

update public.players set audience_market = 'APAC',
  notes = coalesce(notes,'') || E'\n[2026-05-05 mig 061] audience_market GLOBAL -> APAC. Australian PUBG pro; APAC market.',
  updated_at = now()
  where id = 126;  -- TGLTN

update public.players set audience_market = 'KSA',
  notes = coalesce(notes,'') || E'\n[2026-05-05 mig 061] audience_market MENA -> KSA. Saudi national EAFC champion; KSA-primary audience.',
  updated_at = now()
  where id = 50;  -- Msdossary

-- Now lower base_rate_anchor to band median for the new region.
-- Each derived rate column gets recomputed off the new anchor via the
-- existing platform-ratio derivation in app code; we only set the anchor.
update public.players set base_rate_anchor = 23660,
  notes = coalesce(notes,'') || E'\n[2026-05-05 mig 061] base_rate_anchor -> NA Tier S band median 23,660 SAR. Floor-First: multipliers (Authority, country-mix, integration, etc.) lift quote-time price above this floor.',
  updated_at = now()
  where id in (23, 65, 9, 186, 183);

update public.players set base_rate_anchor = 20020,
  notes = coalesce(notes,'') || E'\n[2026-05-05 mig 061] base_rate_anchor -> EU Tier S band median 20,020 SAR. Floor-First: multipliers do the lifting at quote time.',
  updated_at = now()
  where id in (27, 28, 51);

update public.players set base_rate_anchor = 15470,
  notes = coalesce(notes,'') || E'\n[2026-05-05 mig 061] base_rate_anchor -> APAC Tier S band median 15,470 SAR.',
  updated_at = now()
  where id = 126;

-- Msdossary: KSA Tier S manual_override band median = 30,800. Anchor unchanged
-- but documented for audit clarity.
update public.players set
  notes = coalesce(notes,'') || E'\n[2026-05-05 mig 061] base_rate_anchor unchanged at 30,800 — matches KSA Tier S manual_override band median.',
  updated_at = now()
  where id = 50;

-- FlapTzy + Hadji: APAC Tier S min already 10,800, no change.

-- Audit log
insert into public.audit_log (actor_email, actor_kind, action, entity_type, entity_id, diff, created_at)
select 'abdghazzawi1@gmail.com', 'human', 'tier_s_recalibration', 'player', id,
       jsonb_build_object('migration','061','strategy','lower_bases_lift_with_multipliers',
                          'reference_frame','market_bands_median_per_actual_region'),
       now()
from (values (9),(23),(27),(28),(50),(51),(65),(95),(126),(168),(183),(186)) v(id);
