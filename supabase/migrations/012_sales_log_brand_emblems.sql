alter table public.sales_log
  add column if not exists brand_name_en text,
  add column if not exists brand_domain text,
  add column if not exists talent_name_en text;
