alter table public.players
  add column if not exists bio text,
  add column if not exists achievements text[] default array[]::text[];

-- Strip stale local filenames (legacy data — only http(s) URLs are valid avatars)
update public.players
   set avatar_url = null
 where avatar_url is not null
   and avatar_url not like 'http%';
