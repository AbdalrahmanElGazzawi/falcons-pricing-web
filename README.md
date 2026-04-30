> **Start here:** read [`CLAUDE.md`](./CLAUDE.md) before making changes. It's the canonical bootstrap doc — methodology, services connected, deploy flow, hard rules.
> The pricing methodology lives in [`Falcons-Pricing-SOT-v1.0.md`](./Falcons-Pricing-SOT-v1.0.md). The audit and per-talent benchmarks live in [`falcons-market-value-reference.xlsx`](./falcons-market-value-reference.xlsx) and `market-audit-memo*.md`.

---

# Team Falcons · Pricing OS (Web)

Internal pricing engine + client-facing quotation portal for Team Falcons commercials.
Built on Next.js 14 (App Router) + Supabase (Postgres + Auth + RLS).

---

## What's inside

```
falcons-pricing-web/
├── src/
│   ├── app/
│   │   ├── login/                    Sign-in (Google OAuth + email magic link)
│   │   ├── dashboard/                Stat tiles + recent quotes
│   │   ├── roster/players/           Player rate card (search + filter)
│   │   ├── roster/creators/          Creator rate card (search + filter)
│   │   ├── quote/new/                Quote Builder — 9-axis live pricing
│   │   ├── quote/[id]/               Internal quote detail + workflow buttons
│   │   ├── quotes/                   Quote Log
│   │   ├── client/[token]/           Public client portal — approve / reject
│   │   ├── admin/users/              Invite + assign roles
│   │   ├── admin/players/            Add / edit / deactivate players
│   │   ├── admin/tiers/              Edit tier fee bands + floor share
│   │   ├── admin/addons/             Manage rights packages
│   │   ├── admin/assumptions/        Read-only assumptions log
│   │   └── api/                      All write endpoints (POST/PATCH/DELETE)
│   ├── lib/
│   │   ├── pricing.ts                9-axis engine (computeLine / computeQuoteTotals)
│   │   ├── auth.ts                   requireAuth / requireStaff / requireAdmin helpers
│   │   ├── supabase-browser.ts       Browser-side Supabase client
│   │   ├── supabase-server.ts        Server-side + service-role clients
│   │   ├── types.ts                  Shared TypeScript types
│   │   └── utils.ts                  fmtMoney / fmtPct / tierClass / statusLabel
│   ├── components/
│   │   ├── Shell.tsx                 Sidebar + main layout
│   │   └── AccessDenied.tsx          Fallback card
│   └── middleware.ts                 Global auth bouncer (with public path bypass)
├── supabase/migrations/
│   ├── 001_init.sql                  Schema · enums · triggers · RLS policies
│   └── 002_seed.sql                  189 players + 17 creators + 5 tiers + 15 addons
├── package.json
├── tailwind.config.ts                Falcons green / navy theme tokens
└── .env.example                      Required env vars
```

---

## Roles & permissions

| Role     | Can…                                                                |
|----------|---------------------------------------------------------------------|
| admin    | Everything: invite users, edit roster/tiers/addons, approve quotes  |
| sales    | Create + send quotes, read roster, see quote log                    |
| finance  | Read-only across roster + quotes (visibility for billing)           |
| viewer   | Lowest tier — read-only access to quote log                         |

Roles are enforced both in app guards (`requireStaff` / `requireAdmin`) and at the database via Postgres Row-Level Security policies. Even if someone bypasses the UI, RLS denies the query.

The **client portal** at `/client/<token>` requires no login — a per-quote UUID acts as the credential. The portal only renders quotes whose status is `sent_to_client` or later.

---

## Setup — first deploy

### 1. Create the Supabase project (free tier)

1. Go to https://supabase.com, sign in with **afg.falcons.sa@gmail.com**, create a new project.
2. Wait ~2 min for it to provision. Copy these from **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (⚠ keep secret — never expose to browser)

### 2. Apply the schema and seed

In the Supabase dashboard, open **SQL Editor → New query** and run, in order:

```bash
supabase/migrations/001_init.sql      # Schema, RLS, triggers
supabase/migrations/002_seed.sql      # 189 players + 17 creators + tiers + addons
```

You should see "Success. No rows returned" twice. Verify with:

```sql
select count(*) from players where is_active;     -- 189
select count(*) from creators where is_active;    -- 17
select count(*) from tiers;                       -- 5
select count(*) from addons;                      -- 15
```

### 3. Configure auth providers

In Supabase **Authentication → Providers**:

- Enable **Email** (magic-link). Disable signups (URL Configuration → "Allow new users to sign up" = off — invitations only).
- Enable **Google OAuth**. Use Google Cloud Console to create an OAuth 2.0 Client ID. Authorized redirect URI is the one shown in the Supabase provider config.
- In **URL Configuration → Site URL**, set your production URL (e.g. `https://falcons-pricing.vercel.app`).
- Add `https://falcons-pricing.vercel.app/auth/callback` to the **Additional redirect URLs**.

### 4. Bootstrap the first admin

