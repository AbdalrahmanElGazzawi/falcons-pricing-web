-- =============================================================================
-- Migration 070 — Activations Catalogue · Phase 1 seed
-- =============================================================================
-- Seeds 5 canonical bundles + 60 library SKUs = 65 activations.
-- Sources: ACTIVATIONS_BRIEF.md · docs/mockups/bundles-v3-five-canonical-models.html
-- · docs/mockups/bundles-v4-expanded-library.html · master Sponsorship Inventory
-- · EWC Inventory · Samsung × Falcons proposal · falcons-pricing-web roster sheet.
-- Nothing invented. Numbers re-editable via /admin/activations after seeding.
-- =============================================================================

-- ─── 5 CANONICAL BUNDLES ──────────────────────────────────────────────────
insert into public.activations (
  slug, position, kind, name, archetype_text, positioning,
  pillar, cohorts, complexity, event_anchor, falcons_ip, target_brand_categories,
  price_floor_sar, price_ceiling_sar, pricing_term,
  effort_player, effort_falcons, effort_player_label, effort_falcons_label,
  includes, roi_projections, plug_and_play_assets, pnp_footer,
  parent_id, is_featured, status
) values
  (
    'always-on-jersey-broadcast', 1, 'canonical', 'Always-On Jersey + Broadcast', 'The "no excuses, sign here" SKU',
    'Logo on jersey + persistent broadcast lower-third for one game vertical, one full season. Sets up once, runs unattended.',
    'broadcast', ARRAY['mixed']::text[], 'plug_and_play', ARRAY['Evergreen']::text[], null, '{}'::text[],
    940000, 2250000, 'per game vertical · per season',
    0, 1, null, null,
    '[{"body":"Jersey patch — front-of-jersey, sleeve, or chest position by tier. All competitive matches."},{"body":"Broadcast lower-third — official tournament + watch-along streams. Persistent."},{"body":"Post-match social — every win/loss recap on Falcons channels carries the lockup."},{"body":"Press releases co-branded for the season — partnership announcements, tournament results."}]'::jsonb, '[{"label":"Competitive broadcast hours","value":"820","unit":"hrs / season","desc":"Across all matches in the chosen vertical, including playoffs"},{"label":"Cumulative live viewers","value":"42M+","unit":"unique","desc":"Cross-platform — Twitch, YouTube, official tournament feeds"},{"label":"Implied CPM","value":"$1.40 — $3.20","unit":"","desc":"Calibrated against Tier-S sponsorship benchmarks · MENA mid-band"}]'::jsonb, '[{"asset":"Logo lockup","spec":"SVG · CMYK + RGB · jersey-position-ready"},{"asset":"Lower-third artwork","spec":"PNG · 1920×140 with transparency · 24-hour bug variant"},{"asset":"Comms boilerplate","spec":"200-word brand statement for press releases"}]'::jsonb, 'Lead time: 14 days from asset receipt. Three review cycles on the lockup. After that, it''s automatic.',
    null, true, 'active'
  ),
  (
    'mobile-amplification', 2, 'canonical', 'Mobile Amplification', 'The "regional product launch" SKU',
    '25 MLBB players across PH + ID + MENA paired with mobile-first creators. 50 social pieces + group challenge + on-site activation + geo-targeted variants.',
    'content', ARRAY['players','influencers']::text[], 'managed_series', ARRAY['Evergreen']::text[], null, '{}'::text[],
    560000, 1130000, 'per 4–6 week campaign',
    2, 2, null, null,
    '[{"body":"25 MLBB players · 1 IG Reel + 1 TikTok each = 50 social pieces"},{"body":"1 group team-challenge video — full squad, brand-led concept, single hero asset"},{"body":"2 esports-influencer activations — Tier-1 KSA creators amplifying the moment"},{"body":"On-site event appearance — squad members at brand event (Cenomi mall, retail flagship)"},{"body":"Geo-targeted creative variants — same concept, localized for KSA / SEA / PH"}]'::jsonb, '[{"label":"Combined reach","value":"38M","unit":"followers","desc":"25 players + 4 influencers across IG, TikTok, YouTube"},{"label":"Projected impressions","value":"22M — 28M","unit":"","desc":"Avg view rates: Reels 14% · TikTok 11% · stories 8%"},{"label":"Geo footprint","value":"PH · ID · MENA","unit":"","desc":"Direct overlap with Huawei AppGallery + Cenomi MENA footprint"}]'::jsonb, '[{"asset":"Brand brief","spec":"2-page concept · what to show, what to say, what to avoid"},{"asset":"Brand asset pack","spec":"Logo, product imagery, packshots, music license (if applicable)"},{"asset":"Event date + venue","spec":"For the on-site appearance — 4 weeks lead time on attendance"}]'::jsonb, 'Falcons handles all creative direction, scripts, talent comms, and posting cadence. Brand reviews per round, doesn''t manage the production.',
    null, true, 'active'
  ),
  (
    'performance-pc-bundle', 3, 'canonical', 'Performance / PC Bundle', 'The "low player effort, high content cadence" SKU',
    '100% Twitch-active rosters. Persistent overlay + chat command + Performance Moment of the Week + quarterly long-form YouTube + jersey patch.',
    'stream', ARRAY['players']::text[], 'managed_series', ARRAY['Evergreen']::text[], null, '{}'::text[],
    750000, 1880000, 'per quarter',
    1, 2, null, null,
    '[{"body":"Persistent Twitch overlay + chat command across all Twitch-active rosters · all streams"},{"body":"Performance Moment of the Week — 1 highlight reel per team per month, pulled from existing VODs by Falcons editors"},{"body":"1 player-led long-form YouTube per quarter — gear talk, performance review, brand-anchored"},{"body":"Jersey patch on all participating teams for the quarter"},{"body":"Quarterly reporting — concurrents, watch-time, click-through, code redemption"}]'::jsonb, '[{"label":"Branded stream hours","value":"2,100+","unit":"/qtr","desc":"All Twitch-active rosters · all sessions · overlay continuous"},{"label":"Highlight reel reach","value":"12M","unit":"/qtr","desc":"Cross-posted IG + TikTok + YouTube Shorts + Twitter"},{"label":"Long-form views","value":"340K — 580K","unit":"","desc":"YouTube — gear-content audience converts at higher rates"}]'::jsonb, '[{"asset":"Stream overlay artwork","spec":"PNG · 1920×140 lower-third + 320×900 sidebar variants"},{"asset":"Chat command + promo code","spec":"!brandcommand response text + active promo code"},{"asset":"Highlight reel template","spec":"Lower-third lockup + outro card (5s)"}]'::jsonb, 'You provide nothing for the YouTube long-form — Falcons writes, shoots, edits, posts. You review the cut. That''s it.',
    null, true, 'active'
  ),
  (
    'day-in-the-life-content-engine', 4, 'canonical', 'Day-in-the-Life Content Engine', 'The "highest-margin product on the menu" SKU',
    '12-month embedded brand presence. 6-8 charismatic talents. Brand becomes a recurring fixture in monthly BTS, bootcamp footage, travel vlogs. Falcons produces centrally.',
    'talent', ARRAY['players','creators']::text[], 'embedded_partnership', ARRAY['Evergreen']::text[], null, '{}'::text[],
    1500000, 4500000, 'per brand · per year',
    1, 2, null, null,
    '[{"body":"6-8 embedded talents — Falcons selects the right faces for the brand archetype"},{"body":"1 monthly long-form BTS piece — bootcamp, training day, travel, content shoot"},{"body":"Brand integration in ambient B-roll — branded fridge, branded beverage, branded gear, branded travel"},{"body":"Quarterly hero piece — high-production-value brand spot featuring the embedded talents"},{"body":"Category exclusivity — top tier locks the brand as the only one in its vertical for 12 months"},{"body":"1-year usage rights on all content for brand''s owned channels"}]'::jsonb, '[{"label":"Annual content volume","value":"12+","unit":"hero, 50+ ambient","desc":"Monthly BTS + quarterly hero + ambient brand presence in ~50 pieces of content"},{"label":"Combined annual reach","value":"180M","unit":"","desc":"Across 6-8 embedded talents · IG + TikTok + YouTube + Twitch"},{"label":"Earned media multiplier","value":"3.4×","unit":"spend","desc":"Industry benchmark for embedded-talent annual deals (Red Bull/Monster precedent)"}]'::jsonb, '[{"asset":"Brand archetype brief","spec":"What the brand is — values, tone, where it lives in talent''s life"},{"asset":"Product / asset deployment","spec":"Physical product placed in environments where talents already live"},{"asset":"Quarterly review cadence","spec":"One 60-minute brand call per quarter — content review + next-quarter direction"}]'::jsonb, 'The brand provides product and direction; Falcons provides everything else. No daily approvals. No micromanagement of player schedules.',
    null, true, 'active'
  ),
  (
    'tournament-activation-pack', 5, 'canonical', 'Tournament Activation Pack', 'The "moment-driven, slot-based" SKU',
    'Tied to specific majors. Pre-tournament hype reels + on-site interviews + post-result reaction content + watch-along streams. Brands buy slots, not players.',
    'event', ARRAY['mixed']::text[], 'hero_moment', ARRAY['EWC','IEM','Worlds','Riyadh_Masters']::text[], null, '{}'::text[],
    280000, 750000, 'per event',
    2, 3, null, null,
    '[{"body":"Pre-tournament hype reel — 1 group cinematic + 3 individual talent posts in the lead-up week"},{"body":"On-site interviews — Falcons crew captures branded post-match interviews"},{"body":"Post-result reaction content — 4 esports-influencer reaction posts within 24h of finals"},{"body":"3 watch-along streams — any 3 streaming-active players doing co-stream coverage"}]'::jsonb, '[{"label":"Event-window reach","value":"14M","unit":"","desc":"Hype + reaction + watch-along combined audience over a 7-10 day window"},{"label":"Watch-along hours","value":"240","unit":"hrs total","desc":"3 streamers × avg 6h × event days · branded throughout"},{"label":"Tournament seasonality","value":"1.40×","unit":"","desc":"Already priced in — brand pays the premium for the moment, not retroactively"}]'::jsonb, '[{"asset":"Event commitment","spec":"Confirmed slot per major — book 8 weeks before tournament"},{"asset":"Brand asset pack","spec":"Logo, hype-reel intro card, talent-read script (60 words)"},{"asset":"On-site brand presence","spec":"Optional: physical event activation Falcons coordinates with venue"}]'::jsonb, 'Falcons handles all scheduling, talent comms, on-site capture, and editing. Brand approves the cut, not the process.',
    null, true, 'active'
  );

