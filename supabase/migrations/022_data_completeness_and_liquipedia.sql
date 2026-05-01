-- ═══════════════════════════════════════════════════════════════════════
-- Migration 022 — Data completeness flags + Liquipedia tournament fields
-- ═══════════════════════════════════════════════════════════════════════
-- Reframes the methodology away from "waiting for Shikenso" toward
-- "what data do we actually have today, per talent". Three realities the
-- builder must handle:
--
--   (a) Some talents have full socials AND tournament records (e.g. m0NESY,
--       NiKo) — Liquipedia + manual social entry.
--   (b) Some talents have only socials (e.g. content-creator influencers
--       like FMG, BanderitaX) — no tournaments to record.
--   (c) Some talents have only tournament data and weak/no socials (e.g.
--       a coach with no public following) — Authority Floor protects them.
--   (d) Staff / brand-new signings have neither → tier_baseline + haircut.
--
-- After this migration:
--   • Every talent carries explicit has_social_data / has_tournament_data /
--     has_audience_demo booleans.
--   • A computed `data_completeness` column expresses one of four states:
--     'full' | 'socials_only' | 'tournament_only' | 'minimal'.
--   • Players gain Liquipedia integration fields. The scraper job
--     (scripts/sync-liquipedia.ts) writes prize_money_24mo_usd,
--     peak_tournament_tier, last_major_finish_date|placement, and an
--     exponentially-decayed achievement_decay_factor on a weekly cron.
--   • The /quote/new builder reads data_completeness to pre-set lever
--     defaults and lock axes that don't apply to that talent's data state.
--
-- Generated: 2026-05-01
-- Author:    Claude (drafted) · Koge (reviewed before apply)
-- Depends on: 019, 020 (rate_source taxonomy + audience_market in place)
-- ═══════════════════════════════════════════════════════════════════════

begin;

-- ─── 1. data-completeness booleans on players + creators ────────────────
alter table public.players
  add column if not exists has_social_data    boolean not null default false,
  add column if not exists has_tournament_data boolean not null default false,
  add column if not exists has_audience_demo  boolean not null default false,
  add column if not exists data_completeness  text;

alter table public.creators
  add column if not exists has_social_data    boolean not null default false,
  add column if not exists has_audience_demo  boolean not null default false,
  add column if not exists data_completeness  text;

-- Constraints — same enum on both tables. Creators don't have a
-- 'tournament_only' option (no tournament data model for them).
alter table public.players  drop constraint if exists chk_player_data_completeness;
alter table public.players  add  constraint chk_player_data_completeness
  check (data_completeness is null or data_completeness in
    ('full','socials_only','tournament_only','minimal'));

alter table public.creators drop constraint if exists chk_creator_data_completeness;
alter table public.creators add  constraint chk_creator_data_completeness
  check (data_completeness is null or data_completeness in
    ('full','socials_only','minimal'));

create index if not exists idx_players_data_completeness  on public.players  (data_completeness);
create index if not exists idx_creators_data_completeness on public.creators (data_completeness);

-- ─── 2. Liquipedia + tournament fields (players only) ───────────────────
alter table public.players
  add column if not exists liquipedia_url           text,
  add column if not exists liquipedia_synced_at     timestamptz,
  add column if not exists prize_money_24mo_usd     numeric not null default 0,
  add column if not exists peak_tournament_tier     text,
  add column if not exists current_ranking          text,
  add column if not exists last_major_finish_date   date,
  add column if not exists last_major_placement     text,
  add column if not exists achievement_decay_factor numeric not null default 1.0;

alter table public.players drop constraint if exists chk_player_peak_tier;
alter table public.players add  constraint chk_player_peak_tier
  check (peak_tournament_tier is null or peak_tournament_tier in
    ('S','A','B','C','unrated'));

alter table public.players drop constraint if exists chk_player_decay_factor;
alter table public.players add  constraint chk_player_decay_factor
  check (achievement_decay_factor between 0 and 1.5);

