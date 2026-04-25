create type sales_status as enum (
  'in_progress',
  'waiting_for_payment',
  'payment_collected',
  'cancelled'
);

create table public.sales_log (
  id uuid primary key default uuid_generate_v4(),
  deal_date date not null,
  category text not null default 'Esports Influencer',
  talent_name text not null,
  creator_id integer references public.creators(id) on delete set null,
  player_id integer references public.players(id) on delete set null,
  brand_name text,
  description text,
  platform text,
  amount_usd numeric(12,2) default 0,
  amount_sar numeric(12,2) not null,
  total_with_vat_sar numeric(12,2) not null,
  vat_rate numeric default 0.15,
  status sales_status not null default 'in_progress',
  invoice_issued boolean not null default false,
  payment_collected boolean not null default false,
  claim_filed boolean not null default false,
  cc_pay boolean not null default false,
  quote_id uuid references public.quotes(id) on delete set null,
  attachments text[],
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sales_log_deal_date_idx on public.sales_log (deal_date desc);
create index sales_log_status_idx on public.sales_log (status);
create index sales_log_brand_idx on public.sales_log (brand_name);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

create trigger sales_log_touch_updated_at
  before update on public.sales_log
  for each row execute function public.touch_updated_at();

alter table public.sales_log enable row level security;

create policy sales_log_select_staff on public.sales_log
  for select to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin','sales','finance')
  ));

create policy sales_log_modify_staff on public.sales_log
  for all to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin','sales','finance')
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin','sales','finance')
  ));
