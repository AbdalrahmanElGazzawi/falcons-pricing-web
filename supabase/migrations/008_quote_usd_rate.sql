-- Migration 008 — quotes get a frozen USD FX rate column so historical PDFs
-- always render with the rate that was in effect when the quote was created.
alter table public.quotes
  add column if not exists usd_rate numeric not null default 3.75;
comment on column public.quotes.usd_rate is 'SAR per 1 USD at quote time (default 3.75 — Saudi peg).';
