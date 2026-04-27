-- ═══════════════════════════════════════════════════════════════════════
-- Migration 020 — SOT v1.0 multiplier corrections + roadmap content refresh
-- ═══════════════════════════════════════════════════════════════════════
-- Two complementary pieces:
--
--   1) addons table — bring the rights / exclusivity / rush bands up to the
--      industry-standard mid-points called out in SOT Section 13 (Table 46).
--      Falcons was 5–10 percentage points light on most of these.
--
--   2) pricing_kb section='roadmap' — replace the old phase entries with the
--      3-state model from SOT Section 10 plus the evolution components that
--      reflect Migration 019/020 / Shikenso / multiplier corrections.
--
-- Generated: 2026-04-27
-- ═══════════════════════════════════════════════════════════════════════

-- ─── 1. addons multiplier corrections ─────────────────────────────────────
-- Increase rights / exclusivity / whitelisting bands per SOT Table 46.
-- Net opportunity flagged in audit: ~+5–10% on rights packages.

update public.addons set uplift_pct = 0.50, description = 'No competing brand in category for 90 days (SOT-aligned 0.50)'
  where label = 'Exclusivity 90d (category)';

update public.addons set uplift_pct = 0.25, description = 'No competing brand in category for 30 days (SOT-aligned 0.25)'
  where label = 'Exclusivity 30d (category)';

update public.addons set uplift_pct = 0.25, description = 'Delivery under 72 hours — premium fee (SOT-aligned 0.25)'
  where label = 'Rush / <72h turnaround';

update public.addons set uplift_pct = 0.25, description = 'Enable brand to run Spark Ads from talent handle (SOT-aligned 0.25)'
  where label = 'Whitelisting / Spark Ads';

update public.addons set uplift_pct = 0.35, description = 'Media spend boost, MENA region, 90 days (SOT-aligned 0.35)'
  where label = 'Paid Usage 90d MENA';

-- Add explicit 6-month and 12-month usage rights bands per SOT Table 46.
insert into public.addons (label, uplift_pct, description, sort_order)
select 'Usage Rights 6 months', 0.35, 'Likeness license + content reuse, 6 months (SOT-aligned 0.35)', 16
where not exists (select 1 from public.addons where label = 'Usage Rights 6 months');

insert into public.addons (label, uplift_pct, description, sort_order)
select 'Usage Rights 12 months', 0.60, 'Likeness license + content reuse, 12 months (SOT-aligned 0.60)', 17
where not exists (select 1 from public.addons where label = 'Usage Rights 12 months');

-- ─── 2. pricing_kb — refresh roadmap content to SOT v1.0 ─────────────────
-- Strategy: deactivate every existing roadmap row, then insert the SOT-aligned
-- set. Order is States → Phases → Evolution components.

update public.pricing_kb set is_active = false where section = 'roadmap';

insert into public.pricing_kb (section, title, body, icon, tone, sort_order, is_active) values

-- ─ States (SOT Section 10) ────────────────────────────────────────────────
('roadmap', 'Phase 1 — Today (April 27, 2026 onward)',
'Methodology v2 is live. The pricing engine implements the 9-axis formula end-to-end, anchored to industry sources (WME/CAA/Wasserman, Newzoo, Nielsen, Influencity, StreamElements, Porter Wills).

What is shipped:
• Tier baselines locked: Tier S 28K · Tier 1 18K · Tier 2 11K · Tier 3 6.5K · Tier 4 3.5K SAR (IG Reel anchor)
• 22 reference platform ratios applied across every deliverable
• rate_source taxonomy on every talent (methodology_v2_with_data · tier_baseline · negotiated_card · manual_override · unverified)
• audience_market column (MENA · NA · EU · APAC · GLOBAL) — unlocks region-specific multipliers
• Migration 019 — full-roster repricing: 185 players + 17 creators repriced to methodology
• Migration 020 — multiplier corrections: 90-day exclusivity 0.35→0.50, rush 0.20→0.25, +6mo / +12mo usage rights bands

Confidence today:
• 22 talents: HIGH (data-driven, methodology_v2_with_data)
• ~170 talents: BASELINE (tier-classified, awaiting Shikenso for HIGH)

Where commercial sees it: /admin/players shows the rate_source badge on every row. Quote PDF itemises the Falcons-add stack so every line is defensible against the contract.',
'CheckCircle2', 'green', 10, true),

('roadmap', 'Phase 2 — With Shikenso (Thursday onward, ramping over 4 weeks)',
'Shikenso pulls live follower + engagement + demographic data weekly. ~60–70% of the roster auto-resolves to HIGH confidence (~144 talents).

What changes:
• Method 1 (CPM) and Method 2 (CPE) become precise per talent — no more 1.20× default audience multiplier
• Engagement multiplier flips from 1.00 default to data-driven (0.7×–1.6× range)
• Audience quality multiplier flips from 1.20 default to data-driven (1.0×–1.5× range)
• Pricing Variance Register: every quote that closes outside ±15% of engine recommendation is logged with reason; bands recalibrate on rolling 60-day windows

What stays the same:
• The formula
• Tier baselines (used as fallback for uncovered talent)
• Platform ratios
• Add-on rights packages
• Authority Floor logic for pros

Confidence post-Shikenso: ~144 HIGH · ~30–40 MEDIUM (manual data entry quarterly) · ~15–20 BASELINE (tier-only, e.g. coaches).',
'TrendingUp', 'amber', 20, true),

