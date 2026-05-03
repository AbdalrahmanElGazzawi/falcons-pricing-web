-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 025 — rate_card_historical
-- Already applied via Supabase MCP. Recorded here for repo parity.
-- Stores legacy rate-card prices in SAR per platform key on both players
-- and creators. Surfaces inline on Roster so sales can defend / interrogate
-- the methodology delta on every quote.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.players  add column if not exists rate_card_historical jsonb;
alter table public.creators add column if not exists rate_card_historical jsonb;

comment on column public.players.rate_card_historical  is
  'Legacy rate-card prices in SAR per platform key. Sales surfaces the gap vs methodology rate inline.';
comment on column public.creators.rate_card_historical is
  'Legacy rate-card prices in SAR per platform key. Sales surfaces the gap vs methodology rate inline.';
