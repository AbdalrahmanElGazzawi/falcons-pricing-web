-- Migration 007 — inbound inquiry inbox (already applied to production).
create type if not exists inquiry_type   as enum ('brand', 'press', 'partnership', 'other');
create type if not exists inquiry_status as enum ('open', 'replied', 'quoted', 'won', 'lost', 'declined');
create type if not exists inquiry_source as enum ('email', 'instagram', 'twitter', 'whatsapp', 'tiktok', 'discord', 'other');

create table if not exists public.inquiries (
  id uuid primary key default uuid_generate_v4(),
  inquiry_number text unique not null,
  source inquiry_source not null default 'email',
  source_handle text,
  brand text not null,
  agency text,
  campaign text,
  region text,
  talents text[],
  deliverables text,
  budget_hint text,
  body text,
  type inquiry_type not null default 'brand',
  status inquiry_status not null default 'open',
  owner_id uuid references public.profiles(id),
  quote_id uuid references public.quotes(id) on delete set null,
  internal_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists inquiries_status_idx on public.inquiries (status, created_at desc);
create index if not exists inquiries_type_idx on public.inquiries (type, created_at desc);

-- Auto-increment inquiry_number trigger + updated_at trigger (see prod for full DDL).
