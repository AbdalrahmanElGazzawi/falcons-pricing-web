-- Team Falcons Pricing OS — Web App schema
-- Postgres + Supabase Auth + Row Level Security (RLS)
-- Run this in Supabase SQL Editor after creating the project.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. EXTENSIONS
-- ─────────────────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────
-- 2. ENUMS
-- ─────────────────────────────────────────────────────────────────────────
create type user_role as enum ('admin', 'sales', 'finance', 'viewer');
create type quote_status as enum ('draft', 'pending_approval', 'approved', 'sent_to_client', 'client_approved', 'client_rejected', 'closed_won', 'closed_lost');
create type talent_type as enum ('player', 'creator');
create type measurement_confidence as enum ('pending', 'estimated', 'rounded', 'exact');

-- ─────────────────────────────────────────────────────────────────────────
-- 3. USERS & PROFILES
-- ─────────────────────────────────────────────────────────────────────────
-- Linked to Supabase Auth users table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  role user_role not null default 'viewer',
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 4. TIERS — pricing ladder (mirrors 04_Tier_Progression)
-- ─────────────────────────────────────────────────────────────────────────
create table public.tiers (
  id serial primary key,
  code text unique not null,                 -- "Tier S", "Tier 1"...
  label text not null,                       -- "Superstar"
  follower_threshold text,
  engagement_range text,
  audience_quality text,
  authority_signal text,
  base_fee_min numeric,
  base_fee_max numeric,
  floor_share numeric not null default 0.5,  -- for Authority Floor formula
  promotion_trigger text,
  demotion_trigger text,
  sort_order int not null default 0
);