-- ─── 60 LIBRARY SKUs ──────────────────────────────────────────────────────
insert into public.activations (
  slug, position, kind, name, archetype_text, positioning,
  pillar, cohorts, complexity, event_anchor, falcons_ip, target_brand_categories,
  price_floor_sar, price_ceiling_sar, pricing_term,
  effort_player, effort_falcons, effort_player_label, effort_falcons_label,
  includes, roi_projections, plug_and_play_assets, pnp_footer,
  parent_id, is_featured, status
) values
(
  'persistent-stream-logo-pack', 6, 'library', 'Persistent Stream Logo Pack', null, 'Stream overlay persistent logo + lower-third rotation + Twitch panel + YouTube channel banner. All five Falcons broadcast surfaces.',
  'broadcast', ARRAY['mixed']::text[], 'plug_and_play', ARRAY['Evergreen']::text[], null, '{}'::text[],
  350000, null, 'per season',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  (select id from public.activations where slug = 'always-on-jersey-broadcast'),
  false, 'active'
),
(
  'pre-roll-sponsor-mention-pack', 7, 'library', 'Pre-Roll Sponsor Mention Pack', null, '15-second branded opening at every broadcast. Caster reads the line. Min. 2x per broadcast day.',
  'broadcast', ARRAY['mixed']::text[], 'plug_and_play', ARRAY['Evergreen']::text[], null, '{}'::text[],
  180000, null, 'per season',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  (select id from public.activations where slug = 'always-on-jersey-broadcast'),
  false, 'active'
),
(
  'caster-cta-pack-eng-arabic', 8, 'library', 'Caster CTA Pack (ENG + Arabic)', null, '20-second caster call-to-action including brand quote + key message. Both language tracks. Min. 1x per broadcast day.',
  'broadcast', ARRAY['mixed']::text[], 'managed_series', ARRAY['Evergreen']::text[], null, '{}'::text[],
  240000, null, 'per season',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  (select id from public.activations where slug = 'always-on-jersey-broadcast'),
  false, 'active'
),
(
  'in-game-overlay-pack', 9, 'library', 'In-Game Overlay Pack', null, 'Logo on team composition screen + map loading screen + post-match results + MVP highlight reel. Visible across all match flow.',
  'broadcast', ARRAY['players']::text[], 'plug_and_play', ARRAY['Evergreen']::text[], null, '{}'::text[],
  220000, null, 'per season',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  (select id from public.activations where slug = 'always-on-jersey-broadcast'),
  false, 'active'
),
(
  'arabic-caster-desk-branding', 10, 'library', 'Arabic Caster Desk Branding', null, 'Static brand on caster desk backdrop + front screen rotation. Arabic broadcasts only — premium MENA visibility.',
  'broadcast', ARRAY['mixed']::text[], 'plug_and_play', ARRAY['Evergreen']::text[], null, '{}'::text[],
  280000, null, 'per season',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  (select id from public.activations where slug = 'always-on-jersey-broadcast'),
  false, 'active'
),
(
  'persistent-twitch-overlay-single-team', 11, 'library', 'Persistent Twitch Overlay (Single Team)', null, 'One Twitch-active team. Overlay only. Designed for first-time partners — lowest-friction entry into the catalogue.',
  'stream', ARRAY['players']::text[], 'plug_and_play', ARRAY['Evergreen']::text[], null, '{}'::text[],
  95000, null, 'per quarter',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  (select id from public.activations where slug = 'performance-pc-bundle'),
  false, 'active'
),
(
  'chatbot-cta-channel-points-reward', 12, 'library', 'Chatbot CTA + Channel Points Reward', null, 'Automated !brand chatbot response + custom channel points reward featuring partner. Direct fan engagement loop.',
  'stream', ARRAY['players']::text[], 'plug_and_play', ARRAY['Evergreen']::text[], null, '{}'::text[],
  65000, null, 'per quarter',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  (select id from public.activations where slug = 'performance-pc-bundle'),
  false, 'active'
),
(
  'saudi-esports-marathon-abo-najd-14h', 13, 'library', 'Saudi Esports Marathon (Abo Najd 14h)', null, 'Abo Najd''s signature 14-hour broadcast covering all Falcons tournaments. Standalone or as a bolt-on.',
  'stream', ARRAY['creators']::text[], 'hero_moment', ARRAY['EWC','IEM','Worlds','Riyadh_Masters']::text[], 'saudi_esports_marathon', '{}'::text[],
  385000, null, 'per marathon',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  (select id from public.activations where slug = 'tournament-activation-pack'),
  false, 'active'
),
(
  'watch-along-stream-pack', 14, 'library', 'Watch-Along Stream Pack', null, '3 streaming-active players doing branded co-stream coverage of any major. ~240 hours of branded watch-time across event window.',
  'stream', ARRAY['players']::text[], 'managed_series', ARRAY['EWC','IEM','Worlds','Riyadh_Masters']::text[], null, '{}'::text[],
  280000, null, 'per event',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  (select id from public.activations where slug = 'tournament-activation-pack'),
  false, 'active'
),
(
  'single-branded-reel', 15, 'library', 'Single Branded Reel', null, 'One Reel on Falcons IG — concept brand-led, Falcons-produced. Entry-tier sampling SKU.',
  'content', ARRAY['mixed']::text[], 'plug_and_play', ARRAY['Evergreen']::text[], null, '{}'::text[],
  18500, null, 'one-off',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  (select id from public.activations where slug = 'mobile-amplification'),
  false, 'active'
),
(
  'story-spread-5', 16, 'library', 'Story Spread × 5', null, 'Five-story sequence on Falcons IG. 24h visibility. Concept brand-led.',
  'content', ARRAY['mixed']::text[], 'plug_and_play', ARRAY['Evergreen']::text[], null, '{}'::text[],
  62000, null, 'one-off',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  (select id from public.activations where slug = 'mobile-amplification'),
  false, 'active'
),
(
  'tiktok-brand-integration-pack', 17, 'library', 'TikTok Brand Integration Pack', null, 'Four TikTok pieces with brand integration over 4 weeks. Native to creator voices, not adapted from elsewhere.',
  'content', ARRAY['creators']::text[], 'managed_series', ARRAY['Evergreen']::text[], null, '{}'::text[],
  145000, null, '4-piece run',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  (select id from public.activations where slug = 'mobile-amplification'),
  false, 'active'
),
(
  'youtube-dedicated-episode', 18, 'library', 'YouTube Dedicated Episode', null, 'Full standalone episode on Falcons Esports YouTube channel dedicated to brand storytelling. Production by Falcons studio.',
  'content', ARRAY['mixed']::text[], 'hero_moment', ARRAY['Evergreen']::text[], null, '{}'::text[],
  220000, null, 'one-off',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  (select id from public.activations where slug = 'day-in-the-life-content-engine'),
  false, 'active'
),
(
  'luxury-vs-budget-series-sponsorship', 19, 'library', '"Luxury vs Budget" Series Sponsorship', null, 'Title sponsorship of Falcons'' most popular YouTube series — 50M+ views per season. Brand integrated into format.',
  'content', ARRAY['creators']::text[], 'hero_moment', ARRAY['Evergreen']::text[], 'luxury_vs_budget', '{}'::text[],
  480000, null, 'per episode',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  (select id from public.activations where slug = 'day-in-the-life-content-engine'),
  false, 'active'
),
(
  'falcons-sa-homepage-banner', 20, 'library', 'falcons.sa Homepage Banner', null, 'Premium rotating banner on falcons.sa homepage. Highest-traffic digital surface.',
  'digital', ARRAY['mixed']::text[], 'plug_and_play', ARRAY['Evergreen']::text[], null, '{}'::text[],
  75000, null, 'per month',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  null,
  false, 'active'
),
(
  'custom-co-branded-landing-page', 21, 'library', 'Custom Co-Branded Landing Page', null, 'Dedicated campaign page on falcons.sa subdomain. Trackable, time-boxed, cleanable.',
  'digital', ARRAY['mixed']::text[], 'managed_series', ARRAY['Evergreen']::text[], null, '{}'::text[],
  95000, null, 'one-off',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  null,
  false, 'active'
),
(
  'newsletter-sponsor-section-3-issues', 22, 'library', 'Newsletter Sponsor Section (3 issues)', null, 'Branded section in 3 consecutive newsletters. 100K+ MENA subscribers. Bi-weekly cadence.',
  'digital', ARRAY['mixed']::text[], 'plug_and_play', ARRAY['Evergreen']::text[], null, '{}'::text[],
  48000, null, '3 issues',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  null,
  false, 'active'
),
(
  'falcons-command-center-powered-by-brand', 23, 'library', 'Falcons Command Center "Powered by [Brand]"', null, 'Branded streaming room build-out at Falcons HQ. Visible in every piece of production output that comes out of HQ. Naming rights included.',
  'facility', ARRAY['players']::text[], 'embedded_partnership', ARRAY['Evergreen']::text[], 'command_center', '{}'::text[],
  1200000, null, 'per year',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  (select id from public.activations where slug = 'day-in-the-life-content-engine'),
  false, 'active'
),
(
  'player-desk-setup-branding', 24, 'library', 'Player Desk / Setup Branding', null, 'Brand product placement at player stations across the training facility. Visible in BTS, training, and stream backdrops.',
  'facility', ARRAY['players']::text[], 'plug_and_play', ARRAY['Evergreen']::text[], null, '{}'::text[],
  120000, null, 'per year',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  null,
  false, 'active'
),
(
  'falcons-nest-gaming-zone', 25, 'library', 'Falcons Nest Gaming Zone', null, 'Year-round branded Gaming Zone inside Falcons Nest, public-facing on Riyadh Boulevard. Walk-in fan audience.',
  'facility', ARRAY['mixed']::text[], 'embedded_partnership', ARRAY['Evergreen']::text[], 'falcons_nest', '{}'::text[],
  950000, null, 'per year',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  null,
  false, 'active'
),
(
  'bootcamp-day-visit', 26, 'library', 'Bootcamp Day Visit', null, 'Brand team visits Falcons HQ during bootcamp. Photos, BTS access, custom social cross-post. Sales-team-facing entry SKU.',
  'facility', ARRAY['mixed']::text[], 'plug_and_play', ARRAY['Evergreen']::text[], null, '{}'::text[],
  42000, null, 'one-off',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  null,
  false, 'active'
),
(
  'ewc-booth-space-sales-zone', 27, 'library', 'EWC Booth Space — Sales Zone', null, '3×4m sales booth at EWC. Product sales + sampling rights. Six-figure brand on-ground presence.',
  'event', ARRAY['mixed']::text[], 'hero_moment', ARRAY['EWC']::text[], null, '{}'::text[],
  380000, null, 'per event',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  (select id from public.activations where slug = 'tournament-activation-pack'),
  false, 'active'
),
(
  'tournament-victory-mention', 28, 'library', 'Tournament Victory Mention', null, 'Brand named in celebration moment if Falcons wins. Win-or-no-fee structure — risk-shared with the brand.',
  'event', ARRAY['players']::text[], 'plug_and_play', ARRAY['EWC','IEM','Worlds','Riyadh_Masters']::text[], null, '{}'::text[],
  95000, null, 'win-or-no-fee',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  (select id from public.activations where slug = 'tournament-activation-pack'),
  false, 'active'
),
(
  'tournament-week-saturation', 29, 'library', 'Tournament-Week Saturation', null, '6 talents covering one major from 6 angles for the whole event week. Maximum brand surface area in a single tournament window.',
  'event', ARRAY['mixed']::text[], 'hero_moment', ARRAY['EWC','IEM','Worlds','Riyadh_Masters']::text[], null, '{}'::text[],
  520000, null, 'per event',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  (select id from public.activations where slug = 'tournament-activation-pack'),
  false, 'active'
),
(
  'watch-party-sponsorship', 30, 'library', 'Watch Party Sponsorship', null, 'Branded fan watch party at Falcons Nest or external venue. Includes co-branded social, on-ground activation, fan giveaways.',
  'event', ARRAY['mixed']::text[], 'managed_series', ARRAY['EWC','IEM','Worlds','Riyadh_Masters']::text[], null, '{}'::text[],
  140000, null, 'per event',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  (select id from public.activations where slug = 'tournament-activation-pack'),
  false, 'active'
),
(
  'falcons-invitational-title-sponsor', 31, 'library', 'Falcons Invitational Title Sponsor', null, '"[Brand] Falcons Invitational" — annual Falcons-owned tournament. Full naming rights, broadcast lockup, prize-pool branding, on-site activation.',
  'event', ARRAY['mixed']::text[], 'embedded_partnership', ARRAY['Annual']::text[], 'falcons_invitational', '{}'::text[],
  1800000, null, 'per year',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  null,
  false, 'active'
),
(
  'falcons-community-cup-title-sponsor', 32, 'library', 'Falcons Community Cup Title Sponsor', null, 'Smaller community-tier branded tournament. Broader grassroots reach, lower commitment than the Invitational.',
  'event', ARRAY['mixed']::text[], 'hero_moment', ARRAY['Annual']::text[], 'falcons_community_cup', '{}'::text[],
  280000, null, 'per cup',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  null,
  false, 'active'
),
(
  'saudi-national-day-activation', 33, 'library', 'Saudi National Day Activation', null, 'KSA-themed content from KSA-region players + on-site presence at Riyadh Boulevard. Sovereign-themed brand moment.',
  'event', ARRAY['mixed']::text[], 'hero_moment', ARRAY['Saudi_National_Day']::text[], null, '{}'::text[],
  280000, null, 'per activation',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  null,
  false, 'active'
),
(
  'gameweek-riyadh-activation', 34, 'library', 'GameWeek Riyadh Activation', null, 'Booth + panel slots + creator coverage during GameWeek Riyadh. B2B + consumer fusion event.',
  'event', ARRAY['mixed']::text[], 'hero_moment', ARRAY['GameWeek_Riyadh']::text[], null, '{}'::text[],
  380000, null, 'per event',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  null,
  false, 'active'
),
(
  'player-ambassador-1-player-1-year', 35, 'library', 'Player Ambassador (1 player, 1 year)', null, '12-month exclusive ambassador deal with one named player. Quarterly content cadence + appearance commitments + signature usage.',
  'talent', ARRAY['players']::text[], 'embedded_partnership', ARRAY['Evergreen']::text[], null, '{}'::text[],
  850000, null, 'per year',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  null,
  false, 'active'
),
(
  'influencer-network-activation', 36, 'library', 'Influencer Network Activation', null, 'Tier-A influencer (>2M followers) IG Story activation via Falcons influencer network. Includes Bijw, Abo Najd, FMG, Ghala class talent.',
  'talent', ARRAY['influencers']::text[], 'plug_and_play', ARRAY['Evergreen']::text[], null, '{}'::text[],
  110000, null, 'one-off',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  null,
  false, 'active'
),
(
  'influencer-youtube-integration', 37, 'library', 'Influencer YouTube Integration', null, '1-minute brand integration in a Tier-A influencer YouTube video. Native, not interruptive.',
  'talent', ARRAY['influencers']::text[], 'managed_series', ARRAY['Evergreen']::text[], null, '{}'::text[],
  180000, null, 'one-off',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  null,
  false, 'active'
),
(
  'custom-content-piece-bespoke', 38, 'library', 'Custom Content Piece (Bespoke)', null, 'Branded content featuring players. Includes scripting + production + post. Hero-tier deliverable for premium brand moments.',
  'talent', ARRAY['mixed']::text[], 'hero_moment', ARRAY['Evergreen']::text[], null, '{}'::text[],
  165000, null, 'one-off',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  null,
  false, 'active'
),
(
  'player-signature-streaming-setup', 39, 'library', 'Player Signature Streaming Setup', null, 'Sponsored setup reveal stream + 2 follow-up "what''s on my desk" streams. Hardware brands that want a signature face.',
  'talent', ARRAY['players']::text[], 'hero_moment', ARRAY['Evergreen']::text[], null, '{}'::text[],
  280000, null, 'one-off',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  null,
  false, 'active'
),
(
  'creator-bts-series', 40, 'library', 'Creator BTS Series', null, '4-episode YouTube series following one creator''s life — gym, gear, family, travel. Brand integrated as recurring fixture.',
  'talent', ARRAY['creators']::text[], 'managed_series', ARRAY['Evergreen']::text[], null, '{}'::text[],
  340000, null, '4-ep run',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  null,
  false, 'active'
),
(
  'single-creator-day-in-the-life', 41, 'library', 'Single Creator "Day in the Life"', null, '12-month single-creator embedded sponsorship — same architecture as Day-in-the-Life № 04 but at 1-creator scale. Lower entry, same engine.',
  'talent', ARRAY['creators']::text[], 'embedded_partnership', ARRAY['Evergreen']::text[], null, '{}'::text[],
  950000, null, 'per year',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  (select id from public.activations where slug = 'day-in-the-life-content-engine'),
  false, 'active'
),
(
  'gear-talk-quarterly-episode', 42, 'library', 'Gear-Talk Quarterly Episode', null, 'Player-led product review episode. 1 per quarter. Hardware/peripheral brand reviews fronted by trusted player voice.',
  'talent', ARRAY['players']::text[], 'managed_series', ARRAY['Evergreen']::text[], null, '{}'::text[],
  165000, null, 'per quarter',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  null,
  false, 'active'
),
(
  'beat-the-pro-fan-activation', 43, 'library', 'Beat the Pro Fan Activation', null, 'Interactive event where fans challenge Falcons pros using brand product. On-site + streamed. Direct product trial loop.',
  'talent', ARRAY['players']::text[], 'hero_moment', ARRAY['Evergreen']::text[], 'beat_the_pro', '{}'::text[],
  240000, null, 'per event',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  null,
  false, 'active'
),
(
  'ramadan-content-push', 44, 'library', 'Ramadan Content Push', null, '8-piece series across Ramadan: 4 Reels + 2 Stories + 1 hero film + 1 community/charity moment. Iftar/Suhoor-themed.',
  'talent', ARRAY['mixed']::text[], 'hero_moment', ARRAY['Ramadan']::text[], null, '{}'::text[],
  420000, null, 'per Ramadan',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  null,
  false, 'active'
),
(
  'riyadh-season-coverage', 45, 'library', 'Riyadh Season Coverage', null, 'Multi-month editorial spanning Riyadh Season events. Tourism + entertainment + Saudi lifestyle narrative.',
  'talent', ARRAY['creators']::text[], 'managed_series', ARRAY['Riyadh_Season']::text[], null, '{}'::text[],
  520000, null, 'per season',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  null,
  false, 'active'
),
(
  'performance-moment-of-the-week', 46, 'library', 'Performance Moment of the Week', null, '1 highlight reel per team per month, pulled from existing VODs by Falcons editors. Players don''t do anything extra.',
  'talent', ARRAY['players']::text[], 'managed_series', ARRAY['Evergreen']::text[], null, '{}'::text[],
  95000, null, 'per quarter',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  (select id from public.activations where slug = 'performance-pc-bundle'),
  false, 'active'
),
(
  'falcons-podcast-title-sponsor', 47, 'library', 'Falcons Podcast Title Sponsor', null, 'Full-season title sponsor of the Falcons Podcast (~600K views per episode). Intro/outro reads, in-episode integration, co-branded clips on social.',
  'content', ARRAY['creators']::text[], 'embedded_partnership', ARRAY['Evergreen']::text[], 'falcons_podcast', '{}'::text[],
  580000, null, 'per season',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  null,
  false, 'active'
),
(
  'falcons-podcast-episode-slot', 48, 'library', 'Falcons Podcast Episode Slot', null, 'Single-episode slot — 60-second mid-roll + outro mention + 1 social cross-post. Entry-tier into podcast inventory.',
  'content', ARRAY['creators']::text[], 'plug_and_play', ARRAY['Evergreen']::text[], 'falcons_podcast', '{}'::text[],
  75000, null, 'per episode',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  null,
  false, 'active'
),
(
  'falcons-academy-title-sponsor', 49, 'library', 'Falcons Academy Title Sponsor', null, '"[Brand] Falcons Academy" — annual title sponsor of the player development pathway. Brand becomes synonymous with next-gen Saudi pros.',
  'talent', ARRAY['players']::text[], 'embedded_partnership', ARRAY['Evergreen']::text[], 'falcons_academy', '{}'::text[],
  1400000, null, 'per year',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  null,
  false, 'active'
),
(
  'academy-year-cohort-story', 50, 'library', 'Academy Year Cohort Story', null, 'BTS series following one Academy class through a season — auditions, bootcamp, first match, first win. Brand as the consistent presence.',
  'talent', ARRAY['players']::text[], 'hero_moment', ARRAY['Evergreen']::text[], 'falcons_academy', '{}'::text[],
  380000, null, 'per cohort',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  null,
  false, 'active'
),
(
  'falcons-vega-title-sponsor', 51, 'library', 'Falcons Vega Title Sponsor', null, '"Vega Powered by [Brand]" — annual sponsor of the women''s esports rosters. MLBB + VALORANT + Overwatch across MENA / SEA / ID.',
  'talent', ARRAY['players']::text[], 'embedded_partnership', ARRAY['Evergreen']::text[], 'falcons_vega', '{}'::text[],
  1100000, null, 'per year',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  null,
  false, 'active'
),
(
  'vega-tournament-coverage-pack', 52, 'library', 'Vega Tournament Coverage Pack', null, 'Women''s competitive moments — on-stream brand integration during Vega tournament runs. MENA women''s audience.',
  'talent', ARRAY['players']::text[], 'hero_moment', ARRAY['EWC','IEM','Worlds','Riyadh_Masters']::text[], 'falcons_vega', '{}'::text[],
  280000, null, 'per event',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  null,
  false, 'active'
),
(
  'falcons-force-junior-pipeline', 53, 'library', 'Falcons Force Junior Pipeline', null, 'CS2 junior team development sponsor. Players age 14-19 — Eastern European pipeline. Long-tail brand association with future tier-1 names.',
  'talent', ARRAY['players']::text[], 'embedded_partnership', ARRAY['Evergreen']::text[], 'falcons_force', '{}'::text[],
  480000, null, 'per year',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  null,
  false, 'active'
),
(
  'ewc-vip-hospitality', 54, 'library', 'EWC VIP Hospitality', null, '8 VIP tickets + skybox at EWC. Backstage / player lounge access. Pure hospitality SKU for partner entertainment.',
  'hospitality', ARRAY['mixed']::text[], 'plug_and_play', ARRAY['EWC']::text[], null, '{}'::text[],
  165000, null, 'per event',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  null,
  false, 'active'
),
(
  'steam-wishlist-drive', 55, 'library', 'Steam Wishlist Drive', null, 'Creator-led 4-piece content arc + 1 hero TikTok in launch week. Drives Steam wishlists and front-page pressure.',
  'publisher', ARRAY['creators']::text[], 'managed_series', ARRAY['Steam_Sales']::text[], null, '{}'::text[],
  285000, null, 'per launch',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  null,
  false, 'active'
),
(
  'battle-pass-launch-stream-pack', 56, 'library', 'Battle Pass Launch Stream Pack', null, '3 streamers × launch day, coordinated 12h coverage. Pop-game battle pass launches that need concurrent-user push.',
  'publisher', ARRAY['players']::text[], 'hero_moment', ARRAY['Launch_Day']::text[], null, '{}'::text[],
  380000, null, 'per launch',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  null,
  false, 'active'
),
(
  'saudi-studio-local-support-push', 57, 'library', 'Saudi Studio Local Support Push', null, '5 talents × launch window, MENA-anchored, full KSA regional creator network. Built for Saudi indie studios under Misk / Savvy initiatives.',
  'publisher', ARRAY['mixed']::text[], 'hero_moment', ARRAY['Launch_Day']::text[], null, '{}'::text[],
  420000, null, 'per launch',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  null,
  false, 'active'
),
(
  'closed-beta-playtest-by-squad', 58, 'library', 'Closed Beta Playtest by Squad', null, 'NDA-bound, pre-launch. One squad provides feedback + post-launch reveal stream. Indie-dev validation + buzz combined.',
  'publisher', ARRAY['players']::text[], 'plug_and_play', ARRAY['Pre_Launch']::text[], null, '{}'::text[],
  165000, null, 'per playtest',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  null,
  false, 'active'
),
(
  'game-launch-tryout-extension', 59, 'library', 'Game-Launch Tryout Extension', null, 'Squad live-tests an unreleased title. Requires NDA + 3 weeks lead. Sub-activation under № 03 Performance/PC.',
  'publisher', ARRAY['players']::text[], 'plug_and_play', ARRAY['Launch_Day']::text[], null, '{}'::text[],
  165000, null, 'per launch',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  (select id from public.activations where slug = 'performance-pc-bundle'),
  false, 'active'
),
(
  'in-game-branded-tournament', 60, 'library', 'In-Game Branded Tournament', null, 'Falcons hosts a custom tournament on the publisher''s title. Leaderboard sponsorship + prize-pool branding + broadcast.',
  'publisher', ARRAY['mixed']::text[], 'hero_moment', ARRAY['Evergreen']::text[], null, '{}'::text[],
  480000, null, 'per tournament',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  null,
  false, 'active'
),
(
  'player-appearance-in-person', 61, 'library', 'Player Appearance — In-Person', null, 'Single named player at brand event. Travel separate. 4-week lead. Brand flagship + activation storefronts.',
  'talent', ARRAY['players']::text[], 'hero_moment', ARRAY['Evergreen']::text[], null, '{}'::text[],
  220000, null, 'per appearance',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  null,
  false, 'active'
),
(
  'player-appearance-virtual-event', 62, 'library', 'Player Appearance — Virtual Event', null, '2-hour virtual commitment. AMA, panel, branded co-stream. Lower-friction than in-person, faster to book.',
  'talent', ARRAY['players']::text[], 'plug_and_play', ARRAY['Evergreen']::text[], null, '{}'::text[],
  75000, null, 'per event',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  null,
  false, 'active'
),
(
  'co-branded-limited-edition-product', 63, 'library', 'Co-Branded Limited-Edition Product', null, 'Co-developed limited-edition product (Samsung × Falcons monitor precedent). Reveal event + content campaign + retail.',
  'content', ARRAY['mixed']::text[], 'embedded_partnership', ARRAY['Evergreen']::text[], null, '{}'::text[],
  1600000, null, 'one-off',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  null,
  false, 'active'
),
(
  'charity-stream-around-major', 64, 'library', 'Charity Stream Around Major', null, '24-hour charity stream tied to a major. 1-3 talents. Brand fronts the cause + activation. CSR-grade narrative.',
  'stream', ARRAY['players']::text[], 'hero_moment', ARRAY['EWC','IEM','Worlds','Riyadh_Masters']::text[], null, '{}'::text[],
  320000, null, 'per event',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  null,
  false, 'active'
),
(
  'creator-product-review', 65, 'library', 'Creator Product Review', null, 'Creator-led product showcase — gaming monitor reviews, peripherals, hardware. Native creator voice, not adapted.',
  'talent', ARRAY['creators']::text[], 'managed_series', ARRAY['Evergreen']::text[], null, '{}'::text[],
  220000, null, 'per piece',
  null, null, null, null,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null,
  null,
  false, 'active'
);

-- =============================================================================
-- End of migration 070 — 65 activations seeded.
-- =============================================================================