-- 011 — Add Kick stream + integration deliverables and follower count.
-- Mirrors Twitch fields. Backfills rates from Twitch counterparts so
-- existing players keep parity until manually re-tuned.

-- 1) Add columns
alter table public.players
  add column if not exists rate_kick_stream numeric default 0,
  add column if not exists rate_kick_integ  numeric default 0,
  add column if not exists followers_kick   integer;

-- 2) Backfill rates from Twitch (one-time copy, only when target is null/0)
update public.players
set rate_kick_stream = rate_twitch_stream
where (rate_kick_stream is null or rate_kick_stream = 0)
  and rate_twitch_stream is not null
  and rate_twitch_stream > 0;

update public.players
set rate_kick_integ = rate_twitch_integ
where (rate_kick_integ is null or rate_kick_integ = 0)
  and rate_twitch_integ is not null
  and rate_twitch_integ > 0;

-- 3) Set TGLTN's Kick follower count from the verification sheet (the only
-- player with a verified Kick follower count we collected in the cowork session).
update public.players
set followers_kick = 4827
where nickname = 'TGLTN';

-- 4) Audit log entry for traceability
insert into public.audit_log (actor_email, action, entity_type, diff)
values (
  'system@migration-011',
  'schema.add_kick_deliverables',
  'players',
  jsonb_build_object(
    'columns_added', array['rate_kick_stream', 'rate_kick_integ', 'followers_kick'],
    'backfill_strategy', 'rate_kick_* := rate_twitch_* where target was 0/null',
    'note', 'TGLTN followers_kick=4827 set from Apr 25 verification sheet'
  )
);
