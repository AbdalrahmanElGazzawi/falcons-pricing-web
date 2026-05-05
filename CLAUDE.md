# CLAUDE.md — Falcons Pricing OS · Session Bootstrap

**Read this file FIRST in every new Cowork session before doing anything.** It tells you what the project is, where the canonical truth lives, what's connected, and how to ship safely.

> **Last refreshed:** 2026-05-05 (post Mig 056 + talent-intake / agency gross-up).
> Live state numbers in this doc are accurate as of that date but **drift quickly** — always verify against Supabase before quoting them back to Koge.

---

## Project

Internal talent-pricing engine for Team Falcons. Sales build quotes for brand campaigns featuring Falcons esports players, content creators, and influencers. Engine encodes a CPM-anchored methodology calibrated to MENA market vs FaZe / Cloud9 / T1 / NRG / 100T benchmarks.

**Owner:** Koge (Commercial). Email: `abdghazzawi1@gmail.com`.
**Stack:** Next.js 14 (App Router) + Supabase (Postgres + Auth) + Tailwind. Hosted on Vercel.
**Currency:** SAR is canonical. 1 USD = 3.75 SAR (Saudi peg, locked).

---

## Canonical references — READ BEFORE TOUCHING ANYTHING

| File | What it is | When to consult |
|---|---|---|
| `Falcons-Pricing-SOT-v1.0.md` (or `.docx`) | Source of Truth v1.0 — methodology, formula, tier baselines, sources | Every pricing question. **Note:** v1.0 predates the Floor-First refactor (Mig 030) and the world-class axes (Mig 042). Treat it as the principles doc; treat `src/lib/pricing.ts` as the operational truth. |
| `falcons-market-value-reference.xlsx` | Per-talent benchmark sheet — current rate vs realistic mid vs verdict per talent | Auditing, before changing any rate |
| `Falcons_Extreme_Roster_Dossier 5_3_2026.xlsx` | The dossier ingested by Mig 046 (206 talents) | Per-talent socials/IRL ground truth post-May 3 |
| `Website Esport Data Entry.xlsx` | Spreadsheet SOT for handle rebrands. Note: occasionally stale — always WebSearch-verify before applying rebrands (see Mig 054 → 055 lesson) | Roster handle hygiene |
| `market-audit-memo.md`, `market-audit-memo-shikenso-impact-2026-04-30.md` | Audit findings + Shikenso impact analysis | Background context |
| `repricing-019-preview.csv`, `full-roster-audit-2026-04-27.csv`, `methodology-refresh-2026-04-27.csv` | Historical audit artifacts (April 27 audit) | Cross-reference for past changes |
| `supabase/migrations/` | DB migration history. **Latest = `056_agency_fee_pct_for_intake.sql`.** Always re-check `ls supabase/migrations/ \| tail -3` before assuming. | Before writing new migrations |

If anything in the codebase contradicts the SOT principles, the SOT principles win. If the SOT *numbers* contradict pricing.ts, **pricing.ts wins** — it's been refactored past v1.0.

---

## Connected services

### Supabase (live, MCP-connected)

- **Project ID:** `eectdiminjrthbqatwxv`
- **Region:** `eu-central-1`
- **Read access:** via Supabase MCP — query players, creators, quotes, etc.
- **Write access:** via Supabase MCP `apply_migration` or `execute_sql`. **DO NOT WRITE without explicit Koge approval per session.** Always show the SQL diff first.
- **Service role key:** in `.env.local` (UTF-16; use `iconv -f UTF-16 -t UTF-8` to read).

### Vercel (MCP-connected)

- **Team ID:** `team_Qv9mvzrn08DIYqEQtuE2ug8B`
- **Project ID:** `prj_KAoVUXAaes93VA8XeJvc20FeGY9n`
- **Project name:** `falcons-pricing-web`
- **Auto-deploy on push to `main`** (~2-min build). Use Vercel MCP `list_deployments` to verify state, not assumption.

### GitHub (push via PAT)

