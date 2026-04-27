-- 012 — Add is_companion flag to quote_lines.
-- Marks a line where the talent appears as a featured guest / supporting role
-- in another creator's content. Engine multiplies the line's final unit price
-- by 0.5 when this is true. Composes with all other axes (no double-discount
-- with content-type — see commit ad3d49a rollback).

alter table public.quote_lines
  add column if not exists is_companion boolean default false;

-- Optional index if we expect to filter / report on companion lines often.
create index if not exists quote_lines_is_companion_idx
  on public.quote_lines(is_companion) where is_companion = true;

-- Audit log
insert into public.audit_log (actor_email, action, entity_type, diff)
values (
  'system@migration-012',
  'schema.add_is_companion',
  'quote_lines',
  jsonb_build_object(
    'column_added', 'is_companion',
    'type', 'boolean',
    'default', false,
    'engine_effect', 'finalUnit *= 0.5 when true (composes with all other axes)'
  )
);
