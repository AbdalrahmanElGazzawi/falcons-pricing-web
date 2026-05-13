-- 088 — Schedule-1 reserved-category model + expanded commercial taxonomy + CS roster backfill
-- Applied via Supabase MCP on 2026-05-13.

-- 1. Expand commercial_categories taxonomy
INSERT INTO public.commercial_categories (code, name, parent_code, sort_order, is_active)
VALUES
  ('betting',              'Betting / Sportsbook',         NULL, 110, true),
  ('skin_trading',         'Skin Trading',                 NULL, 115, true),
  ('gaming_computer',      'Gaming Computer',              NULL, 120, true),
  ('gaming_monitor',       'Gaming Monitor',               NULL, 125, true),
  ('gaming_hardware',      'Gaming Hardware',              NULL, 130, true),
  ('gaming_hardware_cpu',  'CPU',                          'gaming_hardware', 131, true),
  ('gaming_hardware_gpu',  'Graphics Card',                'gaming_hardware', 132, true),
  ('online_cinema',        'Online Cinema',                NULL, 140, true),
  ('ping_software',        'Ping-Reduction Software',      NULL, 150, true)
ON CONFLICT (code) DO NOTHING;

-- 2. Player-level independent-sponsorship clause metadata
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS independent_sponsorship_clause_type   text,
  ADD COLUMN IF NOT EXISTS independent_sponsorship_notice_days   smallint,
  ADD COLUMN IF NOT EXISTS independent_sponsorship_clause_text   text,
  ADD COLUMN IF NOT EXISTS contract_source_doc_link              text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'players_indep_sponsor_clause_chk') THEN
    ALTER TABLE public.players ADD CONSTRAINT players_indep_sponsor_clause_chk
      CHECK (independent_sponsorship_clause_type IS NULL OR independent_sponsorship_clause_type IN (
        'open_with_consent','open_with_notice','pre_approved_categories','schedule_1_carveouts','none'
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'players_indep_sponsor_notice_chk') THEN
    ALTER TABLE public.players ADD CONSTRAINT players_indep_sponsor_notice_chk
      CHECK (independent_sponsorship_notice_days IS NULL OR (independent_sponsorship_notice_days >= 0 AND independent_sponsorship_notice_days <= 365));
  END IF;
END $$;

COMMENT ON COLUMN public.players.independent_sponsorship_clause_type IS
  'Contract clause type. open_with_consent / open_with_notice / pre_approved_categories / schedule_1_carveouts / none.';
COMMENT ON COLUMN public.players.independent_sponsorship_notice_days IS
  'Days notice required before signing an independent sponsorship.';

-- 3. talent_reserved_categories — Schedule-1-style permitted-category matrix
CREATE TABLE IF NOT EXISTS public.talent_reserved_categories (
  id                       bigint generated always as identity primary key,
  talent_id                integer not null references public.players(id) on delete cascade,
  commercial_category_id   bigint  not null references public.commercial_categories(id),
  sub_category             text,
  permitted_territory      text,
  permitted_distribution   text[] not null default '{}',
  notice_days_override     smallint,
  source_clause            text,
  source_doc_link          text,
  notes                    text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  created_by               text,
  updated_by               text,
  UNIQUE (talent_id, commercial_category_id, sub_category)
);

CREATE INDEX IF NOT EXISTS idx_trc_talent   ON public.talent_reserved_categories (talent_id);
CREATE INDEX IF NOT EXISTS idx_trc_category ON public.talent_reserved_categories (commercial_category_id);

ALTER TABLE public.talent_reserved_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS trc_authenticated_read ON public.talent_reserved_categories;
CREATE POLICY trc_authenticated_read ON public.talent_reserved_categories FOR SELECT
  USING (auth.role() = 'authenticated');

-- 4. Backfill CS roster clause types (TeSeS, kyousuke, karrigan, NiKo, m0NESY)
UPDATE public.players SET
  independent_sponsorship_clause_type = 'open_with_consent',
  independent_sponsorship_clause_text = 'Person shall be entitled to seek independent sponsorships with any business or entity that is not a competitor of a current or anticipated Team sponsor. Person shall not enter into any such independent sponsorship agreements without prior written consent from the Team, which shall not be unreasonably withheld.',
  updated_at = now()
WHERE id IN (25, 30);

UPDATE public.players SET
  independent_sponsorship_clause_type   = 'pre_approved_categories',
  independent_sponsorship_notice_days   = 5,
  independent_sponsorship_clause_text   = 'Pre-approved categories: skin trading platforms, gaming mouse, mousepad, keyboard. Prior written consent required, not unreasonably withheld, must be granted or denied within 5 business days (else deemed approved). 6-month displacement notice for conflicting team sponsors.',
  updated_at = now()
WHERE id = 193;

UPDATE public.players SET
  independent_sponsorship_clause_type = 'open_with_consent',
  independent_sponsorship_clause_text = 'Anticipated sponsor = 1+ month continuous conversations with clear willingness toward partnership within ~6 months if mentioned. Full flexibility on mouse/keyboard/mousepad.',
  updated_at = now()
WHERE id = 28;

UPDATE public.players SET
  independent_sponsorship_clause_type   = 'schedule_1_carveouts',
  independent_sponsorship_notice_days   = 14,
  independent_sponsorship_clause_text   = 'Section 6.a — Freelancer entitled to seek/perform Individual Sponsorship Agreements within Reserved Product Categories without team consent, subject to: own-IP only, Permitted Territory per Schedule 1, Permitted Distribution per Schedule 1 (excluding primary banner/profile picture on X/IG/Twitch/YT/FB without team approval), 14 days prior notice.',
  updated_at = now()
WHERE id = 27;

-- 5. Backfill individual-sponsor commitments
INSERT INTO public.talent_brand_commitments (talent_id, brand, commercial_category_id, exclusivity_scope, exclusivity_type, source_doc_link, notes, last_verified_by, last_verified_at, created_by)
SELECT 193, 'Skin Club', cc.id, 'Worldwide', 'Non-exclusive', 'CS Commercial Brief 2026',
       'Karrigan pre-approved individual sponsor.', 'koge', now(), 'Koge (via Claude)'
FROM public.commercial_categories cc WHERE cc.code = 'skin_trading'
ON CONFLICT DO NOTHING;

INSERT INTO public.talent_brand_commitments (talent_id, brand, commercial_category_id, sub_category, exclusivity_scope, exclusivity_type, source_doc_link, notes, last_verified_by, last_verified_at, created_by)
SELECT 28, 'Razer', cc.id, 'mouse + keyboard + mousepad', 'Worldwide', 'Non-exclusive', 'CS Commercial Brief 2026',
       'NiKo individual sponsor. Carveout per contract.', 'koge', now(), 'Koge (via Claude)'
FROM public.commercial_categories cc WHERE cc.code = 'peripherals'
ON CONFLICT DO NOTHING;

INSERT INTO public.talent_brand_commitments (talent_id, brand, commercial_category_id, exclusivity_scope, exclusivity_type, source_doc_link, notes, last_verified_by, last_verified_at, created_by)
SELECT 28, 'EZStore', cc.id, 'Worldwide', 'Non-exclusive', 'CS Commercial Brief 2026',
       'NiKo individual sponsor — computer/PC retailer.', 'koge', now(), 'Koge (via Claude)'
FROM public.commercial_categories cc WHERE cc.code = 'gaming_computer'
ON CONFLICT DO NOTHING;

INSERT INTO public.talent_brand_commitments (talent_id, brand, commercial_category_id, sub_category, exclusivity_scope, exclusivity_type, source_doc_link, notes, last_verified_by, last_verified_at, created_by)
SELECT 27, 'Logitech', cc.id, 'mouse + keyboard', 'Worldwide', 'Non-exclusive', 'CS Commercial Brief 2026 / Schedule 1',
       'm0NESY individual sponsor under Schedule-1 carveout.', 'koge', now(), 'Koge (via Claude)'
FROM public.commercial_categories cc WHERE cc.code = 'peripherals'
ON CONFLICT DO NOTHING;

-- 6. Seed m0NESY's Schedule 1
INSERT INTO public.talent_reserved_categories (talent_id, commercial_category_id, sub_category, permitted_territory, permitted_distribution, notice_days_override, source_clause, source_doc_link, created_by)
SELECT 27, cc.id, sub.sub_category, sub.permitted_territory, sub.permitted_distribution,
       14, 'm0NESY contract Schedule 1', 'm0NESY contract 8f991949ff77f353b771484f2e0a4f6915a38949', 'Koge (via Claude)'
FROM public.commercial_categories cc
JOIN (VALUES
  ('betting',              NULL::text,                       'CIS',    ARRAY['banners_overlay','social_media','offline_events']),
  ('gaming_computer',      NULL,                              'Global', ARRAY['banners_overlay','social_media','offline_events']),
  ('gaming_hardware_cpu',  NULL,                              'Global', ARRAY['banners_overlay','social_media','offline_events']),
  ('gaming_hardware_gpu',  NULL,                              'Global', ARRAY['banners_overlay','social_media','offline_events']),
  ('gaming_monitor',       NULL,                              'Global', ARRAY['banners_overlay','social_media','offline_events']),
  ('mouse',                NULL,                              'Global', ARRAY['banners_overlay','social_media','offline_events']),
  ('keyboard',             NULL,                              'Global', ARRAY['banners_overlay','social_media','offline_events']),
  ('chair',                NULL,                              'Global', ARRAY['banners_overlay','social_media','offline_events']),
  ('apparel',              'm0NESY own brand',                'Global', ARRAY['banners_overlay','social_media','offline_events']),
  ('online_cinema',        NULL,                              'Global', ARRAY['banners_overlay','social_media','offline_events']),
  ('skin_trading',         NULL,                              'CIS',    ARRAY['banners_overlay','social_media','offline_events']),
  ('ping_software',        'e.g. EXITLAG',                    'Global', ARRAY['banners_overlay','social_media','offline_events'])
) AS sub(category_code, sub_category, permitted_territory, permitted_distribution)
  ON sub.category_code = cc.code
ON CONFLICT DO NOTHING;

-- 7. Seed karrigan pre-approved carveouts + NiKo peripheral flexibility
INSERT INTO public.talent_reserved_categories (talent_id, commercial_category_id, sub_category, permitted_territory, permitted_distribution, notice_days_override, source_clause, source_doc_link, created_by)
SELECT 193, cc.id, NULL, 'Global', ARRAY['banners_overlay','social_media','offline_events'],
       5, 'karrigan contract pre-approved categories', 'CS Commercial Brief 2026', 'Koge (via Claude)'
FROM public.commercial_categories cc WHERE cc.code IN ('skin_trading','mouse','keyboard','mousepad')
ON CONFLICT DO NOTHING;

INSERT INTO public.talent_reserved_categories (talent_id, commercial_category_id, sub_category, permitted_territory, permitted_distribution, source_clause, source_doc_link, created_by)
SELECT 28, cc.id, NULL, 'Global', ARRAY['banners_overlay','social_media','offline_events'],
       'Peripheral flexibility clause', 'CS Commercial Brief 2026', 'Koge (via Claude)'
FROM public.commercial_categories cc WHERE cc.code IN ('mouse','keyboard','mousepad')
ON CONFLICT DO NOTHING;
