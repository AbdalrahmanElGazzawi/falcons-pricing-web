-- Migration 056 — agency_fee_pct on players for talent intake.
-- Already applied via Supabase MCP. Recorded here for repo parity.
--
-- Background: agency_status / agency_name / agency_contact already exist on
-- players. Talent intake form needs to capture the actual % the agency takes
-- so we can gross up the talent's submitted floor before the engine quotes it.

alter table public.players
  add column if not exists agency_fee_pct numeric(5,2);

comment on column public.players.agency_fee_pct is
  'Agency fee % declared by the talent on the intake form. Null = not represented or not declared. Range 0–50. Engine grosses up the talent floor by (1 + fee_pct/100) before showing internal min on a quote line.';

alter table public.players
  drop constraint if exists players_agency_fee_pct_range;
alter table public.players
  add constraint players_agency_fee_pct_range
  check (agency_fee_pct is null or (agency_fee_pct >= 0 and agency_fee_pct <= 50));
