alter table public.players
  add column if not exists rate_ig_repost     numeric not null default 0,
  add column if not exists rate_ig_share      numeric not null default 0,
  add column if not exists rate_x_repost      numeric not null default 0,
  add column if not exists rate_x_share       numeric not null default 0,
  add column if not exists rate_tiktok_repost numeric not null default 0,
  add column if not exists rate_tiktok_share  numeric not null default 0;

-- Methodology v1 backfill — refine when Shikenso data is available
update public.players set
  rate_ig_repost     = round(coalesce(rate_ig_static,    0) * 0.35),
  rate_ig_share      = round(coalesce(rate_ig_story,     0) * 0.25),
  rate_x_repost      = round(coalesce(rate_x_post,       0) * 0.30),
  rate_x_share       = round(coalesce(rate_x_post,       0) * 0.50),
  rate_tiktok_repost = round(coalesce(rate_tiktok_video, 0) * 0.30),
  rate_tiktok_share  = round(coalesce(rate_tiktok_video, 0) * 0.45)
 where is_active;
