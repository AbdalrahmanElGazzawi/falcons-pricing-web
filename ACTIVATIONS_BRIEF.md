# Activations Catalogue — Handoff Brief

**Status:** Strategic direction approved by Koge. Not yet implemented.
**Date:** 2026-05-07
**Owner:** Koge (Commercial)
**Read this file FIRST** if you're starting a session to work on the
activations / packages catalogue. It captures every strategic decision
already made so we don't re-litigate them.

---

## What this is

A productized catalogue of brand activations that Falcons sells off-the-shelf
to brands. Each activation is a complete, plug-and-play campaign — brand sends
the assets, Falcons runs the activation. Replaces the per-talent-per-deliverable
quote model as the *front door* (the bespoke quote builder still exists for
custom briefs).

Think of it as Falcons' equivalent of an Xsolla productized service rack:
brand brings the brief / assets, Falcons brings the operational machinery
(talent coordination, content production, broadcast inventory, reporting).

---

## The strategic frame — operational leverage scales margin

This is the most important insight from the design conversation. **Bundles
where Falcons does the work *once* and it runs unattended are exponentially
higher margin than per-deliverable activations where players have to show
up and do something specific.**

That's the Red Bull / Monster / FaZe model. The catalogue is built around it.
Every bundle on the page surfaces an effort meter showing player effort + Falcons
effort, because low effort is a *sales tool* — brands seeing "Player effort:
zero · Team effort: setup once" understand instantly why they can scale spend
with us next year.

Don't lose this principle when implementing. The catalogue page should
visibly rank operational lift. The lower the lift, the higher the margin —
brands who understand this scale spend, brands who don't churn.

---

## The five canonical bundles

Koge defined these. Don't add new ones without his explicit ask.

### № 01 — Always-On Jersey + Broadcast
- **Archetype:** the "no excuses, sign here" SKU
- **Built for:** Insurance · Telecom · Fintech · Auto · Energy
- **What it is:** Logo on jersey + persistent broadcast lower-third for one
  game vertical (e.g. all CoD teams, all MLBB teams) for one full season.
- **Player effort:** Zero. **Falcons effort:** Setup once.
- **Price floor:** $250K–$600K USD per game vertical per season
  (~SAR 940K–2.25M). Tier scales with title viewership.

### № 02 — Mobile Amplification
- **Archetype:** the "regional product launch" SKU
- **Built for:** Cenomi · Huawei AppGallery · QSR · Retail · CPG · Mobile finance
- **What it is:** Falcons MLBB rosters across PH + ID + MENA (~25 players)
  paired with mobile-first creators. 50 social pieces + group challenge video
  + on-site event appearance + geo-targeted creative variants.
- **Player effort:** Per-piece. **Falcons effort:** Coordinated.
- **Price floor:** $150K–$300K USD per 4–6 week campaign (~SAR 560K–1.13M).

