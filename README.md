# ImmoWeb Suite

A companion dashboard for [IdleMMO](https://idle-mmo.com) — track your characters, gear, skills, and economy in one place.

Built with Next.js 16, better-auth, Drizzle ORM, and shadcn/ui. Supports multiple languages (English and Portuguese) with locale stored in a cookie and synced to the database.

---

## Tech Stack

| Layer | Library |
|---|---|
| Framework | Next.js 16 App Router |
| Auth | better-auth (username plugin) |
| Database | Neon PostgreSQL + Drizzle ORM |
| UI | shadcn/ui (base-ui variant) + Tailwind CSS |
| i18n | next-intl (`localePrefix: "never"`) |
| Validation | Zod |

---

## First Steps

### 1. Install dependencies

```bash
npm install
```

### 2. Set environment variables

Copy `.env.example` to `.env.local` and fill in:

```
DATABASE_URL=         # Neon PostgreSQL connection string
BETTER_AUTH_SECRET=   # Random secret for better-auth
BETTER_AUTH_URL=      # Base URL (e.g. http://localhost:3000)
```

### 3. Push the database schema

```bash
npx drizzle-kit push
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Connect your IdleMMO account

After registering, go to **Settings** and enter your IdleMMO API token and primary character ID. These are used to fetch live character data.

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
  db/               — Drizzle schema and client
  idlemmo.ts        — IdleMMO API client
i18n/               — next-intl routing and request config
messages/           — Translation files (en.json, pt.json)
public/images/      — Static assets (logo.png)
```

---

## Adding a Language

1. Add the locale code to `i18n/routing.ts` → `locales` array.
2. Create `messages/<locale>.json` with all translation keys (copy from `en.json`).
3. That's it — the locale switcher picks it up automatically.

---

## Recent Changes

### 2026-03-19 — Navigation, i18n, overview redesign, and logo

- **i18n**: Added next-intl with English and Portuguese. Locale stored in cookie and synced to DB. No URL changes — `localePrefix: "never"`.
- **Landing page**: Auth-aware navbar — shows Dashboard/Settings/Sign out when logged in, Sign in/Get started when logged out. Login and Register open as modal overlay (parallel + intercepting routes).
- **Dashboard sidebar**: Expandable character sub-nav. Logo links to landing page.
- **Logo**: Brand logo (`public/images/logo.png`) replaces plain text in all navbars.
- **Overview redesign**: Primary character name as heading, 3×2 customizable shortcut grid (persisted per user), compact character roster table with status, avatar, class, level, and location columns.
- **Settings page**: Display name update, password change (forces sign-out), IdleMMO token management, language switcher.
- **WIP stub**: `/wip` page for unfinished features.
- **Database**: Added `user_preferences` table with `language` and `dashboardLayout` columns.
