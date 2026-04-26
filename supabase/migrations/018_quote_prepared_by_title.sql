-- Migration 018 — quotes get a `prepared_by_title` column so the rep's job
-- title (e.g. "Director of Esports Marketing") can be shown next to their
-- name on the quotation PDF.

alter table public.quotes
  add column if not exists prepared_by_title text;

comment on column public.quotes.prepared_by_title is
  'Optional job title shown next to prepared-by name on the quotation PDF.';
