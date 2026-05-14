-- Migration 087 — Brand Product Launch: PH-anchored repricing + strip seed notes
--
-- Fixes Mig 086:
--   1. Pricing was 600K-2M SAR anchored on KSA Tier-1 talent rates.
--      Realme is buying for PH market — gaming KOL deals there land
--      ~10-20× cheaper than KSA. Repricing to span PH-floor → KSA-ceiling.
--   2. Removed Ronza Ayoub name + Realme-specific context from
--      bundle_compression_notes (template != quote — those details belong
--      on the Realme quote, not the canonical bundle).
--   3. Lowered reach / impression projections to PH-realistic ranges.

UPDATE public.activations
   SET price_floor_sar    = 150000,
       price_ceiling_sar  = 900000,
       roi_projections    = '[
         {"label": "Combined reach", "value": "3M — 12M", "unit": "followers", "desc": "2-4 talents · range spans PH-floor (3M) to KSA-Tier-1 ceiling (12M)"},
         {"label": "Projected impressions", "value": "2M — 8M", "unit": "", "desc": "Teaser + launch + afterglow (4-6 weeks). Adjust upward 2-3× for KSA-anchored launches with Tier-1 squad."},
         {"label": "Co-brand search lift", "value": "+15-45%", "unit": "vs baseline", "desc": "Brand-name search uplift in target market through launch window"},
         {"label": "Direct sales attribution", "value": "trackable", "unit": "", "desc": "UTM + discount-code per talent on co-branded landing page"}
       ]'::jsonb,
       bundle_compression_notes = 'Multi-talent labor compression — concurrent shoot scheduling, shared brief, single creative lead on Falcons side. Default pricing anchored on PH-region rates; KSA-anchored launches with Tier-1 squad land at the upper ceiling or above (override via quote-level axis multipliers).'
 WHERE slug = 'brand-product-launch';
