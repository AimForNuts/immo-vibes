# Project Specs

This document is the iteration-oriented overview of ImmoWeb Suite. Use it with `docs/project-map.md` when planning a feature: this file explains what the product is and how the areas fit together; the project map points to exact files, routes, tables, and deeper docs.

---

## Product Purpose

ImmoWeb Suite is an IdleMMO companion dashboard for authenticated users who want better character, gear, combat, dungeon, and market tooling than the game client exposes directly.

The app currently focuses on:

- Character overview and cached roster data.
- Economy tools: market browser, price tracking, Forge recipe planning.
- Combat tools: gear stat calculator, enemy scaling, dungeon readiness.
- Admin tools: catalog sync, item inspection, prices, dungeons, zones, and users.
- Project-maintained IdleMMO game-mechanics references.

---

## Technology Stack

| Area | Current Choice |
|---|---|
| Framework | Next.js 16 App Router |
| Runtime UI | React 19 |
| Auth | better-auth with Drizzle adapter and username plugin |
| Database | Neon PostgreSQL |
| ORM | Drizzle ORM |
| Styling | Tailwind CSS, shadcn/ui base-ui variant |
| Icons | lucide-react |
| i18n | next-intl with `localePrefix: "never"` |
| Validation | Zod where boundary validation exists |
| Tests | Vitest unit/integration tests, Playwright smoke tests |
| Deploy | Vercel, including scheduled cron routes |

Important repo constraint: before modifying Next.js, better-auth, Drizzle, shadcn/ui v4, or Neon serverless code, consult the version-specific docs required by `AGENTS.md`.

---

## Source Layout

| Path | Role |
|---|---|
| `app/` | Next.js routes, layouts, pages, API routes, and server actions. |
| `app/(auth)/` | Standalone login/register pages. |
| `app/@modal/` | Parallel modal slot for landing-page auth overlays. |
| `app/(dashboard)/dashboard/` | Authenticated product surface. |
| `app/api/` | Internal API routes and IdleMMO proxy/sync routes. |
| `components/` | Shared UI, navigation, forms, admin table/log components, and shadcn/ui primitives. |
| `lib/` | Shared services, domain logic, auth, DB client/schema, IdleMMO client, constants, utilities. |
| `data/` | Static game data not provided by IdleMMO APIs. |
| `docs/` | Project map, game mechanics, API references, database reference, plans, specs, and iteration docs. |
| `messages/` | English and Portuguese translation dictionaries. |
| `tests/` | Unit and integration tests. |
| `e2e/` | Playwright smoke tests. |
| `public/` | Static assets, including the ImmoWeb Suite logo. |

---

## Feature Areas

### Landing, Auth, And Account Setup

Users can land on the public page, open login/register screens directly or as overlays, authenticate with better-auth, and configure IdleMMO credentials in settings.

Core files:

- `app/page.tsx`
- `app/(auth)/login/page.tsx`
- `app/(auth)/register/page.tsx`
- `components/login-form.tsx`
- `components/register-form.tsx`
- `app/(dashboard)/dashboard/settings/page.tsx`
- `components/settings-account-form.tsx`
- `app/actions/account.ts`
- `lib/auth.ts`
- `lib/auth-client.ts`

Data:

- `user`, `session`, `account`, `verification`
- `user.idlemmoToken`, `user.idlemmoCharacterId`, `user.name`
- `user_preferences.language`

Known scope:

- Email/password auth is active.
- Password recovery exists as a placeholder page.
- Locale is cookie-backed and synced to preferences.

### Dashboard Home

The dashboard home presents primary character information, cached roster data, and a customizable shortcut grid.

Core files:

- `app/(dashboard)/dashboard/page.tsx`
- `app/(dashboard)/dashboard/components/CharacterRoster.tsx`
- `components/dashboard-grid.tsx`
- `app/actions/preferences.ts`
- `lib/services/character-cache.ts`

Data:

- `characters`
- `user_preferences.dashboard_layout`

Behavior:

- Character cache is refreshed when stale.
- Dashboard layout is a fixed six-card grid persisted per user.

### Characters And Pets

Character pages show roster/detail information from IdleMMO and support syncing a character's active pet into local storage.

Core files:

- `app/(dashboard)/dashboard/characters/page.tsx`
- `app/(dashboard)/dashboard/characters/[id]/page.tsx`
- `app/(dashboard)/dashboard/characters/[id]/SyncPetButton.tsx`
- `app/(dashboard)/dashboard/characters/[id]/PetStatsForm.tsx`
- `app/api/characters/route.ts`
- `app/api/characters/[id]/sync-pet/route.ts`
- `app/api/characters/[id]/pet-stats/route.ts`
- `app/api/idlemmo/character/[id]/route.ts`

