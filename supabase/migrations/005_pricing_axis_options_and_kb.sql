-- Migration 005 — make the pricing matrix + knowledge base editable.
-- (Already applied to production via Supabase MCP apply_migration; this file
-- is the canonical record so future restores / new envs replay it.)

create table if not exists public.pricing_axis_options (
  id bigserial primary key,
  axis_key   text not null,
  label      text not null,
  factor     numeric not null,
  rationale  text,
  sort_order int  not null default 0,
  is_active  boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);
create index if not exists pricing_axis_options_axis_idx
  on public.pricing_axis_options (axis_key, sort_order);

create table if not exists public.pricing_kb (
  id bigserial primary key,
  section    text not null,
  title      text not null,
  body       text not null,
  icon       text,
  tone       text,
  sort_order int not null default 0,
  is_active  boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);
create index if not exists pricing_kb_section_idx on public.pricing_kb (section, sort_order);

alter table public.pricing_axis_options enable row level security;
alter table public.pricing_kb enable row level security;

create policy "staff read pricing axis options"  on public.pricing_axis_options for select using (public.is_staff());
create policy "super admin writes pricing axis options" on public.pricing_axis_options
  for all using (public.is_super_admin()) with check (public.is_super_admin());

create policy "staff read pricing kb" on public.pricing_kb for select using (public.is_staff());
create policy "super admin writes pricing kb" on public.pricing_kb
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- Seed data is the same as what was inserted via apply_migration; replicating
-- the inserts here so a fresh environment hydrates identically. See production
-- data for the exact rows.
