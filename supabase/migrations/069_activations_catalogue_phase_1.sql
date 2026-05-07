-- =============================================================================
-- Migration 069 — Activations Catalogue · Phase 1 schema
-- =============================================================================
-- Foundation for /activations (public catalogue) + /admin/activations (editor).
-- Polymorphic activations table with self-FK for nesting (canonical → library → sub).
-- Plus brief intakes table and append-only price-history audit trail.
--
-- Phase 1 ships: schema + RLS + triggers + indexes.
-- Phase 1 seed (5 canonical + 60 library = 65 SKUs) lives in migration 070.
-- v4.5/2.6 columns (F/A/S/C anchor+stretch · discount_modifiers · brand_metrics
-- · slots · category_exclusivity · proposal_shortlists table) are deferred
-- to a follow-up migration when their UI ships — premature columns are debt.
-- =============================================================================

-- ─── 1. public.activations ────────────────────────────────────────────────
create table public.activations (
  id                      uuid primary key default gen_random_uuid(),
  slug                    text unique not null,
  position                smallint not null default 0,
  kind                    text not null check (kind in ('canonical','library','sub')),

  -- Editorial copy
  name                    text not null,
  archetype_text          text,
  positioning             text,

  -- Taxonomy — every SKU tagged on five orthogonal axes
  pillar                  text not null check (pillar in (
                            'broadcast','stream','content','digital','facility',
                            'event','talent','hospitality','publisher')),
  cohorts                 text[] not null default '{mixed}',  -- subset of {players, influencers, creators, mixed}
  complexity              text not null check (complexity in (
                            'plug_and_play','managed_series','hero_moment','embedded_partnership')),
  event_anchor            text[] not null default '{Evergreen}',  -- e.g., {EWC, IEM, Worlds, Riyadh_Masters, Ramadan, Saudi_National_Day, GameWeek_Riyadh, Steam_Summer_Sale, Steam_Winter_Sale, Black_Friday, Back_to_School, Riyadh_Season, Eid, Annual, Launch_Day, Pre_Launch}
  falcons_ip              text,  -- nullable; e.g., 'falcons_podcast' | 'falcons_academy' | 'falcons_vega' | 'falcons_force' | 'falcons_invitational' | 'falcons_community_cup' | 'falcons_nest' | 'command_center' | 'beat_the_pro' | 'saudi_esports_marathon' | 'luxury_vs_budget'
  target_brand_categories text[] not null default '{}',

  -- Pricing — Phase 1 = floor + ceiling. F/A/S/C anchor/stretch deferred.
  price_floor_sar         numeric(12,2),
  price_ceiling_sar       numeric(12,2),
  pricing_term            text,  -- 'per game vertical · per season' | 'per quarter' | 'one-off' | etc.

  -- Operational effort meter — public-facing
  effort_player           smallint check (effort_player between 0 and 5),
  effort_falcons          smallint check (effort_falcons between 0 and 5),
  effort_player_label     text,
  effort_falcons_label    text,

  -- Rich content blocks
  includes                jsonb not null default '[]'::jsonb,
  roi_projections         jsonb not null default '[]'::jsonb,
  plug_and_play_assets    jsonb not null default '[]'::jsonb,
  pnp_footer              text,

  -- Imagery refs — NULL until cleared library lands
  hero_photo_path         text,
  talent_photo_paths      text[],

  -- Past activations / proof — populated as campaigns close
  case_studies            jsonb not null default '[]'::jsonb,

  -- Hierarchy + presentation
  parent_id               uuid references public.activations(id) on delete cascade,
  is_featured             boolean not null default false,

  -- Lifecycle
  status                  text not null default 'active' check (status in (
                            'active','draft','retired','coming_soon')),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

comment on table public.activations is
  'Productized brand activations catalogue. Polymorphic: canonical (5 marquee bundles), library (filterable SKUs), sub (nested under a parent). RLS: public read where status=active; staff full r+w.';

create index activations_slug_idx          on public.activations(slug);
create index activations_kind_idx          on public.activations(kind);
create index activations_pillar_idx        on public.activations(pillar);
create index activations_complexity_idx    on public.activations(complexity);
create index activations_falcons_ip_idx    on public.activations(falcons_ip);
create index activations_parent_id_idx     on public.activations(parent_id);
create index activations_status_idx        on public.activations(status);
create index activations_is_featured_idx   on public.activations(is_featured);
create index activations_cohorts_gin       on public.activations using gin (cohorts);
create index activations_event_anchor_gin  on public.activations using gin (event_anchor);

-- ─── 2. public.activation_intakes ─────────────────────────────────────────
-- Brand briefs from /activations/start-a-brief land here.
create table public.activation_intakes (
  id                      uuid primary key default gen_random_uuid(),
  brand_name              text,
  brand_email             text,
  brand_category          text,
  geography               text,                -- 'KSA' | 'GCC' | 'MENA' | 'Global'
  budget_band             text,                -- 'under_100k' | '100k_500k' | '500k_1m' | '1m_plus'
  timing_event_tie_in     text,
  available_assets        jsonb,
  matched_activation_id   uuid references public.activations(id) on delete set null,
  status                  text not null default 'new' check (status in (
                            'new','qualified','won','lost','disqualified')),
  notes                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

comment on table public.activation_intakes is
  'Brand briefs submitted via the public catalogue. Public can insert; staff can read+update.';

create index activation_intakes_status_idx          on public.activation_intakes(status);
create index activation_intakes_matched_idx         on public.activation_intakes(matched_activation_id);
create index activation_intakes_created_at_idx      on public.activation_intakes(created_at desc);

-- ─── 3. public.activation_price_history ───────────────────────────────────
-- Append-only audit trail. Every price change lands here with a reason.
create table public.activation_price_history (
  id                      uuid primary key default gen_random_uuid(),
  activation_id           uuid not null references public.activations(id) on delete cascade,
  price_floor_sar         numeric(12,2),
  price_ceiling_sar       numeric(12,2),
  reason                  text not null check (length(trim(reason)) >= 10),
  changed_by_email        text,
  changed_at              timestamptz not null default now()
);

comment on table public.activation_price_history is
  'Append-only price-change log. Reason is required (min 10 chars). Staff-only RLS.';

create index aph_activation_id_idx  on public.activation_price_history(activation_id);
create index aph_changed_at_idx     on public.activation_price_history(changed_at desc);

-- ─── 4. updated_at trigger ────────────────────────────────────────────────
create or replace function public.activations_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger activations_updated_at_trg
  before update on public.activations
  for each row execute function public.activations_set_updated_at();

create trigger activation_intakes_updated_at_trg
  before update on public.activation_intakes
  for each row execute function public.activations_set_updated_at();

-- ─── 5. Row-Level Security ────────────────────────────────────────────────
alter table public.activations             enable row level security;
alter table public.activation_intakes      enable row level security;
alter table public.activation_price_history enable row level security;

-- activations: public can read active rows · staff has full access
create policy "activations_public_read_active"
  on public.activations
  for select
  to anon, authenticated
  using (status = 'active');

create policy "activations_staff_all"
  on public.activations
  for all
  to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_active is true
      and p.role::text in ('admin','sales','finance')
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_active is true
      and p.role::text in ('admin','sales','finance')
  ));

-- intakes: anyone can submit a brief (insert) · staff can read/update everything
create policy "intakes_public_insert"
  on public.activation_intakes
  for insert
  to anon, authenticated
  with check (true);

create policy "intakes_staff_read_write"
  on public.activation_intakes
  for select using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_active is true
      and p.role::text in ('admin','sales','finance')
  ));

create policy "intakes_staff_update"
  on public.activation_intakes
  for update
  to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_active is true
      and p.role::text in ('admin','sales','finance')
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_active is true
      and p.role::text in ('admin','sales','finance')
  ));

-- price history: staff-only, both directions (no public read of pricing audit trail)
create policy "aph_staff_all"
  on public.activation_price_history
  for all
  to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_active is true
      and p.role::text in ('admin','sales','finance')
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_active is true
      and p.role::text in ('admin','sales','finance')
  ));

-- =============================================================================
-- End of migration 069
-- =============================================================================
