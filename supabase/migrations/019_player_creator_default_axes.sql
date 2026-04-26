-- 019: Promote per-talent intrinsic axes to first-class columns.
--
-- Until now, the configurator broadcast campaign-level axes (eng, aud, lang,
-- seas, auth) to every line in a quote. The player record carried
-- default_seasonality, default_language, and authority_factor but those were
-- admin-only metadata that the pricing engine ignored.
--
-- This migration adds the missing intrinsic fields so a quote with talents
-- from multiple regions can price each line against its own reality —
-- campaign axes become the fallback when a talent has no intrinsic value.
--
-- Defaults are 1.0 (neutral) for factors and 0.0/null for overrides, so
-- existing rows behave exactly the same until the values are set.

alter table public.players
  add column if not exists default_audience numeric default 1.0,
  add column if not exists default_engagement numeric default 1.0;

-- Creators previously had no axis defaults at all — only a tier and a score.
-- Mirror the players shape so the configurator can auto-seed creator lines too.
alter table public.creators
  add column if not exists default_audience numeric default 1.0,
  add column if not exists default_engagement numeric default 1.0,
  add column if not exists default_authority numeric default 1.0,
  add column if not exists default_language numeric default 1.0,
  add column if not exists default_seasonality numeric default 1.0;

comment on column public.players.default_audience is
  'Talent-intrinsic audience-fit factor. Auto-seeds the per-line audience override on new quote lines.';
comment on column public.players.default_engagement is
  'Talent-intrinsic engagement factor. Auto-seeds the per-line engagement override on new quote lines.';
comment on column public.creators.default_audience is
  'Creator-intrinsic audience-fit factor. Auto-seeds the per-line audience override on new quote lines.';
