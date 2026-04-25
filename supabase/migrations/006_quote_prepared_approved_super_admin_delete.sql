-- Migration 006 — quote header gains real prepared-by / approved-by metadata,
-- and only super-admin can delete. (Already applied to production.)

alter table public.quotes
  add column if not exists prepared_by_name  text,
  add column if not exists prepared_by_email text,
  add column if not exists approved_by_name  text,
  add column if not exists approved_by_email text,
  add column if not exists approved_at       timestamptz;

drop policy if exists "admin delete quotes" on public.quotes;
create policy "super admin delete quotes" on public.quotes
  for delete using (public.is_super_admin());