Data:

- `characters`
- `character_pets`

External API:

- Character info
- Alt characters
- Character pets
- Character effects

### Market Browser

The market browser supports browsing by tab/type, searching by name, item detail inspection, crafted-by lookup, tier-aware price lookup, and admin-only gathering zone associations.

Core files:

- `app/(dashboard)/dashboard/market/page.tsx`
- `app/(dashboard)/dashboard/market/MarketBrowser.tsx`
- `app/(dashboard)/dashboard/market/components/*`
- `app/(dashboard)/dashboard/market/hooks/*`
- `app/api/market/route.ts`
- `app/api/market/item/[id]/route.ts`
- `app/api/market/price/[id]/route.ts`
- `app/api/market/crafted-by/[id]/route.ts`
- `app/api/items/[id]/zones/route.ts`
- `lib/market-config.ts`

Data:

- `items`
- `market_price_history`
- `zones`
- `item_zones`

Behavior:

- Tier 1 prices can fall back to `items.last_sold_price`.
- Tier > 1 cache misses can fetch live market history with the session user's IdleMMO token and persist the result.
- Admin users can associate ORE, LOG, and FISH items with zones.

### Investments

Users can track items and view stored market history for selected tiers.

Core files:

- `app/(dashboard)/dashboard/investments/page.tsx`
- `app/(dashboard)/dashboard/investments/InvestmentTracker.tsx`
- `app/api/investments/route.ts`
- `app/api/investments/[id]/route.ts`
- `app/api/investments/[id]/history/route.ts`

Data:

- `price_tracker`
- `market_price_history`

### Forge Planner

The Forge Planner lets users select synced Forge recipes, set quantities, and calculate total required materials.

Core files:

- `app/(dashboard)/dashboard/forge-planner/page.tsx`
- `app/(dashboard)/dashboard/forge-planner/ForgePlanner.tsx`
- `app/(dashboard)/dashboard/forge-planner/types.ts`
- `lib/domain/forge-planner.ts`

Data:

- `items.recipe`

Domain logic:

- Recipe material aggregation belongs in `lib/domain/forge-planner.ts`.

### Gear Calculator

The gear calculator lets users select gear slots, apply tiers, compute combat stats, and save/load presets.

Core files:

- `app/(dashboard)/dashboard/gear/page.tsx`
- `app/(dashboard)/dashboard/gear/GearCalculator.tsx`
- `app/(dashboard)/dashboard/gear/actions.ts`
- `app/(dashboard)/dashboard/gear/lib/gear-stats.ts`
- `app/(dashboard)/dashboard/gear/components/*`
- `app/(dashboard)/dashboard/gear/hooks/*`

Data:

- `gear_presets`
- `items`

Domain logic:

- Tier/stat calculation belongs in `app/(dashboard)/dashboard/gear/lib/gear-stats.ts`.

### Combat Planner

The combat planner compares character stats against enemies, including manual/static combat stats that IdleMMO does not expose.

Core files:

- `app/(dashboard)/dashboard/combat/page.tsx`
- `app/(dashboard)/dashboard/combat/CombatPlanner.tsx`
- `app/(dashboard)/dashboard/combat/hooks/useEnemyScaling.ts`
- `app/(dashboard)/dashboard/combat/lib/combat-scaling.ts`
- `data/enemy-combat-stats.ts`

Data:

- Static enemy combat stats in `data/enemy-combat-stats.ts`.

External API:

- Character info
- Alt characters
- Enemy list

### Dungeons Explorer

The dungeons area supports dungeon readiness, difficulty calculations, idle-time planning, loot table viewing, character effects, and gear preset comparison.

Core files:

- `app/(dashboard)/dashboard/dungeons/page.tsx`
- `app/(dashboard)/dashboard/dungeons/DungeonExplorer.tsx`
- `app/(dashboard)/dashboard/dungeons/difficulty.ts`
- `app/api/admin/sync-dungeons/route.ts`
- `app/api/idlemmo/character/[id]/effects/route.ts`

Data:

- `dungeons`
- `gear_presets`
- `characters`

External API:

- Dungeon list for admin sync.
- Character effects through internal proxy.

### Admin Panel

The admin panel is a protected management surface for economy, world, and user data.

Core areas:

- Economy: item table, inspect/sync/price tooling, store price editing.
- World: dungeons, zones, associations, placeholder enemies/world bosses pages.
- Users: user table, email/password update, delete, character dissociation.

Core files:

- `components/admin-nav.tsx`
- `components/admin/AdminTable.tsx`
- `components/admin/SyncLog.tsx`
- `app/(dashboard)/dashboard/admin/**`
- `app/api/admin/**`
- `lib/services/admin/*.service.ts`

