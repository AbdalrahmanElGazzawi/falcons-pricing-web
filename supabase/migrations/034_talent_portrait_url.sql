-- Migration 034 — Talent portrait field
--
-- Two image fields per talent now:
--   • avatar_url   — small, square, face-cropped (circle/list contexts)
--   • portrait_url — large, full-bodied or contextual portrait
--                    (hero sections, profile modals, showcase)
--
-- portrait_url falls back to avatar_url client-side when not set, so this
-- migration is non-breaking. Talents with proper portraits get the upgrade
-- as admins fill them in via /admin/players/[id] / /admin/creators/[id].

alter table public.players  add column if not exists portrait_url text;
alter table public.creators add column if not exists portrait_url text;
