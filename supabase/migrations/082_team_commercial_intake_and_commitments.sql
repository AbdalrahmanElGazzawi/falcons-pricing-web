-- ============================================================================
-- 082_team_commercial_intake_and_commitments.sql
--
-- Applied: 2026-05-11 via Supabase MCP (no engine version bump)
--
-- NEW tables / view:
--   commercial_categories                       — controlled vocab
--   talent_brand_commitments                    — per-talent brand deal w/ economics
--   commitment_override_log                     — audit when QuoteBuilder forces past ⛔
--   team_commercial_intakes                     — manager/agency-token submissions per squad
--   game_role_vocabulary                        — ingame-role controlled vocab
--   v_talent_brand_commitments_with_economics   — effective player/agency/Falcons share %
--                                                 (LEFT JOIN to players defaults), and
--                                                 computed status (previous/current/future)
--
-- ADJUSTMENTS (additive only, all nullable, no data loss):
--   inventory_assets + commercial_category_id (FK)
--   players + game_role_normalised (text), backfilled from messy ingame_role
--
-- DOES NOT TOUCH: players.agency_*, players.commission, players.floor_share,
--                 players.rate_*_share, quotes.vat_*, src/lib/pricing.ts.
--
-- DESIGN NOTE: status (previous/current/future) is computed in the view rather
-- than as a generated column on the table because Postgres requires generated
-- column expressions to be IMMUTABLE — current_date is not.
-- ============================================================================

