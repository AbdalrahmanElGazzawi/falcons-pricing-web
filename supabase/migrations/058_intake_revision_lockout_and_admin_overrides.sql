-- Migration 058 — Intake revision lockout + admin override columns.
-- Already applied via Supabase MCP. Recorded here for repo parity.
--
-- Policy summary:
--   First submit         → status='submitted', revision_count=0, locked_until=NULL.
--   Talent revises       → revision_count++; if =1 set locked_until=now()+3 months.
--   Locked + attempt     → API 423 Locked, surfaces unlock contact + unlock date.
--   Lock expires         → next submit allowed; resets the 3-month window.
--   Admin override       → set new min_rates, audit-logged, no lock impact.
--   Admin clear          → wipe min_rates, status='not_started', clear lock + count.
--   Admin unlock         → clear locked_until + reset revision_count=0.

alter table public.players
  add column if not exists intake_revision_count int not null default 0,
  add column if not exists intake_locked_until   timestamptz,
  add column if not exists intake_admin_override_at timestamptz,
  add column if not exists intake_admin_override_by text;

create index if not exists players_intake_locked_until_idx
  on public.players (intake_locked_until)
  where intake_locked_until is not null;