-- ─────────────────────────────────────────────────────────────────────────
-- 5. PLAYERS — roster
-- ─────────────────────────────────────────────────────────────────────────
create table public.players (
  id serial primary key,
  nickname text not null,
  full_name text,
  role text default 'Player',
  game text,
  team text,
  nationality text,
  tier_code text references public.tiers(code),
  -- Platform rates (SAR)
  rate_ig_reel numeric default 0,
  rate_ig_static numeric default 0,
  rate_ig_story numeric default 0,
  rate_tiktok_video numeric default 0,
  rate_yt_short numeric default 0,
  rate_x_post numeric default 0,
  rate_fb_post numeric default 0,
  rate_twitch_stream numeric default 0,
  rate_twitch_integ numeric default 0,
  rate_irl numeric default 0,
  -- Commission & markup
  commission numeric default 0.30,
  markup numeric default 1.00,
  -- Axis config
  floor_share numeric default 0.5,
  authority_factor numeric default 1.0,
  default_seasonality numeric default 1.0,
  default_language numeric default 1.0,
  measurement_confidence measurement_confidence default 'pending',
  -- Socials
  x_handle text, instagram text, twitch text, youtube text,
  tiktok text, kick text, facebook text, snapchat text, link_in_bio text,
  -- Followers (filled by Shikenso later)
  followers_ig int, followers_twitch int, followers_yt int,
  followers_tiktok int, followers_x int, followers_fb int, followers_snap int,
  -- Meta
  notes text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on public.players (tier_code);
create index on public.players (nickname);

-- ─────────────────────────────────────────────────────────────────────────
-- 6. CREATORS — separate roster, different platform set
-- ─────────────────────────────────────────────────────────────────────────
create table public.creators (
  id serial primary key,
  nickname text not null,
  score numeric,
  tier_code text references public.tiers(code),
  -- Creator platform rates (SAR) — matches v1.5 shape
  rate_x_post_quote numeric default 0,
  rate_x_repost numeric default 0,
  rate_ig_post numeric default 0,
  rate_ig_story numeric default 0,
  rate_ig_reels numeric default 0,
  rate_yt_full numeric default 0,
  rate_yt_preroll numeric default 0,
  rate_yt_shorts numeric default 0,
  rate_snapchat numeric default 0,
  rate_tiktok_ours numeric default 0,
  rate_tiktok_client numeric default 0,
  rate_event_snap numeric default 0,
  rate_twitch_kick_live numeric default 0,
  rate_kick_irl numeric default 0,
  rate_telegram numeric default 0,
  notes text,
  link text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on public.creators (tier_code);

-- ─────────────────────────────────────────────────────────────────────────
-- 7. ADD-ONS (rights packages)
-- ─────────────────────────────────────────────────────────────────────────
create table public.addons (
  id serial primary key,
  label text not null,
  uplift_pct numeric not null default 0,
  description text,
  is_active boolean default true,
  sort_order int default 0
);

-- ─────────────────────────────────────────────────────────────────────────
-- 8. QUOTES
-- ─────────────────────────────────────────────────────────────────────────
create table public.quotes (
  id uuid primary key default uuid_generate_v4(),
  quote_number text unique not null,         -- QT-20260422-001
  client_name text not null,
  client_email text,
  campaign text,
  owner_id uuid references public.profiles(id),
  owner_email text,
  currency text default 'SAR',
  vat_rate numeric default 0.15,
  -- Matrix multipliers
  eng_factor numeric default 1.0,
  audience_factor numeric default 1.0,
  seasonality_factor numeric default 1.0,
  content_type_factor numeric default 1.0,
  language_factor numeric default 1.0,
  authority_factor numeric default 1.0,
  objective_weight numeric default 0.2,
  measurement_confidence measurement_confidence default 'estimated',
  -- Totals (computed)
  subtotal numeric default 0,
  addons_uplift_pct numeric default 0,
  pre_vat numeric default 0,
  vat_amount numeric default 0,
  total numeric default 0,
  -- Status
  status quote_status default 'draft',
  notes text,
  internal_notes text,
  -- Client portal
  client_token text unique default replace(uuid_generate_v4()::text, '-', ''),
  client_responded_at timestamptz,
  client_response text,
  -- Meta
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  sent_at timestamptz
);
create index on public.quotes (status);
create index on public.quotes (owner_id);
create index on public.quotes (created_at desc);
create index on public.quotes (client_token);

-- ─────────────────────────────────────────────────────────────────────────
-- 9. QUOTE LINES
-- ─────────────────────────────────────────────────────────────────────────
create table public.quote_lines (
  id uuid primary key default uuid_generate_v4(),
  quote_id uuid references public.quotes(id) on delete cascade,
  sort_order int default 0,
  talent_type talent_type not null,
  player_id int references public.players(id),
  creator_id int references public.creators(id),
  talent_name text not null,
  platform text not null,
  base_rate numeric not null,
  qty numeric default 1,
  -- Per-line overrides (optional)
  line_eng numeric,
  line_audience numeric,
  line_seasonality numeric,
  line_content_type numeric,
  line_language numeric,
  line_authority numeric,
  -- Computed
  social_price numeric default 0,
  floor_price numeric default 0,
  final_unit numeric default 0,
  final_amount numeric default 0,
  created_at timestamptz default now()
);
create index on public.quote_lines (quote_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 10. QUOTE ADD-ONS (per-quote toggles)
-- ─────────────────────────────────────────────────────────────────────────
create table public.quote_addons (
  quote_id uuid references public.quotes(id) on delete cascade,
  addon_id int references public.addons(id),
  uplift_pct numeric not null,
  primary key (quote_id, addon_id)
);

-- ─────────────────────────────────────────────────────────────────────────
-- 11. ASSUMPTIONS LOG
-- ─────────────────────────────────────────────────────────────────────────
create table public.assumptions (
  id serial primary key,
  area text not null,
  assumption text not null,
  source text,
  confidence text,
  revisit_trigger text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 12. AUDIT LOG
-- ─────────────────────────────────────────────────────────────────────────
create table public.audit_log (
  id bigserial primary key,
  actor_id uuid references public.profiles(id),
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  diff jsonb,
  created_at timestamptz default now()
);
create index on public.audit_log (entity_type, entity_id);
create index on public.audit_log (created_at desc);

-- ─────────────────────────────────────────────────────────────────────────
-- 13. AUTO-INCREMENT QUOTE NUMBER TRIGGER
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.generate_quote_number()
returns trigger as $$
declare
  seq_count int;
  date_str text;
begin
  if new.quote_number is null or new.quote_number = '' then
    date_str := to_char(now(), 'YYYYMMDD');
    select count(*) + 1 into seq_count
    from public.quotes
    where quote_number like 'QT-' || date_str || '-%';
    new.quote_number := 'QT-' || date_str || '-' || lpad(seq_count::text, 3, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger quotes_set_number
before insert on public.quotes
for each row execute function public.generate_quote_number();

-- ─────────────────────────────────────────────────────────────────────────
-- 14. UPDATED_AT AUTO-TOUCH
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger players_touch before update on public.players
  for each row execute function public.touch_updated_at();
create trigger creators_touch before update on public.creators
  for each row execute function public.touch_updated_at();
create trigger quotes_touch before update on public.quotes
  for each row execute function public.touch_updated_at();
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- 15. AUTO-CREATE PROFILE ON SIGNUP (defaults to 'viewer' — admin must promote)
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'viewer'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────
-- 16. HELPER: who am I + role
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.current_role()
returns user_role as $$
  select role from public.profiles where id = auth.uid();
$$ language sql stable;

create or replace function public.is_admin()
returns boolean as $$
  select coalesce((select role from public.profiles where id = auth.uid()) = 'admin', false);
$$ language sql stable;

create or replace function public.is_staff()
returns boolean as $$
  select coalesce((select role from public.profiles where id = auth.uid()) in ('admin','sales','finance'), false);
$$ language sql stable;

-- ─────────────────────────────────────────────────────────────────────────
-- 17. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.players enable row level security;
alter table public.creators enable row level security;
alter table public.tiers enable row level security;
alter table public.addons enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_lines enable row level security;
alter table public.quote_addons enable row level security;
alter table public.assumptions enable row level security;
alter table public.audit_log enable row level security;

-- Profiles
create policy "users can read all profiles" on public.profiles for select using (auth.uid() is not null);
create policy "users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "admins can manage profiles" on public.profiles for all using (public.is_admin());

-- Roster (players/creators/tiers/addons/assumptions)
create policy "staff read players" on public.players for select using (public.is_staff());
create policy "admin write players" on public.players for all using (public.is_admin());

create policy "staff read creators" on public.creators for select using (public.is_staff());
create policy "admin write creators" on public.creators for all using (public.is_admin());

create policy "staff read tiers" on public.tiers for select using (public.is_staff());
create policy "admin write tiers" on public.tiers for all using (public.is_admin());

create policy "staff read addons" on public.addons for select using (public.is_staff());
create policy "admin write addons" on public.addons for all using (public.is_admin());

create policy "staff read assumptions" on public.assumptions for select using (public.is_staff());
create policy "admin write assumptions" on public.assumptions for all using (public.is_admin());

-- Quotes — sales can CRUD own, admin/finance can see all
create policy "staff read all quotes" on public.quotes for select using (public.is_staff());
create policy "sales create quotes" on public.quotes for insert with check (public.current_role() in ('admin','sales','finance'));
create policy "owner or admin update" on public.quotes for update using (
  public.is_admin() or owner_id = auth.uid()
);
create policy "admin delete quotes" on public.quotes for delete using (public.is_admin());

create policy "staff read quote lines" on public.quote_lines for select using (public.is_staff());
create policy "owner or admin write lines" on public.quote_lines for all using (
  public.is_admin() or exists (select 1 from public.quotes q where q.id = quote_id and q.owner_id = auth.uid())
);

create policy "staff read quote addons" on public.quote_addons for select using (public.is_staff());
create policy "owner or admin write qa" on public.quote_addons for all using (
  public.is_admin() or exists (select 1 from public.quotes q where q.id = quote_id and q.owner_id = auth.uid())
);

create policy "admin read audit" on public.audit_log for select using (public.is_admin());

-- NOTE: client portal access goes through a service-role endpoint
-- (/api/client/[token]) that bypasses RLS. Don't grant anon SELECT here.
