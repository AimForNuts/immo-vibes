# ImmoWeb Suite

A companion dashboard for [IdleMMO](https://idle-mmo.com) — track your characters, gear, skills, and economy in one place.

Built with Next.js 16, better-auth, Cloudflare D1, Cloudflare R2, and shadcn/ui. Supports multiple languages (English and Portuguese) with locale stored in a cookie and synced to the database.

---

## Tech Stack

| Layer | Library |
|---|---|
| Framework | Next.js 16 App Router |
| Auth | better-auth (username plugin) |
| Database | Cloudflare D1 |
| Object storage | Cloudflare R2 |
| Runtime | Cloudflare Workers/OpenNext |
| UI | shadcn/ui (base-ui variant) + Tailwind CSS |
| i18n | next-intl (`localePrefix: "never"`) |
| Validation | Lightweight route-boundary helpers |

---

## First Steps

### 1. Install dependencies

```bash
npm install
```

### 2. Set environment variables

Copy `.env.example` to `.env.local` and fill in:

```
BETTER_AUTH_SECRET=   # Random secret for better-auth
BETTER_AUTH_URL=      # Base URL (e.g. http://localhost:3000)
RESEND_API_KEY=       # Optional; sends password recovery emails in production
PASSWORD_RESET_EMAIL_FROM= # Optional; from address for password recovery emails
```

### 3. Apply D1 migrations

```bash
npx wrangler d1 migrations apply immo-web-suite-sync --local
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Connect your IdleMMO account

After registering, go to **Settings** and enter your IdleMMO API token and primary character ID. These are used to fetch live character data.

---

## Cloudflare Migration

The app runs on Cloudflare Workers/OpenNext with Cloudflare D1 as its database and an R2 bucket bound for future source/object storage.

Current production URL:

```text
https://immo-web-suite.void-presence.workers.dev
```

The full Cloudflare resource log and operations runbook lives at `docs/deployment/cloudflare.md`.

Recent migration checkpoint: Neon/Postgres and Drizzle have been removed from the application; all app/auth persistence is Cloudflare D1-backed, and R2 foundation is ready for future source/archive data.

### Local Cloudflare Preview

```bash
npm run preview
```

This builds the app with OpenNext and serves it through Wrangler's Workers runtime.

### Deploy To Cloudflare

```bash
npm run deploy
```

Required Cloudflare secrets:

```
BETTER_AUTH_SECRET
BETTER_AUTH_URL
CRON_SECRET
RESEND_API_KEY
PASSWORD_RESET_EMAIL_FROM
```

Set secrets with Wrangler, for example:

```bash
npx wrangler secret put BETTER_AUTH_SECRET
```

`wrangler.jsonc` owns Cloudflare Cron Triggers.

---

## Project Structure

```
app/
  (auth)/           — Login and register pages (standalone layouts)
  @modal/           — Parallel slot: login/register as modal overlay on landing page
  (dashboard)/      — Authenticated dashboard area
    dashboard/      — Overview, characters, gear, admin, settings
  wip/              — Under-construction stub for unfinished features
components/         — Shared UI components
lib/
  auth.ts           — better-auth configuration
  db/               — Cloudflare D1 helper and shared data shapes
  storage/          — Cloudflare R2 binding helpers
  idlemmo.ts        — IdleMMO API client
i18n/               — next-intl routing and request config
messages/           — Translation files (en.json, pt.json)
public/images/      — Static assets (logo.png)
```

---

### Documentation Hub

Start with these docs when planning or iterating:

| Need | Document |
|---|---|
| Current product and architecture specs | `docs/iteration/project-specs.md` |
| Improvement backlog | `docs/iteration/improvements.md` |
| Feature-to-file ownership | `docs/project-map.md` |
| Database schema reference | `docs/database.md` |
| Internal and IdleMMO API references | `docs/api/` |
| IdleMMO mechanics used by calculators | `docs/game-mechanics/` |

---

## Adding a Language

1. Add the locale code to `i18n/routing.ts` → `locales` array.
2. Create `messages/<locale>.json` with all translation keys (copy from `en.json`).
3. That's it — the locale switcher picks it up automatically.

---

## Recent Changes

### 2026-08-22 - Cloudflare R2 foundation

- **Storage**: Created R2 bucket `immo-web-suite-sources` and bound it to the Worker as `IMMO_SOURCES_BUCKET`.
- **Runtime**: Added a server-side R2 helper for future source/object storage features.
- **Docs**: Updated the Cloudflare runbook and project map with the R2 resource ledger.

### 2026-08-22 - Cloudflare cleanup

- **Deployment**: Removed the leftover Worker `DATABASE_URL` secret and unused Vercel asset.
- **Docs**: Reworded active cron/rate-limit notes for Cloudflare Workers instead of Vercel.

### 2026-08-22 - Removed Neon/Postgres

- **Database**: Removed the Neon/Postgres client, Drizzle schema/migrations, fallback service branches, and direct `DATABASE_URL` dependency.
- **Runtime**: All app and auth persistence now uses Cloudflare D1 through the `IMMO_SYNC_DB` binding.
- **CI/CD**: Deployment applies only D1 migrations before Cloudflare Workers deploy.

### 2026-08-22 - Cloudflare production data cutover

- **Runtime**: Removed the remaining direct Neon reads from production routes/pages; market drop zones and character pet stats now go through D1-backed services.
- **Docs**: Updated Cloudflare/database docs to reflect D1 as the production data owner.

### 2026-08-19 - Cloudflare D1 items

- **Database**: Added Cloudflare D1 `items` for the item catalog, inspect metadata, recipe metadata, and tier-1 price cache.
- **Market/Admin/Sync**: Routed item browsing, item detail, gear/forge/dungeon lookups, and item sync writes through the D1-backed item service.

### 2026-08-19 - Cloudflare D1 API Inspector

- **Database**: Added Cloudflare D1 `api_endpoint_specs`, `api_response_schemas`, and `api_schema_observations` for API Inspector metadata.
- **Admin**: Routed API Inspector endpoint config, saved schemas, and observation history through the D1-backed service.

### 2026-08-18 - Cloudflare D1 dungeons

- **Database**: Added Cloudflare D1 `dungeons` for the dungeon catalog and loot metadata.
- **Dungeons/Admin**: Routed dungeon planner reads, admin dungeon listing, and dungeon sync writes through the D1-backed dungeon service.

### 2026-08-18 - Cloudflare D1 zones

- **Database**: Added Cloudflare D1 `zones` and `item_zones` for admin-managed zone metadata and gathering item associations.
- **Admin/Market**: Routed zone CRUD and item-zone association reads/writes through the D1-backed zones service.

### 2026-08-17 - Cloudflare D1 character cache

- **Database**: Added Cloudflare D1 `characters` for the cached character roster.
- **Dashboard/Characters**: Routed cached roster reads and refresh writes through the D1-backed character cache service.

### 2026-08-17 - Cloudflare D1 character pets

- **Database**: Added Cloudflare D1 `character_pets` for saved character pet stats.
- **Characters**: Routed pet sync and manual pet stat reads/writes through a D1-backed service.

### 2026-08-17 - Cloudflare D1 gear presets

- **Database**: Added Cloudflare D1 `gear_presets` for saved gear loadouts.
- **Gear/Dungeons**: Routed preset reads and gear save/update/delete actions through a D1-backed service.

### 2026-08-17 - Cloudflare D1 price tracker

- **Database**: Added Cloudflare D1 `price_tracker` for user-tracked investment items.
- **Investments**: Routed tracked item list/add/delete and history lookup ownership checks through a D1-backed service.

### 2026-08-17 - Cloudflare D1 user preferences

- **Database**: Added Cloudflare D1 `user_preferences` for dashboard layout and language preferences.
- **Settings**: Routed preference reads/writes through a D1-backed service.

### 2026-08-17 - Cloudflare D1 sync logs

- **Database**: Added Cloudflare D1 `sync_job_logs` for admin sync observability.
- **Admin**: Routed manual sync log reads/writes through a D1-backed service.

### 2026-08-17 - Cloudflare D1 migrations in CI

- **CI/CD**: GitHub Actions now applies Cloudflare D1 migrations before deploying `master` to Cloudflare Workers.
- **Docs**: Documented the D1 migration workflow in the Cloudflare runbook.

### 2026-08-16 - Cloudflare D1 sync state

- **Database**: Added Cloudflare D1 database `immo-web-suite-sync` for cron `sync_state`.
- **Cron**: Routed automated cron state reads/writes through a D1-backed service.
- **Docs**: Updated the Cloudflare runbook and database reference for the first D1 table.

### 2026-08-16 - Cloudflare runtime migration scaffold

- **Deployment**: Added OpenNext/Cloudflare Workers config, Wrangler scripts, and a custom Worker entry for Cloudflare Cron Triggers.
- **Runtime**: Bumped Next.js to `16.2.11` to satisfy the current OpenNext Cloudflare adapter peer range.
- **Migration**: Documented the staged path: Cloudflare runtime first, D1/R2 later.

### 2026-08-16 - API inspector

- **Admin**: Added an API Inspector for running curated IdleMMO endpoints with editable test values and copyable latest raw responses.
- **Docs**: Added persisted typed response schemas, schema observations, merge/override actions, and explicit deprecated-field handling.
- **Admin**: Expanded the inspector catalog to all currently known IdleMMO endpoints and added a built-in fallback list for deploy windows before persistence is available.

### 2026-08-15 - Sync observability

- **Admin**: Added a Sync Status page for recent manual sync job progress, failures, skipped batches, and per-job filtering.
- **Database**: Added the append-only `sync_job_logs` table for structured sync lifecycle events.

### 2026-08-15 - Password recovery

- **Auth**: Replaced the password recovery placeholder with a better-auth reset flow.
- **Auth**: Added `/reset-password` for reset links and Resend-backed reset email delivery, with reset links logged during local development when email is not configured.

### 2026-08-14 - Iteration documentation hub

- **Docs**: Added `docs/iteration/project-specs.md` with a product, architecture, data, integration, and test overview.
- **Docs**: Added `docs/iteration/improvements.md` with prioritized product, engineering, documentation, testing, i18n, security, and UI improvement ideas.

### 2026-07-02 — Forge Planner

- **Forge Planner**: Added `/dashboard/forge-planner` under Economy to select Forge recipes, set quantities, and total required materials from synced recipe data.

### 2026-03-19 — Navigation, i18n, overview redesign, and logo

- **i18n**: Added next-intl with English and Portuguese. Locale stored in cookie and synced to DB. No URL changes — `localePrefix: "never"`.
- **Landing page**: Auth-aware navbar — shows Dashboard/Settings/Sign out when logged in, Sign in/Get started when logged out. Login and Register open as modal overlay (parallel + intercepting routes).
- **Dashboard sidebar**: Expandable character sub-nav. Logo links to landing page.
- **Logo**: Brand logo (`public/images/logo.png`) replaces plain text in all navbars.
- **Overview redesign**: Primary character name as heading, 3×2 customizable shortcut grid (persisted per user), compact character roster table with status, avatar, class, level, and location columns.
- **Settings page**: Display name update, password change (forces sign-out), IdleMMO token management, language switcher.
- **WIP stub**: `/wip` page for unfinished features.
- **Database**: Added `user_preferences` table with `language` and `dashboardLayout` columns.
