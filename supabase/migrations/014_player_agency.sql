alter table public.players
  add column if not exists agency_name text,
  add column if not exists agency_contact text,
  add column if not exists agency_status text check (agency_status in ('direct','agency','unknown')) default 'unknown';

create index if not exists players_agency_status_idx on public.players (agency_status);
