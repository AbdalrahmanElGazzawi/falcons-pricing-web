alter table public.quotes
  add column if not exists demo_target      text[]   default array[]::text[],
  add column if not exists gender_skew      text     check (gender_skew in ('male','female','mixed')) default 'mixed',
  add column if not exists region           text     default 'KSA',
  add column if not exists exclusivity      boolean  default false,
  add column if not exists exclusivity_months integer default 0,
  add column if not exists kpi_focus        text;

alter table public.quote_lines
  add column if not exists addon_months jsonb default '{}'::jsonb,
  add column if not exists rights_pct   numeric default 0;