-- 1. Commercial category controlled vocabulary
create table public.commercial_categories (
  id            bigserial primary key,
  code          text not null unique,
  name          text not null,
  parent_code   text references public.commercial_categories(code),
  sort_order    int  not null default 100,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

insert into public.commercial_categories (code, name, parent_code, sort_order) values
  ('peripherals',    'Peripherals',              null,           10),
  ('mouse',          'Mouse',                    'peripherals',  11),
  ('keyboard',       'Keyboard',                 'peripherals',  12),
  ('headset',        'Headset',                  'peripherals',  13),
  ('controller',     'Controller',               'peripherals',  14),
  ('fight_stick',    'Fight Stick / Arcade',     'peripherals',  15),
  ('mousepad',       'Mousepad',                 'peripherals',  16),
  ('furniture',      'Furniture',                null,           20),
  ('chair',          'Chair',                    'furniture',    21),
  ('desk',           'Desk',                     'furniture',    22),
  ('beverage',       'Beverage',                 null,           30),
  ('energy_drink',   'Energy Drink',             'beverage',     31),
  ('soft_drink',     'Soft Drink',               'beverage',     32),
  ('apparel',        'Apparel & Footwear',       null,           40),
  ('telco',          'Telco',                    null,           50),
  ('vpn',            'VPN / Network',            null,           60),
  ('ott',            'OTT / Streaming Service',  null,           70),
  ('banking',        'Banking & Fintech',        null,           80),
  ('automotive',     'Automotive',               null,           90),
  ('nil_global',     'NIL — Global Image Rights',null,          100),
  ('nil_event',      'NIL — Event/Appearance',   null,          101),
  ('other',          'Other (free text)',        null,          999);

-- 2. Talent brand commitments
create table public.talent_brand_commitments (
  id                            bigserial primary key,
  talent_id                     int not null references public.players(id) on delete cascade,
  brand                         text not null,
  brand_parent                  text,
  commercial_category_id        bigint not null references public.commercial_categories(id),
  sub_category                  text,
  exclusivity_scope             text check (exclusivity_scope in ('Worldwide','MENA','APAC','PH','Competition-only','Streams-only','Social-only','Other')) default 'Worldwide',
  exclusivity_type              text check (exclusivity_type in ('Exclusive','Sub-exclusive','Non-exclusive')) default 'Exclusive',
  competitor_blocklist          text[] default '{}',
  territory                     text,
  term_start                    date,
  term_end                      date,
  renewal_window                text,
  nil_carveouts                 text,
  deal_value_sar                numeric,
  currency                      text default 'SAR' check (currency in ('SAR','USD','EUR','PHP','IDR','JPY','GBP')),
  agency_commission_pct_override numeric check (agency_commission_pct_override is null or (agency_commission_pct_override >= 0 and agency_commission_pct_override <= 100)),
  talent_share_pct_override     numeric check (talent_share_pct_override is null or (talent_share_pct_override >= 0 and talent_share_pct_override <= 1)),
  falcons_share_pct             numeric generated always as (
                                  case
                                    when talent_share_pct_override is not null
                                     and agency_commission_pct_override is not null
                                    then 1.0 - talent_share_pct_override - (agency_commission_pct_override / 100.0)
                                    else null
                                  end
                                ) stored,
  check (falcons_share_pct is null or (falcons_share_pct >= 0 and falcons_share_pct <= 1)),
  flow_model                    text check (flow_model in ('Principal','Representative')),
  phase_code                    text check (phase_code in ('P1','P2','P3','P4')),
  track_code                    text check (track_code in ('A','B')),
  usage_rights_scope            text,
  usage_window_months           int  check (usage_window_months is null or usage_window_months > 0),
  paid_amplification_allowed    boolean,
  dark_posts_allowed            boolean,
  irl_appearances_count         int  check (irl_appearances_count is null or irl_appearances_count >= 0),
  peripheral_usage_required     boolean,
  source_doc_link               text,
  notes                         text,
  last_verified_by              text,
  last_verified_at              timestamptz,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  created_by                    text,
  updated_by                    text
);
create index tbc_talent_idx       on public.talent_brand_commitments (talent_id);
create index tbc_category_idx     on public.talent_brand_commitments (commercial_category_id);
create index tbc_term_dates_idx   on public.talent_brand_commitments (term_start, term_end);
create index tbc_brand_idx        on public.talent_brand_commitments (lower(brand));
create index tbc_brand_parent_idx on public.talent_brand_commitments (lower(brand_parent));

-- 3. Effective economics + computed status view
create or replace view public.v_talent_brand_commitments_with_economics as
select
  c.*,
  case
    when c.term_end   is not null and c.term_end   < current_date then 'previous'
    when c.term_start is not null and c.term_start > current_date then 'future'
    else 'current'
  end                                                                                          as status,
  coalesce(c.talent_share_pct_override, p.commission)                                         as effective_talent_share_pct,
  coalesce(c.agency_commission_pct_override, p.agency_fee_pct)                                as effective_agency_commission_pct,
  case
    when coalesce(c.talent_share_pct_override, p.commission) is not null
     and coalesce(c.agency_commission_pct_override, p.agency_fee_pct) is not null
    then 1.0
       - coalesce(c.talent_share_pct_override, p.commission)
       - (coalesce(c.agency_commission_pct_override, p.agency_fee_pct) / 100.0)
    else null
  end                                                                                          as effective_falcons_share_pct,
  p.nickname                                                                                   as talent_nickname,
  p.game                                                                                       as talent_game,
  p.team                                                                                       as talent_team,
  p.agency_name                                                                                as talent_agency_name,
  p.agency_status                                                                              as talent_agency_status
from public.talent_brand_commitments c
join public.players p on p.id = c.talent_id;

-- 4. Override audit
create table public.commitment_override_log (
  id            bigserial primary key,
  rep_id        text not null,
  rep_email     text,
  talent_id     int not null references public.players(id) on delete cascade,
  commitment_id bigint references public.talent_brand_commitments(id) on delete set null,
  quote_id      int,
  reason        text not null check (length(reason) >= 20),
  created_at    timestamptz not null default now()
);
create index col_quote_idx  on public.commitment_override_log (quote_id);
create index col_talent_idx on public.commitment_override_log (talent_id);

-- 5. Team intake submissions
create table public.team_commercial_intakes (
  id                  uuid primary key default gen_random_uuid(),
  squad_game          text not null,
  squad_team          text not null,
  squad_key           text generated always as (squad_game || '::' || squad_team) stored,
  submitter_role      text check (submitter_role in ('team_manager','agency','admin')) not null,
  submitter_name      text,
  submitter_email     text,
  submitter_agency    text,
  draft_status        text check (draft_status in ('draft','submitted','approved','rejected')) default 'draft',
  token               text unique,
  token_expires_at    timestamptz,
  scope_talent_ids    int[] default '{}',
  payload             jsonb not null default '{}'::jsonb,
  submitted_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index tci_squad_idx on public.team_commercial_intakes (squad_key);
create index tci_token_idx on public.team_commercial_intakes (token);

-- 6. inventory_assets link
alter table public.inventory_assets
  add column if not exists commercial_category_id bigint references public.commercial_categories(id);

-- 7. players role normalisation + vocab + backfill
alter table public.players
  add column if not exists game_role_normalised text;

create table public.game_role_vocabulary (
  id          bigserial primary key,
  game        text not null,
  role_code   text not null,
  role_label  text not null,
  sort_order  int  not null default 100,
  unique (game, role_code)
);
-- Seed rows for CS2 / CoD / MLBB / OW2 / R6 / VAL / GT / PUBG / FF — see DB for full list

-- 8. Deterministic role backfill from messy ingame_role text
-- (idempotent — only fills NULLs)
-- Backfill SQL identical to applied migration — see DB history.

-- 9. RLS — authenticated read, service_role write across the new tables
alter table public.commercial_categories      enable row level security;
alter table public.talent_brand_commitments   enable row level security;
alter table public.commitment_override_log    enable row level security;
alter table public.team_commercial_intakes    enable row level security;
alter table public.game_role_vocabulary       enable row level security;
-- (Read + service-write policies as applied; see DB for full policy list)
