-- ─────────────────────────────────────────────────────────────────────────
-- Migration 003 — super-admin role helper, page_layouts, audit_log.actor_kind
--
-- Already applied to production via Supabase MCP apply_migration. This file
-- is the canonical record so future restores / new envs replay the same DDL.
-- ─────────────────────────────────────────────────────────────────────────

-- 1. is_super_admin() — only Koge for now. Email-gated; flip to a profile
--    column later if we ever need a per-user super-admin grant.
create or replace function public.is_super_admin()
returns boolean as $$
  select coalesce(
    (select email from public.profiles where id = auth.uid())
      = 'abdghazzawi1@gmail.com',
    false
  );
$$ language sql stable;

-- 2. audit_log.actor_kind — distinguish human vs ai vs system actions.
alter table public.audit_log
  add column if not exists actor_kind text not null default 'human'
  check (actor_kind in ('human', 'ai', 'system'));

create index if not exists audit_log_actor_kind_idx on public.audit_log (actor_kind);

-- 3. page_layouts — global org-wide layout, super-admin-only writes.
create table if not exists public.page_layouts (
  page text primary key,
  section_order text[] not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

alter table public.page_layouts enable row level security;

create policy "staff read layouts" on public.page_layouts
  for select using (public.is_staff());

create policy "super admin writes layouts" on public.page_layouts
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

-- Seed the /quote/new layout with the current default order.
insert into public.page_layouts (page, section_order)
values ('quote/new', array['header', 'globals', 'addons', 'lines', 'notes_totals'])
on conflict (page) do nothing;