- **Repo:** `AbdalrahmanElGazzawi/falcons-pricing-web`
- **Default branch:** `main`
- **PAT location:** `outputs/.gh-pat` (never commit). Ask Koge for a fresh one if missing.

### Shikenso (in-flight, NOT a full per-platform refresh)

- **Status:** integrated for player; **demo data scope is Instagram + Facebook only**. The rest of the engagement falls under Shikenso's standard sponsorship-valuation SOW (brand exposure / asset value), **not** per-platform demographic deep-data for TikTok / YouTube / Twitch / Kick / X.
- **Implication:** the SOT v1.0 vision of "Shikenso → ~70% auto-resolve weekly across all platforms" is **not** what we're getting. Don't promise that to anyone.
- **What we got instead for non-IG/FB platforms:** the Liquipedia scraper (Mig 022, `src/lib/liquipedia.ts`) for tournament data, plus the Falcons Extreme Roster Dossier ingest (Mig 046).

---

## Local workspace vs GitHub — IMPORTANT

The workspace folder at `C:\Users\ASUS\OneDrive\Desktop\falcons-pricing-web` is in OneDrive and **frequently drifts behind `main` on GitHub**. Koge sometimes pushes commits via the website / other tools that don't sync back to the OneDrive folder.

**Always treat GitHub as the source of truth for code.** Never push from the OneDrive folder directly. Workflow:

1. Clone fresh from GitHub into `/tmp/deploy/repo` (or `/tmp/falcons-pricing-web`) using the PAT
2. Make targeted edits in the clone (use the OneDrive workspace as REFERENCE, not as the deploy source)
3. `git diff` before committing — and **show Koge the diff before pushing**
4. Push from the clone

If you need to push, the recipe that works:

```bash
PAT=$(cat /sessions/.../mnt/outputs/.gh-pat)
mkdir -p /tmp/deploy && cd /tmp/deploy
git clone --depth 5 "https://${PAT}@github.com/AbdalrahmanElGazzawi/falcons-pricing-web.git" repo
cd repo
# ... apply edits surgically against THIS version, not the workspace ...
git add <specific files only>
git commit -m "..."
git push origin main
```

**Never `cp -r` the entire workspace into the clone** — line-ending differences will produce 500+ false-positive diffs and risk overwriting recent commits.

---

## Pricing methodology — operational truth (post Mig 030 + Mig 042)

```
Final Unit = MAX(SocialPrice, AuthorityFloor) × ConfidenceCap × (1 + RightsPct) × CompanionMult
             ↑ then floor-clamped to effBaseFee for non-companion lines (Mig 030)

  SocialPrice    = effBaseFee × Eng × Aud × Seas × CType × Lang × AuthFactor
                   × ProductionStyle × StreamActivity
                   × AudCountryMix × AudAgeDemo × IntegrationDepth
                   × FirstLook × RealTimeLive × LifestyleContext × BrandSafety
                   × CollabDiscount
                   × StreamingConsistency × ChatHealth × CrossGameVersatility

  AuthorityFloor = effIRL × FloorShare × Seas × Lang × AuthFactor × AchievementDecay

  effBaseFee     = baseFee × ChannelMultiplier
                   (direct_brand 1.00 / agency_brokered 0.65|0.50|0.35 / strategic_account 0.65)
  AuthFactor     = 1 + ObjectiveWeight × (Authority − 1)
```

**Tier baseline table** (still holds, IG Reel SAR): Tier S 28k · Tier 1 18k · Tier 2 11k · Tier 3 6.5k · Tier 4 3.5k.

**Platform ratios** (still hold): IG Reel 1.00 · IG Static 0.65 · IG Story 0.55 · TikTok 0.78 · YT Full 2.50 · YT Pre-roll 1.30 · YT Short 0.32 · X Post 0.20 · Twitch/Kick stream 1.45 · IRL 2.20 · 1-Month Usage 1.50.

**Floor-First model (Mig 030):** `base_rate_anchor` is the IG-Reel floor. Multipliers stack ABOVE the floor; engine clamps `finalUnit` up to `effBaseFee` for any non-companion line. `enforceFloor=true` is the default. Companion lines bypass the floor (their fee = 0.5 × solo by design).

