-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 023 — market_bands lookup table
-- Already applied via Supabase MCP. Recorded here for repo parity.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.market_bands (
  id              uuid primary key default gen_random_uuid(),
  tier_code       text not null,
  game            text,
  audience_market text not null,
  platform        text not null,
  min_sar         numeric not null,
  median_sar      numeric not null,
  max_sar         numeric not null,
  source          text not null,
  source_url      text,
  source_notes    text,
  effective_from  date    not null default current_date,
  effective_to    date,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  created_by      uuid,
  notes           text,
  constraint market_bands_min_max_check check (min_sar <= median_sar and median_sar <= max_sar)
);
create index if not exists market_bands_lookup_idx
  on public.market_bands (tier_code, audience_market, platform, game);
create index if not exists market_bands_active_idx
  on public.market_bands (effective_to) where effective_to is null;
create unique index if not exists market_bands_active_unique
  on public.market_bands (tier_code, coalesce(game, '__universal__'), audience_market, platform)
  where effective_to is null;
create or replace function public.market_bands_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end$$;
drop trigger if exists market_bands_updated_at on public.market_bands;
create trigger market_bands_updated_at
  before update on public.market_bands
  for each row execute function public.market_bands_set_updated_at();
