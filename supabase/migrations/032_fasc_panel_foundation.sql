-- ============================================================================
-- Migration 032 — PR2: F/A/S/C panel foundation
--
-- Adds:
--   1. production_grades       — lookup of Standard/Enhanced/Premium/Custom
--                                grades + per-deliverable production cost
--   2. pricing_band_overrides  — audit trail of any manual override of a
--                                Floor / Anchor / Stretch / Ceiling cell.
--                                Soft-supersession (no hard delete).
--   3. view talent_pricing_inputs    — joined inputs the app needs to
--                                       compute F/A/S/C per (talent×platform).
--                                       Covers both players and creators.
--   4. view talent_campaigns_summary — aggregate of closed deals per
--                                       (talent×platform) — feeds the Anchor
--                                       "last_accepted_deal" input.
--
-- The actual F/A/S/C math runs in TS (src/lib/pricing.ts) — these views
-- only expose inputs. Keeping the math in TS gives us source attribution
-- and lets us version the formula without an SQL migration.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Production grades (Standard / Enhanced / Premium / Custom)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.production_grades (
  id          serial primary key,
  code        text unique not null check (code in ('standard','enhanced','premium','custom')),
  label       text not null,
  multiplier  numeric not null default 1.0,    -- applied to base rate at quote time
  -- Per-platform marginal production cost (SAR). Drives the Cost-Plus floor
  -- when that method wins MAX in computeFloor.
  -- Shape: { "rate_ig_reel": 2000, "rate_yt_full": 8000, ... }
  cost_per_deliverable_sar jsonb not null default '{}'::jsonb,
  description text,
  sort_order  int default 0,
  is_active   boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create trigger production_grades_touch before update on public.production_grades
  for each row execute function public.touch_updated_at();

-- Seed the four canonical grades. Costs are placeholder defaults — admins
-- maintain via /admin/production-grades editor (built in PR2 Slice 3).
insert into public.production_grades (code, label, multiplier, cost_per_deliverable_sar, description, sort_order)
values
  ('standard', 'Standard', 1.00,
   '{"rate_ig_reel":1000,"rate_ig_static":500,"rate_ig_story":300,"rate_tiktok_video":1200,"rate_yt_short":800,"rate_yt_full":4000,"rate_x_post":200,"rate_twitch_stream":2000,"rate_irl":3000}'::jsonb,
   'Talent-shot, talent-edited. No Falcons production crew on site.', 10),
  ('enhanced', 'Enhanced', 1.20,
   '{"rate_ig_reel":3000,"rate_ig_static":1500,"rate_ig_story":800,"rate_tiktok_video":3500,"rate_yt_short":2500,"rate_yt_full":12000,"rate_x_post":500,"rate_twitch_stream":5000,"rate_irl":8000}'::jsonb,
   'Falcons content team support: scripting / editing / colour pass.', 20),
  ('premium', 'Premium', 1.50,
   '{"rate_ig_reel":8000,"rate_ig_static":4000,"rate_ig_story":2000,"rate_tiktok_video":9000,"rate_yt_short":6000,"rate_yt_full":30000,"rate_x_post":1500,"rate_twitch_stream":12000,"rate_irl":18000}'::jsonb,
   'Full Falcons studio production: crew, lighting, multi-cam, post.', 30),
  ('custom', 'Custom', 1.00,
   '{}'::jsonb,
   'Negotiated per deliverable. Rates entered manually on the line item.', 99)
on conflict (code) do nothing;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Pricing band overrides — audit trail
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.pricing_band_overrides (
  id                 uuid primary key default gen_random_uuid(),
  talent_kind        text not null check (talent_kind in ('player','creator')),
  talent_id          int  not null,
  platform           text not null,                -- e.g. 'rate_ig_reel'
  band               text not null check (band in ('floor','anchor','stretch','ceiling')),
  override_value_sar numeric not null check (override_value_sar >= 0),
  reason             text,                          -- why we overrode (required by UI, optional in DB)
  effective_from     date not null default current_date,
  effective_to       date,                          -- null = open-ended
  created_by         uuid references auth.users(id),
  created_by_email   text,                          -- snapshot for audit
  created_at         timestamptz default now(),
  -- Soft-supersession: when the next override on the same cell is created,
  -- we set superseded_at on the previous one rather than deleting it.
  superseded_at      timestamptz,
  superseded_by      uuid references public.pricing_band_overrides(id)
);

create index if not exists pricing_band_overrides_active_idx
  on public.pricing_band_overrides (talent_kind, talent_id, platform, band)
  where superseded_at is null;
create index if not exists pricing_band_overrides_audit_idx
  on public.pricing_band_overrides (talent_kind, talent_id, created_at desc);

-- RLS: staff read, admin write
alter table public.pricing_band_overrides enable row level security;
create policy "staff read pricing_band_overrides"
  on public.pricing_band_overrides for select using (public.is_staff());
create policy "admin write pricing_band_overrides"
  on public.pricing_band_overrides for all using (public.is_admin());

alter table public.production_grades enable row level security;
create policy "staff read production_grades"
  on public.production_grades for select using (public.is_staff());
create policy "admin write production_grades"
  on public.production_grades for all using (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- 3. View talent_pricing_inputs — joined data for the F/A/S/C compute
--    Returns one row per (talent_kind, talent_id) with everything the
--    app-side compute needs in a single fetch. The app then iterates
--    platforms and runs computeFloor/Anchor/Stretch/Ceiling.
-- ─────────────────────────────────────────────────────────────────────────
create or replace view public.talent_pricing_inputs as
  select
    'player'::text as talent_kind,
    p.id as talent_id,
    p.nickname,
    p.tier_code,
    p.game,
    p.audience_market,
    p.data_completeness,
    p.commission, p.markup, p.floor_share, p.authority_factor,
    p.default_seasonality, p.default_language,
    p.achievement_decay_factor,
    p.min_rates,
    -- Internal rate card (subset that has F/A/S/C bands)
    jsonb_strip_nulls(jsonb_build_object(
      'rate_ig_reel',       p.rate_ig_reel,
      'rate_ig_static',     p.rate_ig_static,
      'rate_ig_story',      p.rate_ig_story,
      'rate_tiktok_video',  p.rate_tiktok_video,
      'rate_yt_short',      p.rate_yt_short,
      'rate_x_post',        p.rate_x_post,
      'rate_twitch_stream', p.rate_twitch_stream,
      'rate_twitch_integ',  p.rate_twitch_integ,
      'rate_irl',           p.rate_irl
    )) as internal_rates
  from public.players p
  where p.is_active
union all
  select
    'creator'::text as talent_kind,
    c.id as talent_id,
    c.nickname,
    c.tier_code,
    null::text as game,
    c.audience_market,
    c.data_completeness,
    null::numeric as commission, null::numeric as markup,
    null::numeric as floor_share, null::numeric as authority_factor,
    null::numeric as default_seasonality, null::numeric as default_language,
    null::numeric as achievement_decay_factor,
    null::jsonb as min_rates,
    jsonb_strip_nulls(jsonb_build_object(
      'rate_ig_post',         c.rate_ig_post,
      'rate_ig_story',        c.rate_ig_story,
      'rate_ig_reels',        c.rate_ig_reels,
      'rate_yt_full',         c.rate_yt_full,
      'rate_yt_shorts',       c.rate_yt_shorts,
      'rate_tiktok_ours',     c.rate_tiktok_ours,
      'rate_x_post_quote',    c.rate_x_post_quote,
      'rate_twitch_kick_live',c.rate_twitch_kick_live
    )) as internal_rates
  from public.creators c
  where c.is_active;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. View talent_campaigns_summary — aggregate of closed deals
--    Drives the Anchor "last_accepted_deal" input to computeFloor.
-- ─────────────────────────────────────────────────────────────────────────
create or replace view public.talent_campaigns_summary as
select
  'player'::text as talent_kind,
  s.player_id   as talent_id,
  s.platform,
  count(*)                                  as deal_count,
  round(avg(s.amount_sar))::numeric         as avg_sar,
  max(s.amount_sar)::numeric                as max_sar,
  (array_agg(s.amount_sar order by s.deal_date desc))[1] as last_sar,
  max(s.deal_date)                          as last_deal_date
from public.sales_log s
where s.player_id is not null
  and s.status = 'closed_won'
  and s.platform is not null
group by s.player_id, s.platform
union all
select
  'creator'::text,
  s.creator_id,
  s.platform,
  count(*),
  round(avg(s.amount_sar))::numeric,
  max(s.amount_sar)::numeric,
  (array_agg(s.amount_sar order by s.deal_date desc))[1],
  max(s.deal_date)
from public.sales_log s
where s.creator_id is not null
  and s.status = 'closed_won'
  and s.platform is not null
group by s.creator_id, s.platform;

-- View grants — staff can read both views via underlying RLS on tables.
grant select on public.talent_pricing_inputs   to authenticated;
grant select on public.talent_campaigns_summary to authenticated;
