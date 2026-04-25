-- Migration 004 — extend players with avatar_url, date_of_birth, ingame_role
-- (already applied to production via Supabase MCP apply_migration; this file
-- is the canonical record so future restores / new envs replay it.)

alter table public.players
  add column if not exists avatar_url    text,
  add column if not exists date_of_birth date,
  add column if not exists ingame_role   text;

comment on column public.players.avatar_url    is 'URL or filename of player picture; populated from roster sheet, editable in /admin/players.';
comment on column public.players.date_of_birth is 'Optional birth date for age display.';
comment on column public.players.ingame_role   is 'Role inside the game (SMG, Flex, Support, Tank, etc.) — distinct from team role.';

create index if not exists players_game_team_nickname_idx
  on public.players (lower(game), lower(team), lower(nickname));
