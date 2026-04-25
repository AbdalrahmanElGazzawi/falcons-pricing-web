create table public.esports_teams (
  id serial primary key,
  game text not null,
  team_name text not null,
  logo_url text,
  brand_color text,
  handle_ig text,
  handle_x text,
  handle_tiktok text,
  handle_yt text,
  handle_twitch text,
  handle_kick text,
  discord_url text,
  followers_ig integer default 0,
  followers_x integer default 0,
  followers_tiktok integer default 0,
  subscribers_yt integer default 0,
  followers_twitch integer default 0,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game)
);
create index esports_teams_game_idx on public.esports_teams (game);
create index esports_teams_active_idx on public.esports_teams (is_active);

create trigger esports_teams_touch_updated_at
  before update on public.esports_teams
  for each row execute function public.touch_updated_at();

alter table public.esports_teams enable row level security;

create policy esports_teams_select_staff on public.esports_teams
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales','finance')));

create policy esports_teams_modify_admin on public.esports_teams
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
