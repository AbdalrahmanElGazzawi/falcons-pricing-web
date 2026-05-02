-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 024 — creators.commission
-- Already applied via Supabase MCP. Recorded here for repo parity.
-- Mirrors public.players.commission so creators have a Falcons take %
-- field. Player cut % = 1 - commission. Default 0.30 = Falcons keeps 30%,
-- talent keeps 70% (matches the most common players value).
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.creators
  add column if not exists commission numeric not null default 0.30
    check (commission >= 0 and commission <= 1);

comment on column public.creators.commission is
  'Falcons commission take as a fraction (0..1). Player cut = 1 - commission.';