-- ─── 3. Backfill: derive has_social_data and data_completeness ──────────
-- has_social_data := any follower count > 0 OR any social handle filled in.
update public.players p
   set has_social_data = (
        coalesce(p.followers_ig,0)      > 0 or
        coalesce(p.followers_x,0)       > 0 or
        coalesce(p.followers_tiktok,0)  > 0 or
        coalesce(p.followers_yt,0)      > 0 or
        coalesce(p.followers_twitch,0)  > 0 or
        coalesce(p.followers_fb,0)      > 0 or
        coalesce(p.followers_snap,0)    > 0 or
        nullif(p.instagram,'')   is not null or
        nullif(p.x_handle,'')    is not null or
        nullif(p.tiktok,'')      is not null or
        nullif(p.youtube,'')     is not null or
        nullif(p.twitch,'')      is not null
   );

update public.creators c
   set has_social_data = (nullif(c.link,'') is not null);

-- has_tournament_data: leave false at first run. The Liquipedia scraper
-- flips it to true once it lands a successful sync. If an admin pastes a
-- liquipedia_url manually but the scraper hasn't run yet, treat that as
-- "data pending" — has_tournament_data stays false until the scraper
-- writes prize_money_24mo_usd > 0 OR last_major_finish_date is set.

-- Compute data_completeness from the booleans + role.
-- Coaches/managers/analysts who have no socials and no tournament data
-- but ARE a valid talent → 'minimal' (NOT null), so the builder treats
-- them as "tier_baseline only, no axis premiums".
update public.players set data_completeness = case
  when has_social_data and has_tournament_data then 'full'
  when has_social_data and not has_tournament_data then 'socials_only'
  when not has_social_data and has_tournament_data then 'tournament_only'
  else 'minimal'
end;

update public.creators set data_completeness = case
  when has_social_data then 'socials_only'
  else 'minimal'
end;

