# CLAUDE.md — Falcons Pricing OS · Session Bootstrap

**Read this file FIRST in every new Cowork session before doing anything.** It tells you what the project is, where the canonical truth lives, what's connected, and how to ship safely.

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
| `Falcons-Pricing-SOT-v1.0.md` (or `.docx`) | Source of Truth — methodology, formula, tier baselines, sources | Every pricing question |
| `falcons-market-value-reference.xlsx` | Per-talent benchmark sheet — current rate vs realistic mid vs verdict per talent | Auditing, before changing any rate |
| `market-audit-memo.md` and `market-audit-memo-shikenso-impact-2026-04-30.md` | What the audit found, how Shikenso changes things | Background context |
| `repricing-019-preview.csv`, `full-roster-audit-2026-04-27.csv`, `methodology-refresh-2026-04-27.csv` | Historical audit artifacts | Cross-reference for changes |
| `supabase/migrations/` | DB migration history. Latest = `020_sot_v1_multipliers_and_kb.sql` | Before writing new migrations |

If anything in the codebase contradicts the SOT, the SOT wins. Update the codebase, not the SOT.

---

## Connected services

### Supabase (live, MCP-connected)

- **Project ID:** `eectdiminjrthbqatwxv`
- **Region:** `eu-central-1`
- **Read access:** via Supabase MCP — query players, creators, quotes, etc.
- **Write access:** via Supabase MCP `apply_migration` or `execute_sql`. **DO NOT WRITE without explicit Koge approval per session.** Always show the SQL diff first.
- **Service role key:** in `.env.local` (UTF-16; use `iconv -f UTF-16 -t UTF-8` to read).

### GitHub (push via PAT)

- **Repo:** `AbdalrahmanElGazzawi/falcons-pricing-web`
- **Default branch:** `main`
- **Vercel auto-deploys from main** — every push to main rebuilds production within ~2 minutes.
- **PAT location:** stashed at `/sessions/<id>/mnt/outputs/.gh-pat` if a previous session put it there. Otherwise ask Koge for a fresh one. Never commit the PAT to the repo.

### Vercel

- Auto-deploy on push to `main`. No direct Vercel MCP — interact via GitHub push only.

---

## Local workspace vs GitHub — IMPORTANT

The workspace folder at `C:\Users\ASUS\OneDrive\Desktop\falcons-pricing-web` is in OneDrive and **frequently drifts behind `main` on GitHub**. Koge sometimes pushes commits via the website / other tools that don't sync back to the OneDrive folder.

**Always treat GitHub as the source of truth for code.** Never push from the OneDrive folder directly. Workflow:

1. Clone fresh from GitHub into `/tmp/deploy/repo` using the PAT
2. Make targeted edits in the clone (use the OneDrive workspace as REFERENCE, not as the deploy source)
3. `git diff` before committing
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

## Pricing methodology — 30-second version

```
Final Price = MAX(SocialPrice, AuthorityFloor) × ConfidenceCap × (1 + RightsUplift)

  SocialPrice    = BaseRate × Engagement × Audience × Seasonality × ContentType × Language × AuthorityFactor
  AuthorityFloor = IRL × FloorShare × Seasonality × Language × AuthorityFactor

  BaseRate is looked up from the tier table (S/1/2/3/4) × platform ratio:
    Tier S = 28,000 SAR IG Reel · Tier 1 = 18,000 · Tier 2 = 11,000 · Tier 3 = 6,500 · Tier 4 = 3,500
    IG Reel = 1.00, IG Post = 0.65, IG Story = 0.55, TikTok = 0.78, YT Full = 2.50,
    YT Pre-roll = 1.30, YT Short = 0.32, X Post = 0.20, Twitch/Kick stream = 1.45,
    IRL = 2.20, 1-Month Usage = 1.50.
```

Multipliers apply at quote time, not baked into base. Tier baseline lookup is the floor for talents without follower data; methodology with real CPM math runs for talents with verified follower counts.

---

## Common operations

### Pull live state of the roster

Use the Supabase MCP `execute_sql`:
```sql
select tier_code, count(*) from public.players where is_active group by tier_code;
select rate_source, count(*) from public.players where is_active group by rate_source;
```

### Apply a migration

1. Write the SQL file in `supabase/migrations/0XX_*.sql`. Number the file sequentially after the highest existing migration.
2. Show Koge the SQL diff for approval.
3. After approval: `apply_migration` via MCP, OR Koge applies via Supabase SQL editor.

### Deploy code

See "Local workspace vs GitHub" above. Edit-in-clone, commit, push. Never push from OneDrive workspace.

### Build a quote

`/quote/new` → Campaign tab → fill client / pick currency (SAR or USD toggle in tab strip) → Build tab → add talent + deliverables → Summary tab → submit.

---

## What's currently TRUE about pricing state (April 30 2026)

- Migrations 001-020 applied. `rate_source` and `audience_market` columns exist on `players` and `creators`.
- Top Saudi creators (BanderitaX, oPiiLz, Aziz, Drb7h, etc.) are at proper methodology rates (`methodology_v2_with_data` source).
- Most international esports players are at `tier_baseline` placeholder rates pending Shikenso data — NiKo, m0NESY, Hikaru, ImperialHal currently sit at SAR 11,250 IG Reel which is roughly 75% below realistic market value.
- 144 of 200 talents are tagged LOW confidence — Shikenso integration unlocks real per-talent CPM math for ~70% of them.
- 1 talent flagged UNVERIFIED (Abo Ghazi) — block quoting until his actual YouTube reach is verified.

For the per-talent state, open `falcons-market-value-reference.xlsx`.

---

## Hard rules — DO NOT BREAK

1. **The Saudi peg is 3.75 SAR/USD. Locked.** Don't expose an editable FX rate field anywhere in the UI.
2. **Never commit the GitHub PAT, Supabase service key, or any secret to the repo.** They live in `.env.local` (Supabase) or `outputs/.gh-pat` (PAT) — both excluded from git.
3. **Never push to `main` without showing Koge the diff first.** Vercel auto-deploys on push; a bad push goes live immediately.
4. **Never apply a migration without showing Koge the SQL first.**
5. **Never overwrite the SOT or the audit memos without explicit instruction.** They're versioned reference docs.
6. **The currency context** (`src/lib/currency/Currency.tsx`) hardcodes the rate to 3.75. The CurrencySwitcher only toggles SAR ↔ USD, no rate editing.
7. **`/welcome` is the first-visit onboarding page. `/about` is the canonical methodology page. Don't merge them.**

---

## When in doubt

Ask Koge a clarifying question rather than guessing. He's commercial, prefers direct over flowery, will tell you if you're over-engineering.

If something feels too easy and you're about to ship it without review — stop, write the diff, show him, then ship.
