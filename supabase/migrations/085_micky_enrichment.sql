-- Migration 085 — Micky (Chan Pak-yin, id=198) full enrichment
--
-- Sources:
--   Liquipedia      https://liquipedia.net/fighters/Micky
--   TwitchTracker   https://twitchtracker.com/micky1014_
--   FGC Top Players https://fgctopplayers.com/news/qanba-usa-signs-street-fighter-6-star-micky/
--   Falcons sign    https://fgctopplayers.com/news/team-falcons-signs-micky-following-strong-capcom-cup-run/
--
-- What this fills in:
--   - Liquipedia URL + lifetime prize money ($33,509 USD)
--   - Peak tournament tier = 'S' (EVO 2025 3rd, Capcom Cup 12 top-8,
--     DreamHack Birmingham 2026 2nd — all are S-tier majors)
--   - Authority Tier override = AT-2 (Top 4 at majors per Mig 071)
--   - Agency: Hero Esports (ex-VSPO) — the rebrand of VSPN/VSPO,
--     largest Asian esports company; VSPO+ talent arm reps 15,000+ artists
--   - Audience market: APAC
--   - Twitch followers (~72.8K) + 30d activity from TwitchTracker
--   - Qanba commitment row updated with territory + announce date + scope note
--
-- ⚠️ MINOR FLAG: DOB 2008-10-14 — age 17. Any KSA brand activation
--   requires guardian consent (currently NOT captured). Surfacing here
--   in players.notes so sales sees it on /admin/players/198.
--
-- "Blocked" diagnosis: Micky is NOT globally blocked. He has a Qanba
--   Worldwide Exclusive on Fight Stick / Arcade (category 6).
--   The /quote/new collision panel will flag him ⛔ only when a quote
--   pitches a competing fight-stick brand (Hori, Razer Arcade, Mayflash,
--   Victrix, GameSir, Hit Box, PXN). All other categories are clean.

BEGIN;

UPDATE public.players SET
  liquipedia_url          = COALESCE(liquipedia_url, 'https://liquipedia.net/fighters/Micky'),
  prize_money_24mo_usd    = GREATEST(COALESCE(prize_money_24mo_usd, 0), 33509),
  peak_tournament_tier    = COALESCE(peak_tournament_tier, 'S'),
  audience_market         = COALESCE(audience_market, 'APAC'),

  agency_status           = 'agency',
  agency_name             = COALESCE(NULLIF(agency_name, ''), 'Hero Esports (ex-VSPO)'),
  agency_fee_pct          = COALESCE(agency_fee_pct, 20.0),

  followers_twitch        = COALESCE(NULLIF(followers_twitch, 0), 72827),
  twitch_30d_avg_ccv      = COALESCE(twitch_30d_avg_ccv, 79),
  twitch_30d_peak_ccv     = COALESCE(twitch_30d_peak_ccv, 153),
  twitch_30d_hours_streamed = COALESCE(twitch_30d_hours_streamed, 9),
  twitch_30d_new_follows  = COALESCE(twitch_30d_new_follows, 136),
  metrics_30d_synced_at   = NOW(),

  authority_tier_override = COALESCE(authority_tier_override, 'AT-2'),

  notes                   = COALESCE(notes, '') ||
    E'\n[2026-05-11 enrichment] Liquipedia + socials backfilled from Mig 085. ' ||
    'Hero Esports (ex-VSPO) is the talent agency. Qanba is the fight-stick ' ||
    'sponsor (worldwide exclusive on Fight Stick category, see ' ||
    'talent_brand_commitments row id=2). ' ||
    E'\n⚠️ MINOR: DOB 2008-10-14 — age 17. Any KSA brand activation requires ' ||
    'guardian consent (currently NOT captured). Soft-flag any commercial deal ' ||
    'until guardian consent + parental sign-off is on file.'

WHERE id = 198;

UPDATE public.talent_brand_commitments SET
  territory   = 'Worldwide',
  term_start  = COALESCE(term_start, DATE '2025-12-31'),
  notes       = 'Qanba USA Sapphire Leverless — Worldwide Exclusive. ' ||
                'Announced 2025-12-31 (https://x.com/QanbaUSA/status/2006249328550330604). ' ||
                'Blocklist: Hori / Razer Arcade / Mayflash / Victrix / GameSir / Hit Box / PXN. ' ||
                'Category scope: Fight Stick / Arcade controllers only — does NOT block ' ||
                'standard gamepad, keyboard, headset, monitor, or other peripherals.'
WHERE id = 2;

COMMIT;
