-- Track client-side engagement with shareable quote links
alter table public.quotes
  add column if not exists viewed_at timestamptz,
  add column if not exists viewed_count integer not null default 0,
  add column if not exists last_viewed_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists accepted_by_name text,
  add column if not exists accepted_by_email text,
  add column if not exists declined_at timestamptz,
  add column if not exists decline_reason text;

-- Backfill: any quote that already has a client_responded_at + 'approved' becomes accepted_at
update public.quotes
   set accepted_at = client_responded_at
 where client_response = 'approved'
   and accepted_at is null
   and client_responded_at is not null;

update public.quotes
   set declined_at = client_responded_at
 where client_response = 'rejected'
   and declined_at is null
   and client_responded_at is not null;

create index if not exists idx_quotes_client_token on public.quotes (client_token);
