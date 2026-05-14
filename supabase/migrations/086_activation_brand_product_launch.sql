-- Migration 086 — Brand Product Launch canonical activation (6th canonical bundle)
--
-- Context: Realme inquiry from Mitze Abrio (IMC Lead, realme), thread
-- "Brand Partnership Opportunity Inquiry" (Apr 22 – May 14 2026).
--   - Product launch June 4, 2026 · Teasers begin May 25, 2026
--   - Gaming-focused campaign (previous KOL pool was non-gaming)
--   - Local KSA POC needed; AFG taking lead with Ronza Ayoub
--
-- Existing canonical bundles cover: jersey/broadcast, mobile amplification,
-- PC/performance, day-in-the-life, tournament activation. None framed
-- a brand drop with a teaser → launch-day → afterglow cadence, which is
-- what consumer-electronics brands (phones, headsets, peripherals, energy
-- drinks etc.) actually buy. This adds that as the 6th canonical bundle.

BEGIN;

-- Make room at position 6: shift everything currently at position >= 6.
UPDATE public.activations SET position = position + 1 WHERE position >= 6;

INSERT INTO public.activations (
  slug, position, kind, name, archetype_text, positioning, pillar, cohorts,
  complexity, event_anchor, target_brand_categories,
  price_floor_sar, price_ceiling_sar, pricing_term,
  effort_player, effort_falcons, effort_player_label, effort_falcons_label,
  includes, roi_projections, plug_and_play_assets, pnp_footer,
  case_studies, is_featured, status,
  talent_slot_requirements, bundle_compression_factor, bundle_compression_notes
) VALUES (
  'brand-product-launch', 6, 'canonical', 'Brand Product Launch',
  'The "consumer SKU drop" bundle',
  '2-4 squad members + 1 hybrid-lifestyle creator running a teaser → launch-day → afterglow cadence. Designed for phone / peripheral / energy-drink / apparel SKUs landing in a 4-6 week window.',
  'content', ARRAY['players','influencers','creators'],
  'managed_series', ARRAY['Launch_Day','Pre_Launch'], ARRAY[]::text[],
  600000, 2000000, 'per launch window (4-6 weeks)',
  3, 3, 'mid', 'mid',
  '[
    {"body": "Teaser phase (T-10 → T-1): 2 mystery posts + 1 stories spread per talent across IG + TikTok"},
    {"body": "Launch day (T0): synchronised unboxing — Reel + TikTok + X post per talent, hard CTA"},
    {"body": "Afterglow (T+1 → T+7): 1 long-form review per hero talent (YouTube or TikTok long-form), 1 stream feature"},
    {"body": "1 hybrid-lifestyle creator owns the brand-story lens (away-from-game, lifestyle moments)"},
    {"body": "1 mobile_pro or pc_pro owns the in-game proof point (frame-perfect gameplay using the product)"},
    {"body": "Optional: in-store / retail flagship appearance on launch day (KSA Cenomi / Saudi Mall etc.)"},
    {"body": "Optional: paid amplification rights on hero assets — KSA + GCC for the launch window"}
  ]'::jsonb,
  '[
    {"label": "Combined reach", "value": "12M — 24M", "unit": "followers", "desc": "2-4 talents across IG + TikTok + YouTube + Twitch"},
    {"label": "Projected impressions", "value": "8M — 18M", "unit": "", "desc": "Teaser + launch + afterglow combined window (4-6 weeks)"},
    {"label": "Co-brand search lift", "value": "+25-60%", "unit": "vs baseline", "desc": "Brand-name search uplift in KSA Google Trends through launch window"},
    {"label": "Direct sales attribution", "value": "trackable", "unit": "", "desc": "UTM + discount-code per talent on co-branded landing page"}
  ]'::jsonb,
  '[
    {"asset": "Brand brief", "spec": "2-3 page launch deck: hero proposition, must-say, must-not-say, hero shots"},
    {"asset": "Brand asset pack", "spec": "Logo lockups, product imagery (final SKU), packshots, music license, key art"},
    {"asset": "Launch + teaser dates", "spec": "Firm dates with 4 weeks lead time — teaser drop, launch day, afterglow content window"},
    {"asset": "Retail / event details", "spec": "If in-store appearance: venue, date, dress code, fan-engagement plan"},
    {"asset": "Tracking links", "spec": "Unique UTM + discount code per talent for sales attribution"}
  ]'::jsonb,
  'Talent submitted floors apply. Squad availability subject to tournament calendar — book 4+ weeks ahead.',
  '[]'::jsonb, true, 'active',
  '[
    {
      "slot_name": "hybrid_lifestyle_anchor",
      "min_count": 1, "max_count": 1,
      "required_archetype": ["hybrid_lifestyle","pure_lifestyle"],
      "required_profile": {"peak_platforms": ["ig","tiktok","yt"]},
      "compression_role": "lead",
      "notes": "Owns the brand-story / aspirational lens; usually fronts the launch-day hero asset."
    },
    {
      "slot_name": "in_game_proof_point",
      "min_count": 1, "max_count": 2,
      "required_archetype": ["mobile_pro","pc_pro","regional_pro","world_class_pro"],
      "required_profile": {"peak_platforms": ["tiktok","ig","twitch"]},
      "compression_role": "labor",
      "notes": "Demonstrates the product in-game — frame-perfect gameplay, mobile esports proof, etc."
    },
    {
      "slot_name": "amplifier",
      "min_count": 0, "max_count": 1,
      "required_archetype": ["esports_personality","grassroots_competitor","streamer"],
      "required_profile": {"peak_platforms": ["twitch","kick","tiktok"]},
      "compression_role": "labor",
      "notes": "Live launch-day stream + reaction content; optional but recommended for SEA / KSA streaming-heavy audiences."
    }
  ]'::jsonb,
  0.90,
  'Multi-talent labor compression — concurrent shoot scheduling, shared brief, single creative lead on Falcons side. Realme (Mitze Abrio, IMC Lead) is the seed inquiry for this bundle: June 4 launch, May 25 teasers, gaming-focused. AFG is owner; Ronza Ayoub will be looped in as local KSA POC.'
);

COMMIT;
