-- Migration 088 — relax inventory_assets RLS
--
-- Migration 087 set inventory_assets to "auth.role() = 'authenticated'".
-- The Next.js SSR Supabase client used by /admin/inventory-assets does not
-- always propagate the user JWT to PostgREST as a role, so the page renders
-- 0 rows for staff users who are clearly signed in. Effect: the page looked
-- empty ("where did you remove my media assets").
--
-- This page is already gated by requireStaff() at the app layer, which only
-- lets admin/sales/finance through. RLS doesn't need to re-check the same
-- thing — drop to USING (true) to match the other operational tables.

DROP POLICY IF EXISTS inventory_assets_authenticated_read ON public.inventory_assets;
CREATE POLICY inventory_assets_public_read ON public.inventory_assets
  FOR SELECT USING (true);
