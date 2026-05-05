# Cowork Session Bootstrap Prompt

**How to use:** open a new Cowork chat with this folder selected, paste the block below as your first message, fill in the `<...>` placeholders, send.

---

## The prompt

```
I'm Koge (Commercial, Team Falcons). Working on the Pricing OS web app.

WORKSPACE
  C:\Users\ASUS\OneDrive\Desktop\falcons-pricing-web (already selected in Cowork)

CONNECTED SERVICES — verify access first
  1. Supabase MCP → project `eectdiminjrthbqatwxv`. Confirm you can query
     `select count(*) from public.players where is_active`. If you get a
     permission error, stop and tell me.
  2. Vercel MCP → team `team_Qv9mvzrn08DIYqEQtuE2ug8B`, project
     `falcons-pricing-web` (id: prj_KAoVUXAaes93VA8XeJvc20FeGY9n).
     Confirm `list_deployments` returns recent deploys.
  3. GitHub PAT → I'll paste below. Stash it at outputs/.gh-pat. Repo:
     AbdalrahmanElGazzawi/falcons-pricing-web. Default branch: main.

GitHub PAT (rotate after this session if you want):
  <PASTE FRESH ghp_... TOKEN HERE>

READ FIRST — DO NOT SKIP
  1. CLAUDE.md (workspace root) — full bootstrap doc. Methodology, services,
     deploy flow, hard rules.
  2. Falcons-Pricing-SOT-v1.0.md — pricing methodology canon.
  3. supabase/migrations/ → check the LATEST file. The repo evolves fast;
     CLAUDE.md may be stale on migration count. Use the actual file list as
     truth.
  4. falcons-market-value-reference.xlsx — per-talent state snapshot.

VERIFY ACTUAL STATE (before doing anything that touches data or code):
  • Latest migration number on disk:
      ls supabase/migrations/ | tail -3
  • Latest commit on main:
      cd /tmp && git clone --depth 1 \
        "https://${PAT}@github.com/AbdalrahmanElGazzawi/falcons-pricing-web.git" \
        check && cd check && git log --oneline -3
  • Live Vercel deployment status:
      list_deployments via Vercel MCP, look for newest READY entry
  • Live database tier counts:
      execute_sql `select tier_code, count(*) from public.players
                   where is_active group by tier_code`

If any of those four checks contradicts CLAUDE.md, trust the live state, not
the file. Tell me which contradicted and I'll update CLAUDE.md.

DEPLOY FLOW (mandatory recipe — proven to work)
  1. NEVER push from the OneDrive workspace folder. OneDrive drifts.
  2. Clone fresh into /tmp using PAT.
  3. Apply targeted edits in the clone (use OneDrive workspace as REFERENCE,
     not as deploy source).
  4. `git diff` and SHOW ME before committing.
  5. After my approval: commit with a clear message, push to main.
  6. Vercel auto-deploys from main within ~2 min. Verify with
     list_deployments.

HARD RULES
  • Saudi peg is 3.75 SAR/USD. Locked. Never expose an editable FX field.
  • Never commit secrets (PAT, service key) to the repo.
  • Never push without showing me the diff first. Vercel auto-deploys.
  • Never apply a Supabase migration without showing me the SQL first.
  • If unsure whether a change is safe — ask. Don't guess.

NOW WHAT I WANT YOU TO DO:

  <DESCRIBE THE TASK HERE>

When you start, give me a 4-line summary first:
  - Latest migration on main: <###>
  - Latest commit hash on main: <hash + first line of message>
  - Latest Vercel deploy: <state, age>
  - Anything in CLAUDE.md that looks stale: <yes/no, what>

Then proceed with the task above.
```

---

## Why this works

**Verifies state before acting.** The "VERIFY ACTUAL STATE" block forces the new session to look at GitHub + Supabase + Vercel directly, not just trust a stale doc. The repo moves fast — without this step, sessions risk writing migration `021` when reality is at `055+`.

**Forces the safe deploy recipe.** The OneDrive-vs-GitHub gotcha caught me earlier in this session and would catch any new session too. Spelling out "clone fresh, edit in clone, never push from OneDrive" prevents the next session from making the same mistake I did.

**Explicit credentials block.** Putting the PAT inline in the prompt (after the "I'll paste below" line) means the new session immediately knows where to find it. You can rotate after each session — GitHub → Settings → Developer settings → Personal access tokens.

**Hard rules surfaced upfront.** No FX edit field, no secrets in repo, no push without diff. These are the rules that protect production. A new session sees them in turn one.

**Required summary on start.** The 4-line summary the prompt asks for is the new session's "I understand the state" handshake. If it can't produce those four lines, it hasn't read what it needs to read.

---

## Token rotation reminder

Each session: paste a fresh GitHub PAT. After the session: rotate it on GitHub so the old one becomes inert. This keeps long-lived secrets out of past chat transcripts.

If rotating every session feels heavy, alternative: use a single long-lived PAT scoped only to this repo (GitHub → Settings → Developer settings → Fine-grained tokens → "Only select repositories" → falcons-pricing-web). Lower-risk, you can keep it stashed.

---

## When to update this prompt

Add a new bullet to the prompt when:
- A new MCP gets connected (e.g., Notion, Slack, Box)
- A new canonical reference file is added to the repo
- A hard rule changes
- The deploy flow changes (e.g., switch to PR-based with branch protection)

Avoid updating it for one-off task descriptions — that's what `<DESCRIBE THE TASK HERE>` is for.