Data:

- `items`
- `market_price_history`
- `sync_state`
- `dungeons`
- `zones`
- `enemies`
- `world_bosses`
- `zone_resources`
- `user`
- `characters`

### Sync And Cron Jobs

Sync jobs populate and refresh local data from IdleMMO. Admin routes provide manual triggers; cron routes provide scheduled automation.

Jobs:

- `sync-items`: weekly catalog refresh.
- `sync-recipes`: weekly recipe result population.
- `sync-prices`: daily market price refresh, 80 items per run.
- `sync-inspect`: admin-only item detail/stat sync.
- `sync-dungeons`: admin-only dungeon catalog sync.

Data:

- `items`
- `market_price_history`
- `sync_state`
- `dungeons`

Operational constraints:

- Vercel hobby cron allows one execution per day per cron.
- Cron routes are protected by `CRON_SECRET`.
- IdleMMO rate limits must be respected by server-side retry code and the browser queue.

### i18n

The app supports English and Portuguese.

Core files:

- `i18n/routing.ts`
- `i18n/request.ts`
- `middleware.ts`
- `messages/en.json`
- `messages/pt.json`
- `components/locale-switcher.tsx`
- `app/actions/locale.ts`

Behavior:

- Locale is stored without URL prefixes.
- Add languages by extending routing and adding a full message dictionary.

### Shared UI And Navigation

Shared components include dashboard/admin/economy navigation, auth forms, account forms, theme controls, modal wrapper, and shadcn/ui primitives.

Core folders:

- `components/`
- `components/ui/`
- `components/admin/`

Guidance:

- UI components should render and handle interaction only.
- Business rules should remain in `lib/`, feature `lib/` folders, services, server actions, or route handlers as appropriate.

---

## Data Model Summary

Primary business tables:

- `items`
- `market_price_history`
- `price_tracker`
- `gear_presets`
- `user_preferences`
- `characters`
- `character_pets`
- `dungeons`
- `zones`
- `item_zones`
- `enemies`
- `world_bosses`
- `zone_resources`
- `sync_state`

Auth tables are managed by better-auth:

- `user`
- `session`
- `account`
- `verification`

Schema source of truth: `lib/db/schema.ts`.

Human-readable reference: `docs/database.md`.

---

## External Integration Summary

All server-side IdleMMO calls should go through `lib/idlemmo.ts`.

Current integration areas:

- Auth token check.
- Character details, alts, effects, and pets.
- Item search by type.
- Item inspect.
- Item market history.
- Enemy list.
- Dungeon list.

Browser-side calls to IdleMMO proxy routes should use the rate-limit-aware queue in `lib/idlemmo-queue.ts` where applicable.

---

## Test Coverage Map

| Test Area | Files |
|---|---|
| Forge material totals | `tests/unit/forge-planner.test.ts` |
| Combat scaling | `tests/unit/combat/scaling.test.ts` |
| Dungeon difficulty | `tests/unit/dungeons/difficulty.test.ts` |
| IdleMMO rate limiting | `tests/unit/idlemmo/rate-limit.test.ts` |
| Live/API character checks | `tests/integration/characters/characters.api.test.ts` |
| Live/API dungeon checks | `tests/integration/dungeons/dungeons.api.test.ts` |
| Live/API enemy checks | `tests/integration/enemies/enemies.api.test.ts` |
| Live/API item checks | `tests/integration/items/items.api.test.ts` |
| Production smoke checks | `e2e/smoke.spec.ts`, `e2e/auth.setup.ts` |

Typical verification commands:

```bash
npm run test
npm run lint
npx tsc --noEmit
npx playwright test
```

Some integration/e2e tests require environment variables, database access, or saved auth state.

---

## Documentation Map

| Need | Start Here |
|---|---|
| Exact feature-to-file ownership | `docs/project-map.md` |
| DB schema and sync pipeline | `docs/database.md` |
| Internal API shapes | `docs/api/internal/` |
| IdleMMO external API notes | `docs/api/` |
| Game formulas and constants | `docs/game-mechanics/` |
| Current project specs | `docs/iteration/project-specs.md` |
| Improvement backlog | `docs/iteration/improvements.md` |
| Historical design decisions | `docs/specs/`, `docs/plans/`, `docs/superpowers/` |

---

## Iteration Rules

When adding or changing behavior:

1. Start with `AGENTS.md`, then `docs/project-map.md`, then the relevant domain/API/database docs.
2. Keep business logic outside UI components.
3. Validate inputs at route/action boundaries.
4. Update docs when routes, components, DB columns, cron jobs, or lib exports change.
5. Add tests proportional to the risk of the change.
6. Open work through a branch and PR; do not commit directly to `master`.