After deploying (step 6) and signing in once with `afg.falcons.sa@gmail.com`, the `handle_new_user` trigger creates a profile row with role=`viewer` and `is_active=false`. Promote yourself in SQL Editor:

```sql
update profiles
set role = 'admin', is_active = true, full_name = 'Koge'
where email = 'afg.falcons.sa@gmail.com';
```

From then on, you can invite everyone else through `/admin/users` in the app.

### 5. Local development (optional)

```bash
git clone <repo>
cd falcons-pricing-web
cp .env.example .env.local         # fill in the three Supabase keys + APP_URL=http://localhost:3000
npm install
npm run dev                         # http://localhost:3000
```

### 6. Deploy to Vercel (free tier)

1. Push the repo to GitHub.
2. Go to https://vercel.com → **New Project** → import the repo.
3. Add the environment variables (Settings → Environment Variables):

   | Key                              | Value                                       |
   |----------------------------------|---------------------------------------------|
   | `NEXT_PUBLIC_SUPABASE_URL`       | from Supabase                               |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | from Supabase                               |
   | `SUPABASE_SERVICE_ROLE_KEY`      | from Supabase (mark as **secret**)          |
   | `NEXT_PUBLIC_APP_URL`            | `https://<your-project>.vercel.app`         |
   | `FIRST_ADMIN_EMAIL`              | `afg.falcons.sa@gmail.com`                  |

4. Click **Deploy**. The free `*.vercel.app` URL is yours — no credit card needed.
5. After the first deploy, head back to **Supabase → Authentication → URL Configuration** and double-check the production URL + callback URL match.

---

## Inviting your team

Once you're logged in as admin:

1. Sidebar → **Users**
2. Click **+ Invite user**
3. Enter their email + name + role (`admin` / `sales` / `finance` / `viewer`)
4. They get a magic-link email; the role you chose is pre-applied.

You can disable an account at any time by clicking the **Active** chip on their row — quotes they created stay intact, they just can't sign in.

---

## How pricing works

Every quote line runs through the same 9-axis matrix in `src/lib/pricing.ts`:

```
  SocialPrice    = BaseFee × Engagement × Audience × Seasonality × ContentType × Language × Auth
  AuthorityFloor = IRL     × FloorShare × Seasonality × Language × Auth
  Auth           = 1 + ObjectiveWeight × (AuthorityRaw − 1)

  Pre-rights = MAX(SocialPrice, AuthorityFloor) × ConfidenceCap
  Final unit = Pre-rights × (1 + Σ rights_uplift_pct)
  Final amt  = Final unit × qty
```

Confidence ladder: `pending=0.75×`, `estimated=0.9×`, `rounded=1.0×`, `exact=1.0×`. When data is incomplete (`pending`/`estimated`), the engine also gates each axis (Engagement≤1.2×, Auth≤1.3×, Seasonality≤1.25×) so we never overprice on shaky measurement.

Tier floor share comes from the `tiers` table — admins can edit those values live without redeploying.

---

## Quote lifecycle

```
draft  →  pending_approval  →  approved  →  sent_to_client  →  client_approved  →  closed_won
                                                            ↘  client_rejected  →  draft (re-open)
                                                                                ↘  closed_lost
```

- **Sales** can submit, send, and close.
- **Admin** is the only role that can approve a `pending_approval` quote. (Acts as Koge's review gate.)
- Once a quote hits `sent_to_client`, the client URL becomes live. Clients click Approve/Reject inside the portal — no login.

---

## PDF export

`GET /api/quote/<id>/pdf` returns a branded A4 PDF. Internal users hit it via the **PDF** button on the quote detail page. The same endpoint accepts `?token=<client_token>` for the public portal so clients can also download.

PDF is rendered server-side with `pdfkit` — no headless browser, no extra infra.

---

## Backups

Supabase free tier auto-backs up your DB daily. For extra safety, periodically export from **Supabase → Database → Backups** or run:

```bash
pg_dump <connection_string> > backup-$(date +%F).sql
```

---

## Troubleshooting

- **"Access denied" after signing in**: your profile row has `is_active=false`. An admin needs to flip the **Active** chip in `/admin/users`. (For the first admin, run the SQL in step 4 above.)
- **Magic link redirects to `localhost`**: you forgot to set `NEXT_PUBLIC_APP_URL` in Vercel.
- **PDF endpoint returns 401 from a non-staff click**: that's by design — must include `?token=` for public access.
- **Lines don't show up in the quote builder picker**: the player or creator was deactivated. Reactivate from `/admin/players` or `/admin/creators`.

---

## What's intentionally NOT here yet (v2 candidates)

- Email notifications (when a client approves a quote, ping the owner)
- Bulk roster import from CSV
- Per-line axis overrides in the quote builder UI (engine already supports them; just no form fields wired)
- Approval queue dashboard for admins
- Audit log viewer (the `audit_log` table is being populated, just no page yet)
- Shikenso webhook to auto-update `measurement_confidence`

---

Built for Team Falcons — Koge. Iterate fast.

<!-- sync-test from Cowork: if you see this line after running pull on your laptop, the round-trip works -->
