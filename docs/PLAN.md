# ImmoWeb Suite — Project Plan

## Overview

A web application that connects to the IdleMMMO API using a user-provided token,
performs game-related calculations, and presents information in a clear dashboard.
Optionally, users can create an account to persist their token and character data across sessions.

---

## Goals

- Connect to the IdleMMMO API via a personal token
- Display and process game data (stats, resources, economy, etc.)
- Provide calculated insights beyond what the game UI shows
- Allow users to save their token and preferences (optional login system)
- Keep code modular so game logic can be updated independently

---

## Recommended Stack

| Layer | Technology | Reason |
|---|---|---|
| Framework | Next.js 14+ (App Router) + TypeScript | Full-stack in one repo, SSR, API routes, file-based routing |
| Styling | Tailwind CSS + shadcn/ui | Fast to build, consistent, accessible components |
| Data fetching | TanStack Query (React Query) | Caching, background refetch, loading/error states |
| Auth | NextAuth.js | Simple session management, easy to extend |
| Database | SQLite via Drizzle ORM | Lightweight, no server needed, easy to migrate later |
| API layer | Next.js Route Handlers (`/app/api/`) | Clean separation of server-side logic |

---

## Architecture

```
immo_web_suite/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Auth group: login, register pages
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/            # Protected game dashboard pages
│   │   ├── overview/page.tsx
│   │   ├── skills/page.tsx
│   │   ├── economy/page.tsx
│   │   └── ...
│   ├── api/                    # Server-side Route Handlers
│   │   ├── auth/[...nextauth]/ # NextAuth endpoints
│   │   ├── idlemmo/            # Proxy routes to IdleMMMO API
│   │   │   └── [...slug]/route.ts
│   │   └── user/              # User profile / token endpoints
│   └── layout.tsx
│
├── lib/
│   ├── idlemmo/                # IdleMMMO API client (single source of truth)
│   │   ├── client.ts           # Fetch wrapper with token injection
│   │   ├── endpoints.ts        # All endpoint definitions
│   │   └── types.ts            # API response types
│   ├── calculations/           # Game logic, formulas, derived stats
│   │   ├── skills.ts
│   │   ├── economy.ts
│   │   └── ...
│   ├── db/                     # Database schema and queries
│   │   ├── schema.ts
│   │   └── queries.ts
│   └── auth.ts                 # NextAuth config
│
├── components/
│   ├── ui/                     # Generic shadcn/ui components
│   ├── dashboard/              # Dashboard-specific components
│   └── charts/                 # Data visualization components
│
├── hooks/                      # Custom React hooks
│   └── useIdleMMMO.ts          # Hooks that wrap TanStack Query calls
│
└── types/                      # Shared TypeScript types
```

---

## Key Concerns Separated

### 1. API Client (`lib/idlemmo/`)
Handles all communication with IdleMMMO. Token is injected here.
Changing the API base URL, auth scheme, or adding rate-limiting only touches this layer.

### 2. Game Logic (`lib/calculations/`)
Pure functions that take raw API data and return derived values.
No UI, no API calls — easy to test and update when game mechanics change.

### 3. Data Layer (`lib/db/`)
User accounts, saved tokens, preferences.
Using Drizzle ORM means swapping SQLite for PostgreSQL later requires minimal changes.

### 4. UI (`app/`, `components/`)
Consumes hooks that already have data ready. No game logic lives here.

---

## Feature Roadmap

### Phase 1 — Core (No login required)
- [ ] Token input page (stored in `localStorage` or session)
- [ ] Fetch and display basic character info from API
- [ ] Overview dashboard (character stats, current activity)
- [ ] Proxy API calls through Next.js to avoid CORS issues

### Phase 2 — Calculations & Insights
- [ ] Skill progression estimates (time to level up, efficiency)
- [ ] Economy calculations (gold per hour, market prices)
- [ ] Resource tracking (inventory value, drop rates)
- [ ] Custom alerts / thresholds

### Phase 3 — User Accounts (Optional login)
- [ ] Register / Login with email + password
- [ ] Store API token securely per user in DB
- [ ] Multiple character support
- [ ] Persistent settings and preferences

### Phase 4 — Polish
- [ ] Responsive mobile layout
- [ ] Dark/light mode
- [ ] Auto-refresh intervals
- [ ] Export data (CSV, JSON)

---

## Security Considerations

- API token is **never exposed to the browser** from logged-in state — all IdleMMMO calls go through Next.js server-side route handlers
- Tokens stored in DB are encrypted at rest
- Guest mode (token in localStorage) is opt-in and clearly communicated
- Passwords hashed with bcrypt via NextAuth

---

## Getting Started (initial setup steps)

1. `npx create-next-app@latest immo_web_suite --typescript --tailwind --app`
2. Install dependencies: `shadcn/ui`, `drizzle-orm`, `better-sqlite3`, `next-auth`, `@tanstack/react-query`
3. Scaffold DB schema for `users` and `tokens`
4. Build the IdleMMMO API client with a configurable token
5. Create the token input page and first dashboard page

---

## Open Questions

- What specific game data/sections are most important to show first?
- Is the IdleMMMO API public/documented? Any rate limits to be aware of?
- Will this be deployed (Vercel, self-hosted) or run locally only?
- Should the login system support OAuth (Discord, Google) in addition to email?