### № 03 — Performance / PC Bundle
- **Archetype:** the "low player effort, high content cadence" SKU
- **Built for:** ExitLag · peripherals · energy drinks · gaming hardware · PC components
- **What it is:** 100% Twitch-active rosters (Fortnite, Apex, FaZe Falcons,
  Riyadh Falcons, CS2, Valorant). Persistent overlay + chat command +
  monthly Performance Moment of the Week (highlight reel pulled from VODs
  by Falcons editors — players don't do anything extra) + quarterly
  player-led long-form YouTube + jersey patch.
- **Player effort:** Quarterly only. **Falcons effort:** Editor-driven.
- **Price floor:** $200K–$500K USD per quarter (~SAR 750K–1.88M).
- **Note:** This is the bundle ExitLag should be paying for — not per-player streaming deals.

### № 04 — Day-in-the-Life Content Engine
- **Archetype:** the "highest-margin product on the menu" SKU
- **Built for:** Red Bull / Monster / Prime · Lifestyle · Apparel · Watches · Travel · Hospitality
- **What it is:** 12-month embedded brand presence. 6–8 charismatic talents.
  Brand becomes a recurring fixture in monthly BTS, bootcamp footage,
  travel vlogs. Falcons produces centrally — players just live their lives.
  Marginal cost of a 14th brand showing up in B-roll is effectively zero.
- **Player effort:** Just live. **Falcons effort:** Studio-led.
- **Price floor:** $400K–$1.2M USD per brand per year (~SAR 1.5M–4.5M).
- **Top of band:** Category exclusivity — only one fintech, one energy
  drink, one apparel brand at a time.

### № 05 — Tournament Activation Pack
- **Archetype:** the "moment-driven, slot-based" SKU
- **Built for:** Tournament sponsors · Beverage · Mobile carriers · Gaming-adjacent retail
- **What it is:** Tied to specific majors (EWC, IEM, Worlds, Riyadh Masters).
  Pre-tournament hype reels + on-site interviews + post-result reaction
  content + watch-along streams from any 3 streaming-active players.
  Brands buy slots, not players.
- **Player effort:** Event-only. **Falcons effort:** Producer-led.
- **Price floor:** $75K–$200K USD per event (~SAR 280K–750K). Tier scales
  with event prestige.

---

## Sub-activations (smaller SKUs that nest under each parent)

These are the granular items I built in v2. Each one is a *child* of one of
the five parents — not a peer. The architecture: brand lands on a parent
bundle, sees "you can also add X for Y SAR" without leaving the parent's
context. Sales recommends up or down based on budget.

Examples (full list lives in v2 mockup):

- **Under № 03 Performance/PC:** Single-team trial (~SAR 95K), Quarterly long-form add-on (~SAR 62K), Game-launch tryout extension (~SAR 165K)
- **Under № 05 Tournament Pack:** Saudi Esports Marathon — Abo Najd's 14h broadcast (~SAR 385K), Tournament Victory Mention with win-or-no-fee structure (~SAR 95K), Tournament-Week Saturation across 6 talents (~SAR 520K)
- **Standalone smaller SKUs:** Persistent stream banner (SAR 12.5K), Twitch chatbot CTA (SAR 6.5K), Single branded Reel (SAR 18.5K), Story spread × 5 (SAR 62K), Falcons.gg site banner takeover (SAR 75K), Bootcamp day visit (SAR 42K)

---

## Visual direction

Three mockup iterations live in `docs/mockups/`. Open them in a browser at
full screen. Each one was a step in the design conversation — only v3 is
canonical for implementation. v1 and v2 are kept as reference for context
on *why* we landed where we did.

| File | Status | Notes |
|---|---|---|
| `docs/mockups/quote-builder-redesign.html` | Canonical | The 3-pane redesign of the existing `/quote/new` builder — left rail (config accordions) + center (deliverables canvas with line cards) + right rail (sticky running total in gold). Separate work from the activations catalogue but both ship under the same visual language. |
| `docs/mockups/bundles-v1-talent-buckets.html` | Superseded | First pass — 6 talent-bucket packages (Ramadan KSA, EWC, GCC Launch, Brand Authority, Endemic, Bespoke). Editorial / Aman-Resorts treatment. Strategic direction was wrong (talent buckets, not activation types). Visual treatment still useful as reference. |
| `docs/mockups/bundles-v2-activation-skus.html` | Reference | 24-SKU catalogue organized by activation type (Stream / Content / Event / Game IP / Bespoke). Card grid, ROI projections, plug-and-play asset spec, Adjust Prices admin gear pattern. Components are reusable; the structure was too flat (everything as peers). |
| `docs/mockups/bundles-v3-five-canonical-models.html` | **Canonical for implementation** | Five full-bleed editorial sections, each with operational-effort meter, named brand archetype, USD↔SAR pricing, plug-and-play asset checklist, ROI projections, sub-activation strip beneath. Methodology footer explains how operational leverage compounds margin. Build the live page from this. |

Visual language across all four: deep navy + cream alternating backgrounds,
Cormorant Garamond serif for headlines, Inter for body, JetBrains Mono for
numerics. Gold reserved for headline prices and Tier S accents only — when
gold appears, it means "value moment." Hairline 1px borders, 14–18px corner
radius, 22–24px padding inside cards.

---

## Proposed architecture (Xsolla-style, four layers)

### Layer 1 — Public catalogue (`/activations`)
The page brands see. Renders the five canonical bundles as full-bleed
editorial sections per v3 mockup. Each parent has a sub-activation strip
beneath. Server-rendered, fast, SEO'd, embeddable as a PDF for client decks.

### Layer 2 — Bundle detail pages (`/activations/[slug]`)
Each parent bundle gets a deeper drill-down page. Full deliverable list,
ROI methodology breakdown, past-activation case studies (when we have
them), brand brief CTA.

### Layer 3 — Brief intake flow (`/activations/start-a-brief`)
The Xsolla-style mechanic. Brand fills a smart multi-step form:
- Brand category (drives bundle recommendation)
- Geography (KSA / GCC / Global)
- Budget band
- Timing / event tie-in
- Asset types they have available

Rules engine matches brief → bundle(s) recommendation. Brand sees a
"matched bundle" page with the closest fit + customization options.
Brief lands as `bundle_intakes` row in DB and emails Koge.

### Layer 4 — Admin editor (`/admin/activations`)
Behind the existing `requireStaff` guard. Table view of all bundles,
click into any one, edit name + copy + price band + included items +
sub-activations. The "Adjust Prices · admin only" pill in v3's nav
becomes a real auth-gated state. Changes persist instantly to public page.
No code redeploy needed for copy or price changes.

---

## Database schema (proposed)

Three tables. SQL diff to be drafted at session start.

```sql
-- Parent bundles (the five canonical activations)
create table public.bundles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                    -- 'always-on-jersey-broadcast'
  position smallint not null,                   -- 1..5 ordering
  name text not null,                           -- 'Jersey + Broadcast'
  archetype_text text,                          -- 'the no-excuses-sign-here SKU'
  target_brand_categories text[],               -- ['Insurance','Telecom','Fintech',...]
  positioning text,                             -- the lead paragraph copy
  price_floor_usd numeric(10,2) not null,
  price_ceiling_usd numeric(10,2) not null,
  pricing_term text not null,                   -- 'per game vertical per season'
  effort_player smallint check (effort_player between 0 and 5),
  effort_falcons smallint check (effort_falcons between 0 and 5),
  effort_player_label text,                     -- 'None' / 'Per-piece' / 'Just live'
  effort_falcons_label text,                    -- 'Setup once' / 'Coordinated' / 'Studio-led'
  includes jsonb not null,                      -- array of {icon, body}
  roi_projections jsonb not null,               -- array of {label, value, unit, description}
  plug_and_play_assets jsonb not null,          -- array of {asset, spec}
  pnp_footer text,                              -- 'Lead time: 14 days...'
  status text default 'active',                 -- active | draft | retired
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Sub-activations that nest under a parent bundle
create table public.sub_activations (
  id uuid primary key default gen_random_uuid(),
  bundle_id uuid references public.bundles(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  price_floor_sar numeric(10,2),
  status text default 'active',
  position smallint default 0,
  created_at timestamptz default now()
);

-- Brand briefs from the intake flow
create table public.bundle_intakes (
  id uuid primary key default gen_random_uuid(),
  brand_name text,
  brand_email text,
  brand_category text,
  geography text,                               -- KSA | GCC | Global
  budget_band text,                             -- 'under_100k' | '100k_300k' | etc
  timing_event_tie_in text,
  available_assets jsonb,
  matched_bundle_id uuid references public.bundles(id),
  status text default 'new',                    -- new | qualified | won | lost
  notes text,
  created_at timestamptz default now()
);

-- Versioned price overrides — admin "Adjust Prices" history
create table public.bundle_price_history (
  id uuid primary key default gen_random_uuid(),
  bundle_id uuid references public.bundles(id) on delete cascade,
  price_floor_usd numeric(10,2),
  price_ceiling_usd numeric(10,2),
  reason text,
  changed_by_email text,
  changed_at timestamptz default now()
);
```

Seed migration populates the five canonical bundles + ~12 sub-activations
from the v3 mockup data. Numbers can be edited via `/admin/activations`
after that — DB is the source of truth, mockup HTML is reference.

---

## The "Adjust Prices" admin pattern

Every bundle card on the public page has two icons in the top-right:
a bookmark (save for later, public-facing) and a gold gear (admin only).
The gear is gated by an "Admin · prices unlocked" pill in the top nav.
When that pill is showing (because the user is logged in as staff), gears
appear. When it's not, they don't render. Brand visitors never see them.

Click a gear → opens a side sheet with:
- Price floor / ceiling editable
- Reason text field (required, ≥10 chars)
- Save → writes to `bundle_price_history` + updates `bundles` row
- Audit trail visible in the sheet showing past changes

Same pattern as the variance register I scoped earlier (which Koge
deferred). Append-only history, defensibility for management.

---

## Phased rollout

**Phase 1 — Foundation (3–4 days).** Migration with the four tables.
Seed the five canonical bundles + ~12 sub-activations. `/admin/activations`
editor page (Falcons staff only) — list view + editor for each bundle.
Internal-only at this stage; nothing public yet. Koge can edit copy +
prices without redeploys from this point.

**Phase 2 — Public catalogue (3–4 days).** `/activations` page reading
from DB. `/activations/[slug]` detail pages for each bundle. Static-
generated, fast, SEO'd. "Adjust Prices" gear visible only when staff
is logged in.

**Phase 3 — Intake flow (5–6 days).** `/activations/start-a-brief` form,
multi-step. Rules engine for bundle matching. Brief lands as
`bundle_intakes` row + emails Koge.

**Phase 4 — Quote-builder integration (~2 days).** "From a bundle" CTA
on `/quote/new` — sales picks bundle → quote pre-populates with the
bundle's deliverables. Quote tracks `from_bundle_id` for attribution.
Bundle becomes a starting template; sales tweaks per client.

**Phase 5 — Reporting close-the-loop (later).** Each completed campaign
reports back actual delivered metrics. "Past activations" public showcase
("This bundle delivered X for client Y") becomes case studies that drive
the next sale.

---

## Open decisions Koge needs to call before Phase 1 starts

1. **Pricing — defensible at the v3 numbers, or adjust?** The USD ranges
   came from Koge's own list. Verify they hold for the actual MENA market
   before they go public.
2. **Image strategy.** v3 uses abstract gradients + monogram orbs because
   I can't generate Falcons photography. Live page will look exponentially
   better with cleared headshots from squad shoots, training facility B-roll,
   stage shots. If there's a media drive of cleared assets, point at it.
   If not, ship Phase 1/2 with the abstract treatment and swap in real
   assets later.
3. **Hosting.** Lives at `/activations` on the main app, or its own
   subdomain (`activations.falcons.gg`)? Affects routing + SEO. Default:
   `/activations` on the main app — keeps the methodology + admin
   surface co-located.
4. **Win-or-no-fee for Tournament Victory Mention.** Floated in v3 sub-
   activations. Powerful sales move, but needs legal/risk discussion +
   squad buy-in. Drop it if it's not real.
5. **Bespoke door at the bottom of the catalogue.** Currently a sixth
   "tell us your brief" CTA. Does it stay on the public catalogue page,
   or does it route through the dedicated `/activations/start-a-brief`
   intake flow? My recommendation: same destination — both lead to the
   same form, the catalogue CTA just deep-links to it.

---

## What NOT to do

- **Don't re-design the visual direction from scratch.** v3 is canonical.
  Tweaks welcome; full redesign is wasted work.
- **Don't add new bundles without Koge's explicit ask.** The five are the
  five. New ones are a commercial decision, not a design decision.
- **Don't make pricing editable on the public page.** Pricing changes are
  admin-only via the gold gear. Public page is read-only.
- **Don't put live numbers in this brief.** Already the rule for `CLAUDE.md`
  per the May-7 cleanup. Same applies here — strategic decisions are stable,
  numbers drift. Pull live state from DB at session start.
- **Don't reuse v2 as the implementation source.** It was a step toward
  v3. The 24-SKU flat catalogue structure was abandoned in favor of the
  5-parent / sub-activation hierarchy.

---

## Files in this brief

- `ACTIVATIONS_BRIEF.md` — this file
- `docs/mockups/bundles-v3-five-canonical-models.html` — canonical visual
- `docs/mockups/bundles-v2-activation-skus.html` — reference (sub-activation patterns)
- `docs/mockups/bundles-v1-talent-buckets.html` — reference (visual treatment)
- `docs/mockups/quote-builder-redesign.html` — separate but related project (the existing `/quote/new` redesign)