**DataCompleteness** (replaces the legacy `MeasurementConfidence`):
- `full` — no axis caps, ConfidenceCap 1.00
- `socials_only` — Authority capped at 1.15, ConfidenceCap 0.95
- `tournament_only` — Eng/Aud locked at 1.00, ConfidenceCap 0.95
- `minimal` — all axes locked at 1.00, ConfidenceCap 0.85

Old `pending|estimated|rounded|exact` values still exist on stored quote rows for back-compat; the active driver is `data_completeness`.

**Rights uplift bands** (still hold): None 0% · Basic +15% · Standard +60% · Premium +115% · Full +170% · Exclusive +320%.

**Channel multiplier (Mig 035)** scales `baseFee` and `irl` *before* axes. Sales channel determines the floor.

**Talent-submitted floor + agency gross-up (Mig 056, May 5).** A second floor layer sits ON TOP of the engine output. Talent fills `/talent/<token>` (a public, token-gated intake form) with their per-deliverable minimum rate + agency status + agency fee %. At quote time the engine computes its own number, then:

```
grossedFloor = talentSubmittedFloor × (1 + agencyFeePct/100)   // agencyFeePct clamped to [0, 50]
finalUnit    = max(engineFinalUnit, grossedFloor)              // companion lines bypass
```

The `LineOutput` exposes a `priceController` field — `'engine' | 'base_floor' | 'talent_floor'` — that tags which input controlled the unit price, so the WhyPrice popover (Phase 6) can show the breakdown. Talents without an intake on file (`talentSubmittedFloor = 0`) are a no-op; engine truth applies. New columns on `players`: `agency_fee_pct numeric(5,2)` (Mig 056), plus `min_rates jsonb`, `min_rates_notes`, `intake_status` (`not_started | sent | submitted | revised | approved`), `intake_submitted_at`.

---

## Common operations

### Pull live state of the roster

Use the Supabase MCP `execute_sql`:
```sql
select tier_code, count(*) from public.players where is_active group by tier_code;
select rate_source, count(*) from public.players where is_active group by rate_source;
```

### Apply a migration

1. Write the SQL file in `supabase/migrations/0XX_*.sql`. Number the file sequentially after the highest existing migration. Latest currently = **056**.
2. Apply via Supabase MCP `apply_migration`, OR Koge applies via Supabase SQL editor.
3. **Never apply without showing Koge the SQL first.**

### Deploy code

See "Local workspace vs GitHub" above. Edit-in-clone, `git diff`, **show Koge**, commit, push. Never push from OneDrive workspace.

### Build a quote

`/quote/new` → Campaign tab → fill client / pick currency (SAR or USD toggle in tab strip) → Build tab → add talent + deliverables → Summary tab → submit.

### Live methodology page vs onboarding page

