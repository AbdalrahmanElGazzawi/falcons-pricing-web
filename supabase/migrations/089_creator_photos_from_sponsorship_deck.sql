-- Migration 089 — replace creator avatar_url with official sponsorship-deck photos
--
-- Source: "Team Falcons Content Creators (1).pptx" — slides 5-19.
-- The deck has the proper Falcons-curated photos; previously we were
-- falling back to unavatar.io (Twitter/Twitch CDN proxies) which look
-- inconsistent and rely on a flaky third-party.
--
-- Photos committed to public/creators/<slug>.png in the same push, so
-- they serve from https://falcons-pricing-web.vercel.app/creators/<slug>.png
-- with Vercel edge caching.
--
-- Msdossary7 (id=3) is NOT in this deck — keeping his existing Drive thumbnail.

UPDATE public.creators SET avatar_url = '/creators/banderitax.png' WHERE id = 1;
UPDATE public.creators SET avatar_url = '/creators/opiilz.png'      WHERE id = 2;
UPDATE public.creators SET avatar_url = '/creators/aziz.png'        WHERE id = 4;
UPDATE public.creators SET avatar_url = '/creators/bo3omar22.png'   WHERE id = 5;
UPDATE public.creators SET avatar_url = '/creators/abu-abeer.png'   WHERE id = 6;
UPDATE public.creators SET avatar_url = '/creators/lle.png'         WHERE id = 7;
UPDATE public.creators SET avatar_url = '/creators/oden.png'        WHERE id = 8;
UPDATE public.creators SET avatar_url = '/creators/xsma333.png'     WHERE id = 9;
UPDATE public.creators SET avatar_url = '/creators/3adel.png'       WHERE id = 10;
UPDATE public.creators SET avatar_url = '/creators/raed.png'        WHERE id = 11;
UPDATE public.creators SET avatar_url = '/creators/drb7h.png'       WHERE id = 13;
UPDATE public.creators SET avatar_url = '/creators/fzx.png'         WHERE id = 14;
UPDATE public.creators SET avatar_url = '/creators/saudcast.png'    WHERE id = 15;
UPDATE public.creators SET avatar_url = '/creators/hamadsenpai.png' WHERE id = 16;
UPDATE public.creators SET avatar_url = '/creators/thewitty21.png'  WHERE id = 18;
