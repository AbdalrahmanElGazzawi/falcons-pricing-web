-- Multi-month addon duration. Effective uplift = uplift_pct × months.
alter table public.quote_addons
  add column if not exists months integer not null default 1;

alter table public.quote_addons
  add constraint quote_addons_months_positive
  check (months >= 1 and months <= 60);