- `/welcome` — first-visit onboarding page (don't merge with /about)
- `/about` — public-facing methodology overview
- `/pricing-logic` — the live operational methodology page (PricingLogicContent.tsx)
- `/admin/pricing` — the live pricing console (PricingConsole.tsx)
- `/talent/<token>` — public talent intake form (no auth; token in URL is the gate). PUBLIC_PATHS in middleware bypasses auth for this prefix.

---

## What's currently TRUE about pricing state (May 5, 2026)

- **Migrations 001-056 applied.** Numbering has gaps (no 026-029, 035-044) — that's intentional, not missing files.
- **Active roster:** 183 players + 16 creators. Tier counts: S 12 · 1 34 · 2 18 · 3 112 · 4 7. Saved quotes: 4. `market_bands`: 185 rows. `channel_multipliers`: 5 rows.
- **`rate_source` distribution (active players):** `reach_calibrated` 94 · `tier_baseline` 83 · `unverified` 2 · `methodology_v2_with_data` 1 · NULL 3.
  - `reach_calibrated` is the post-Mig 030 dominant source — talents whose floor was set from real reach math.
  - `tier_baseline` residual is largely low-data international pros + staff.
  - `methodology_v2_with_data` is the SOT v1.0 legacy tag, effectively retired.
  - 2 `unverified` rows must be blocked from quoting.
- **Recent activity (May 1-5):** Falcons Extreme Roster Dossier ingest (Mig 046) and a roster-data hygiene pass (047-055): bare-handle URL expansion, REMUNDO/LIV/Abo Ghazi drift fix, full-roster wrong-person socials audit, Livii IG correction, Abo Najd K2NN8 confirmation, 8 SOT rebrands of which 5 were reverted on WebSearch verification (net: 3 kept, 5 reverted). **May 5 morning:** talent-intake flow shipped end-to-end — `/talent/<token>` form with regional + world benchmark anchors and 3-zone (Floor/Median/Premium) deal-flow framing, agency gross-up engine layer (Mig 056), `priceController` output, WhyPrice popover Phase 6.
- **Engine state:** Floor-First (Mig 030) + Channel multiplier (Mig 035) + ProductionStyle (Mig 039) + StreamActivity (Mig 040) + World-class axes (Mig 042) + Talent-floor / agency gross-up (Mig 056) all live. Pre-039 lower anchors deliberately restored in Mig 045.

For the per-talent state, open `falcons-market-value-reference.xlsx` (refresh date may lag — also cross-check the dossier).

### Known incomplete wiring

These are accepted by `LineInput` in `pricing.ts` but **not yet consumed** by the SocialPrice math (passed through, surfaced in PDF, but not factored):
- `brandLoyaltyPct`
- `exclusivityPremiumPct`
- `crossVerticalMultiplier`
- `engagementQualityModifier`

`productionStyleMultiplier` IS wired. The four above are deliberate phase-2 follow-ups per the comment in pricing.ts. Confirm with Koge before wiring any of them.

### Known unfinished work / open opportunities

- **Rights/exclusivity uplift gap closure.** SOT §13 flagged Falcons underprices exclusivity (+10pp) and rights (+5-10pp) vs industry. No migration has closed this gap yet.
- **Unverified quote-blocking UI.** 2 talents tagged `unverified`; verify `/quote/new` actually blocks them.
- **Intake coverage rollout.** `/talent/<token>` is live but most players have no intake on file yet. Engine progressively shifts to talent-controlled floors as intakes come in. No engine work needed — operational push to send tokens.
- **Shikenso non-IG/FB coverage.** Won't come from Shikenso (their demo is IG+FB only). Liquipedia + dossier do the rest.

---

## Hard rules — DO NOT BREAK

1. **The Saudi peg is 3.75 SAR/USD. Locked.** Don't expose an editable FX rate field anywhere in the UI.
2. **Never commit the GitHub PAT, Supabase service key, or any secret to the repo.** They live in `.env.local` (Supabase) or `outputs/.gh-pat` (PAT) — both excluded from git.
3. **Never push to `main` without showing Koge the diff first.** Vercel auto-deploys on push; a bad push goes live immediately.
4. **Never apply a Supabase migration without showing Koge the SQL first.**
5. **Never overwrite the SOT or the audit memos without explicit instruction.** They're versioned reference docs.
6. **The currency context** (`src/lib/currency/Currency.tsx`) hardcodes the rate to 3.75. The CurrencySwitcher only toggles SAR ↔ USD, no rate editing.
7. **`/welcome` is the first-visit onboarding page. `/about` is the public methodology page. `/pricing-logic` is the operational methodology page. Don't merge them.**
8. **Roster handle rebrands from spreadsheet SOT — always WebSearch-verify before applying.** The "Website Esport Data Entry.xlsx" was stale on 5 of 8 rebrands in Mig 054. Mig 055 reverted them. Lesson: SOT spreadsheets aren't always authoritative for handle hygiene.

---

## When in doubt

Ask Koge a clarifying question rather than guessing. He's commercial, prefers direct over flowery, will tell you if you're over-engineering.

If something feels too easy and you're about to ship it without review — stop, write the diff, show him, then ship.