-- ─── 4. Refresh the methodology KB to reflect what's actually shipping ──
-- Restructures the roadmap to current reality: Shikenso isn't integrated;
-- Liquipedia is the active tournament-data source; the F/A/S/C audit panel
-- and talent self-service dashboard are explicitly committed; Phase 1
-- (Hourly Rate, requires salaries we don't have) is retired; Phases 2 + 6
-- are reshaped from prestige-only to universal Floor inputs.
--
-- Idempotency: every UPDATE matches by exact title; every INSERT is guarded
-- by a NOT EXISTS check so re-running this migration is safe.

-- ─── 4a. Deactivate stale entries ───────────────────────────────────────
update public.pricing_kb set is_active = false
 where section = 'roadmap'
   and title in (
     'State 2 — Q2 2026 · Shikenso Integration (ramping)',
     'Phase 1 — Q3 2026 · Hourly Rate Integration'
   );

-- ─── 4b. Update existing entries that we keep (rewording) ───────────────
-- State 3 — drop Shikenso assumption, reframe around Liquipedia + talent dashboard.
update public.pricing_kb set body =
'Operational rhythm:
• Mon 03:00 SAR — Liquipedia sync runs. Tournament data refreshes for all active players with a liquipedia_url. Per-player decay factors recomputed on a 12-month half-life.
• Mon AM — admin reviews any pending pricing-band overrides flagged by the F/A/S/C audit panel. Rate changes from data drift surface here.
• Tue — commercial approves changes in batch. Variance Register entries from prior week reviewed for clusters.
• Quarterly — peer rate-card refresh. market_bands recalibrated against latest FaZe / Cloud9 / 100T / T1 / G2 / NRG public references.
• Annually — tier baseline calibration review against fresh industry benchmarks (Newzoo, Nielsen, Influencity).

The engine is alive. Every rate has a source, every change is logged, every quote is defensible against a documented methodology — not a negotiation memory.

Future enhancement: Shikenso integration unlocks live engagement + audience demographic feeds. No committed date.'
 where section = 'roadmap' and title = 'State 3 — Q3 2026 · Steady-State Operations';

-- Phase 2 — reshape from "Falcons-provides-production with markup" to
-- "production cost as Floor input on every quote line."
update public.pricing_kb set body =
'Production cost is a Floor input on every quote line, not a separate add-on.

A new production_grades lookup carries 4 bands — Standard / Enhanced / Premium / Custom — with per-deliverable cost amounts (sourced from MENA agency rate cards). Sales picks the grade per line; the engine reads the cost into the Floor calculation.

Floor = MAX(stated_minimum × 0.95, last_accepted × 0.95, production_cost_band, industry_floor_for_tier_game_region).

A deal can never quote below Floor. Visible to brand on the quote PDF as itemised production component when applicable.'
 where section = 'roadmap' and title = 'Phase 2 — Q4 2026 · Production Cost Pass-Through';

-- Phase 6 — reshape from "prestige campaigns over SAR 500K" to universal.
update public.pricing_kb set body =
'Cost-Plus methodology is universal, not prestige-only. Every quote line computes a Cost-Plus Floor as one of the inputs to the band Floor.

Cost stack per deliverable (for current scope, agency cuts and Falcons margin requirements deferred — see roadmap notes):
• Production cost (Standard / Enhanced / Premium / Custom)
• Falcons account-management overhead (~10% of gross, when scoped)
• Margin requirement (~15-25%, when scoped)

For now the Cost-Plus Floor reduces to production cost only. As contractual splits and margin requirements are introduced in later phases, the cost stack expands.

Surfaced on the quote PDF as a defence layer: when a brand pushes back on price, sales can show the cost stack and ask which line item to renegotiate.'
 where section = 'roadmap' and title = 'Phase 6 — 2027+ · Cost-Plus Model for Branded Content';

-- ─── 4c. Insert new entries (NOT EXISTS guards for idempotency) ─────────

-- Sort 5 — Player data audit
insert into public.pricing_kb (section, title, body, icon, tone, sort_order, is_active)
select 'roadmap', 'Player data audit — current state',
'What every player profile carries today:

• Identity: nickname · full name · role · game · team · nationality · DOB · in-game role · avatar
• Tier: tier_code (S / 1 / 2 / 3 / 4)
• Per-platform rates: 16+ deliverable columns (IG, TikTok, X, YT, Twitch, IRL, etc.)
• Pricing factors: commission · markup · floor_share · authority_factor · default_seasonality · default_language
• Socials: handles + manual follower counts per platform
• Agency: status (direct/agency/unknown) + agency_name + agency_contact
• Data state (after Migration 022): has_social_data · has_tournament_data · has_audience_demo · data_completeness flag
• Tournament & achievements (after Migration 022): liquipedia_url + prize_money_24mo_usd + peak_tournament_tier + last_major_finish_date + last_major_placement + achievement_decay_factor

Data still to acquire per player:

1. Stated minimum per platform — talent walk-away. Self-input via /talent dashboard (future state).
2. Liquipedia URL — needed for tournament data feed. Admin enters per player.
3. Falcons commission split — currently single column; needs split into inbound/outbound origination.
4. Player external agency cut % — for talent with personal management beyond Falcons.
5. Brand category constraints — what each player will/won''t endorse.
6. Calendar capacity — how many deals per quarter the player accepts.
7. Recent inbound brief count — demand signal, polled quarterly.
8. Engagement rate per platform — manual until Shikenso (deferred).
9. Audience demographics — manual until Shikenso (deferred).
10. Reach / view metrics — manual until Shikenso (deferred).

Items 1–7 are achievable in current quarter. Items 8–10 deferred to Shikenso integration with no committed date.', 'ClipboardList', 'navy', 5, true
where not exists (
  select 1 from public.pricing_kb
   where section='roadmap' and title='Player data audit — current state'
);

-- Sort 25 — State 2: Liquipedia + manual data ingestion
insert into public.pricing_kb (section, title, body, icon, tone, sort_order, is_active)
select 'roadmap', 'State 2 — Liquipedia + manual data ingestion (Q2 2026)',
'Replaces the previous Shikenso-ramping state. Tournament data per talent is pulled from Liquipedia weekly via the public MediaWiki API.

Per ToS the scraper:
• Throttles to 1 request / 2.1 seconds
• Identifies as Falcons OS with a contact User-Agent
• Credits Liquipedia (CC-BY-SA 3.0) on any surface displaying the data

Data ingested per player:
• prize_money_24mo_usd — exponentially decayed, 12-month half-life, rolling 24-month window
• peak_tournament_tier — S / A / B / C from Liquipedia event classification
• last_major_finish_date + last_major_placement — most recent Tier-1 / Tier-S event
• achievement_decay_factor — single multiplier (0.0–1.5) the engine reads

Workflow:
• Admin sets liquipedia_url on the player profile
• "Pull from Liquipedia" button on /admin/players/[id] for one-off sync
• Cron sync runs Mondays 03:00 SAR for all active players with a URL set

Coverage today: ~30 of 196 active players have Liquipedia profiles. Top CS2, Dota2, LoL, Valorant pros first; coaches and content-only talent skip this.

Shikenso (audience + engagement feeds) remains future work. Liquipedia stays the source of truth for tournament achievements regardless.', 'Trophy', 'green', 25, true
where not exists (
  select 1 from public.pricing_kb
   where section='roadmap' and title='State 2 — Liquipedia + manual data ingestion (Q2 2026)'
);

-- Sort 28 — State 2.5: Per-player F/A/S/C audit panel
insert into public.pricing_kb (section, title, body, icon, tone, sort_order, is_active)
select 'roadmap', 'State 2.5 — Per-player F/A/S/C audit panel (Q2 2026)',
'A new "Pricing Audit" tab on /admin/players/[id] surfaces Floor, Anchor, Stretch, and Ceiling for every platform that player offers. Every band point traces to its inputs with full source attribution. Manual override per cell with required reason note; every change written to pricing_band_overrides audit table.

Inputs feeding each band:
• Floor: stated minimum (from talent dashboard, future) · last accepted deal × 0.95 (from sales_log) · production cost band (from production_grades) · industry floor (from market_bands per tier × game × region × platform)
• Anchor: MAX of available methods — Comparable transactions / CPM-derived / CPE-derived / Authority Floor / Tier Baseline — gated on data availability per player. Calibration multipliers applied on top.
• Stretch: Anchor × premium uplift stack from rights add-ons, capped at Ceiling.
• Ceiling: market_bands ceiling for tier × game × region × platform. Calibrated quarterly from peer rate cards.

Graceful degradation: any cell can be missing inputs. Missing inputs are flagged ("CPM unavailable — awaiting Shikenso"); the cell still computes from whatever IS available. As data accumulates over phases, cells tighten and overrides reduce.

Strategic value: every player''s pricing is auditable to a number and a citation. Senior commercial validates before any quote ships. Drift becomes visible. Adjustments become surgical, not wholesale.

Ships as PR 2 directly after PR 1 (data foundation + Liquipedia).', 'ShieldCheck', 'navy', 28, true
where not exists (
  select 1 from public.pricing_kb
   where section='roadmap' and title='State 2.5 — Per-player F/A/S/C audit panel (Q2 2026)'
);

-- Sort 35 — Talent self-service benchmark dashboard
insert into public.pricing_kb (section, title, body, icon, tone, sort_order, is_active)
select 'roadmap', 'Talent self-service benchmark dashboard (Q3 2026)',
'A self-service page at /talent where each player logs in, sees their pricing position against published market data, and submits their walk-away minimum per platform.

Page sections:
1. Profile summary — tier, game, current Anchor per platform, data completeness state, "what''s missing" punch list.
2. Market benchmark — anonymized peer comparables for tier × game × region: industry floor / median / top per platform. Sourced from public peer rate cards (FaZe / Cloud9 / 100T / T1 / G2 / NRG) and aggregated Falcons closed-deal medians.
3. Your campaigns — last 12 months of closed deals from sales_log: date, platform, gross, payout, brief note.
4. Set your minimum — per-platform input; saves to player_stated_minimums with audit history. Optional reason note.
5. Data completeness checklist — actionable items that, if filled, justify higher Anchor.

Auth: new "talent" role gated to the player''s own record. Onboarding email template invites tier-1+ talent to log in once and set minimums.

Strategic value: transforms talent from price-adversary to price-partner. Reduces post-quote rejection rate. Generates a calibrated empirical Floor input the engine reads at quote time.

Ships as PR 3 after the F/A/S/C audit panel (PR 2). Estimated 2 weeks of build.', 'Users', 'amber', 35, true
where not exists (
  select 1 from public.pricing_kb
   where section='roadmap' and title='Talent self-service benchmark dashboard (Q3 2026)'
);

commit;

-- ─── Sanity checks (run after applying) ─────────────────────────────────
-- select data_completeness, count(*) from public.players  group by data_completeness order by 2 desc;
-- select data_completeness, count(*) from public.creators group by data_completeness order by 2 desc;
-- select count(*) from public.players where has_social_data;
-- select count(*) from public.players where liquipedia_url is not null;
-- select sort_order, title, is_active from public.pricing_kb where section='roadmap' order by sort_order;