('roadmap', 'Phase 3 — Steady State (≈ July 2026, 3 months in)',
'Operational rhythm:
• Monday 02:00 SAR — Shikenso sync runs. Follower / engagement / demographic data refreshes.
• Monday morning — admin sees pending rate changes in /admin/players for any talent with >10% methodology delta.
• Tuesday — commercial reviews and approves changes in batch.
• Quarterly — manual data refresh for the ~15–20% Shikenso doesn''t cover.
• Annually — tier baseline calibration review against fresh industry benchmarks.

The engine is alive. Every rate has a source, every change is logged, every quote is defensible against a documented methodology — not a negotiation memory.',
'Activity', 'navy', 30, true),

-- ─ Evolution components (cross-cutting upgrades) ──────────────────────────
('roadmap', 'Methodology v2 engine — locked',
'The single formula: Final = MAX(SocialPrice, AuthorityFloor) × ConfidenceCap × (1 + RightsUplift) × CompanionMultiplier.

SocialPrice = MAX of up to 5 base-rate methods: CPM-on-followers, CPE-on-engagements, Comparable benchmarks (FaZe / T1 / Cloud9 ranges), Tier baseline lookup, ACV-based for streaming.

AuthorityFloor protects pros: Tier 1 IRL × FloorShare × multipliers — never quote below the IRL appearance value of a competitive player.

ConfidenceCap penalises weak data: 0.75× pending, 0.90× estimated, 1.00× rounded/exact.

The methodology engine does not change. What changes is data quality.',
'Calculator', 'green', 100, true),

('roadmap', 'rate_source taxonomy — live',
'Every rate cell carries a source tag, visible to commercial on /admin/players:

• methodology_v2 — Shikenso-driven (HIGH)
• methodology_v2_with_data — internal data + methodology (HIGH)
• negotiated_card — locked to a signed rate card (LOCKED, auto-refresh skips)
• manual_override — hand-edited without card (MEDIUM)
• tier_baseline — default tier × ratio (BASELINE)
• tier_baseline_legacy — pre-methodology seed, refresh within 30 days of Shikenso go-live (LOW)
• unverified — DO NOT QUOTE; escalate to commercial

Every rate change writes a row to audit_log with old/new value, source, timestamp, user.',
'GitBranch', 'green', 110, true),

('roadmap', 'Audit register — April 27, 2026 baseline',
'Full-roster audit against the methodology engine — 196 talents × ~16 deliverables = 2,879 cells reviewed.

Findings:
• 2,342 lines under-priced by >25% (system was structurally light)
• 324 lines aligned (within ±25%)
• 175 lines over-priced by >25% (mostly Kick column, seeded from Twitch parity)
• 38 lines with rate = 0 (needs seeding or "talent doesn''t offer" tag)

16 tier-classification mismatches resolved (all upward): 9leeh, Drb7h, FZX, Hamad, SaudCast → T1; 3ADEL, Abu abeer, LLE, Oden, RAED, xSMA333 → T1; oPiiLz → T S; Bijw, vacwep → T2; FMG → T4; Abo Ghazi flagged for verification.

Net opportunity: ~17.6M SAR/year if every methodology gap closes. Realistic 12-month lift: 4–6M SAR.',
'AlertCircle', 'amber', 120, true),

('roadmap', 'Multiplier corrections (Migration 020)',
'Shipped today. Brought rights / exclusivity / whitelisting bands up to industry mid-points per SOT Section 13:

• Exclusivity 30 days: 0.25 (held)
• Exclusivity 90 days: 0.40 → 0.50 (+10pp)
• Rush <72h: 0.20 → 0.25 (+5pp)
• Whitelist / Dark Post: 0.20 → 0.25 (+5pp)
• Paid Usage 90d MENA: 0.30 → 0.35 (+5pp)
• Usage Rights 6 months: NEW band at 0.35
• Usage Rights 12 months: NEW band at 0.60

Net effect on the average rights bundle: +5–10%. Every change is documented, sourced, and defensible against industry norms.',
'Sparkles', 'green', 130, true),

('roadmap', 'Pricing Variance Register',
'Status: Next.

Every quote that closes outside ±15% of engine recommendation is logged with reason (relationship discount, competitor match, repeat-client, exclusivity trade, etc.). Bands recalibrate on rolling 60-day windows.

Once Shikenso lands, the register becomes the input that retunes the model — closed deals teach the engine, not just price it. Drift becomes data, not noise.',
'Eye', 'navy', 140, true),

('roadmap', 'Shikenso integration',
'Status: Building (Thursday onward).

Pulls follower + engagement + audience demographic data per talent, weekly. Replaces the manual data-entry layer for ~70% of roster.

When live: methodology_v2_with_data ages out automatically, replaced by methodology_v2. Rate refreshes propagate to /admin/players with a "pending review" flag — commercial approves in batch on Tuesday mornings.',
'Globe', 'amber', 150, true),

('roadmap', 'Tier baseline calibration review',
'Status: Future (annual).

Re-validate Tier S/1/2/3/4 baselines against fresh industry benchmarks. Sources to refresh annually: Newzoo Global Esports Report, Nielsen Esports Audience Report, Influencity Rate Card, StreamElements State of Streaming, Porter Wills Esports Marketing Guide.

Material changes (>5% impact on Tier 1 or above) trigger a sales rep briefing.',
'Calendar', null, 160, true);

-- ─── 3. Sanity checks (run after applying) ────────────────────────────────
-- select label, uplift_pct from public.addons where label like '%Exclusivity%' or label like '%Rush%' or label like '%Usage Rights%' order by sort_order;
-- select section, count(*) from public.pricing_kb where is_active = true group by section;
-- select title, sort_order from public.pricing_kb where section='roadmap' and is_active=true order by sort_order;
