-- 031. Creator avatars
--
-- The avatar_url column was added live via Supabase MCP earlier in development
-- but no migration file existed in the repo. This file backfills the missing
-- record so fresh deploys / dev DB resets reproduce the same schema.
--
-- Mirrors players.avatar_url. Loose contract: http(s) URL renders as <img>;
-- filename / blank falls back to initials avatar.

alter table public.creators
  add column if not exists avatar_url text;
