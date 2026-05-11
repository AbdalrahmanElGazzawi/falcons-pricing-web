-- 084_best_practice_commercial_fields_and_agency_tokens.sql
-- Applied: 2026-05-11 via Supabase MCP. Additive only, no data loss.
--
-- BACKS the agency intake flow (/agency/[token]) by Koge 2026-05-11:
-- agency receives a token-gated URL, fills brand commitments for the players
-- they represent — data lands in talent_brand_commitments and powers the
-- QuoteBuilder collision check.
--
-- ALSO adds best-practice commercial fields per Koge's choice:
--   - Renewal optionality (ROFR / ROFN / MFN)
--   - Image-rights granularity (sublicense, AI/training, non-disparagement, morality)
--   - Talent-level hard-blocker categories
--
-- DOES NOT touch engine math. No version bump.

alter table public.talent_brand_commitments
  add column if not exists rofr               boolean,
  add column if not exists rofr_window_days   int check (rofr_window_days is null or rofr_window_days > 0),
  add column if not exists rofn               boolean,
  add column if not exists mfn                boolean,
  add column if not exists image_rights_scope text,
  add column if not exists sublicense_allowed boolean,
  add column if not exists training_data_use  boolean,
  add column if not exists non_disparagement  boolean,
  add column if not exists morality_clause    text;

alter table public.players
  add column if not exists talent_hard_blocked_categories text[] default '{}';

create table if not exists public.agency_intake_tokens (
  token            text primary key,
  agency_name      text not null,
  agency_email     text,
  scope_talent_ids int[] not null default '{}',
  expires_at       timestamptz,
  used_at          timestamptz,
  created_by       text,
  created_at       timestamptz not null default now(),
  notes            text
);
create index if not exists ait_agency_idx on public.agency_intake_tokens (lower(agency_name));

alter table public.agency_intake_tokens enable row level security;
create policy "Read agency_intake_tokens"            on public.agency_intake_tokens for select using (auth.role() in ('authenticated','service_role'));
create policy "Service writes agency_intake_tokens"  on public.agency_intake_tokens for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
