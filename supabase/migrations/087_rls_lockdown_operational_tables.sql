-- 087 — RLS on operational tables + minimal read policies
-- Applied via Supabase MCP on 2026-05-13.
-- Engine lookups stay public-read (preserves app reads); deals + inventory_assets are authenticated-only.

ALTER TABLE public.peer_orgs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS peer_orgs_public_read ON public.peer_orgs;
CREATE POLICY peer_orgs_public_read ON public.peer_orgs FOR SELECT USING (true);

ALTER TABLE public.market_bands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS market_bands_public_read ON public.market_bands;
CREATE POLICY market_bands_public_read ON public.market_bands FOR SELECT USING (true);

ALTER TABLE public.authority_tier_meta ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authority_tier_meta_public_read ON public.authority_tier_meta;
CREATE POLICY authority_tier_meta_public_read ON public.authority_tier_meta FOR SELECT USING (true);

ALTER TABLE public.archetype_meta ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS archetype_meta_public_read ON public.archetype_meta;
CREATE POLICY archetype_meta_public_read ON public.archetype_meta FOR SELECT USING (true);

ALTER TABLE public.archetype_axis_weights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS archetype_axis_weights_public_read ON public.archetype_axis_weights;
CREATE POLICY archetype_axis_weights_public_read ON public.archetype_axis_weights FOR SELECT USING (true);

ALTER TABLE public.pricing_engine_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pricing_engine_versions_public_read ON public.pricing_engine_versions;
CREATE POLICY pricing_engine_versions_public_read ON public.pricing_engine_versions FOR SELECT USING (true);

ALTER TABLE public.channel_multipliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS channel_multipliers_public_read ON public.channel_multipliers;
CREATE POLICY channel_multipliers_public_read ON public.channel_multipliers FOR SELECT USING (true);

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deals_authenticated_read ON public.deals;
CREATE POLICY deals_authenticated_read ON public.deals FOR SELECT USING (auth.role() = 'authenticated');

ALTER TABLE public.inventory_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inventory_assets_authenticated_read ON public.inventory_assets;
CREATE POLICY inventory_assets_authenticated_read ON public.inventory_assets FOR SELECT USING (auth.role() = 'authenticated');
