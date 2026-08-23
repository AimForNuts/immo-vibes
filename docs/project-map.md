# Project Map

Use this file to orient yourself before touching any code. It maps every feature area to its files, DB tables, internal API routes, external API calls, and relevant docs. **Update this file whenever you add, move, or rename anything listed here.**

---

## How to use this map

1. Identify the feature area(s) your task touches from the sections below.
2. Read the linked docs for those areas.
3. Read only the files listed — no broad grep needed.
4. If something is missing, check `docs/` for hints before searching the codebase.

---

## Feature Areas

### Iteration Hub
Dedicated project specs and improvement backlog for planning future work.

| Layer | Files |
|---|---|
| Product/architecture specs | `docs/iteration/project-specs.md` |
| Improvement backlog | `docs/iteration/improvements.md` |

**Use when**: planning feature iterations, onboarding to the product surface, choosing next improvements, or checking which docs need to be expanded.

### Deployment & Cron
Runtime deployment uses Cloudflare Workers/OpenNext. Runtime data is Cloudflare D1-backed, and R2 stores source/object snapshots with prefix-scoped lifecycle cleanup.

| Layer | Files |
|---|---|
| Next config | `next.config.ts` |
| Cloudflare adapter config | `open-next.config.ts` |
| Cloudflare Worker config | `wrangler.jsonc` |
| Cloudflare Worker entry | `worker.ts` |
| Cloudflare R2 helper | `lib/storage/r2.ts` |
| E2E smoke config | `playwright.config.ts` |
| Cloudflare runbook | `docs/deployment/cloudflare.md` |

**Cron ownership**: `wrangler.jsonc` defines Cloudflare Cron Triggers. `worker.ts` maps those scheduled events to the existing `app/api/cron/*` route handlers using `CRON_SECRET`.

**D1 ownership**: `immo-web-suite-sync` is bound as `IMMO_SYNC_DB` and stores better-auth tables through `lib/auth.ts` and `lib/services/auth-users.service.ts`, `sync_state` through `lib/services/sync-state.service.ts`, `sync_job_logs` through `lib/services/admin/sync-logs.service.ts`, `user_preferences` through `lib/services/user-preferences.service.ts`, `price_tracker` through `lib/services/price-tracker.service.ts`, `gear_presets` through `lib/services/gear-presets.service.ts`, `character_pets` through `lib/services/character-pets.service.ts`, `characters` through `lib/services/character-cache.ts`, `zones`/`item_zones` through `lib/services/admin/zones.service.ts`, `dungeons` through `lib/services/admin/dungeons.service.ts`, API Inspector tables through `lib/services/admin/api-inspector.service.ts`, `items` through `lib/services/items.service.ts`, and `market_price_history` through `lib/services/market-price-history.service.ts`.

**R2 ownership**: `immo-web-suite-sources` is bound as `IMMO_SOURCES_BUCKET` for source/object storage. Access the binding through `lib/storage/r2.ts`. API Inspector writes raw response snapshots under `api-inspector/<endpoint-key>/<YYYY-MM-DD>/` through `lib/services/admin/api-inspector-r2-snapshots.service.ts`; those objects expire after 180 days via R2 lifecycle rule `expire-api-inspector-snapshots-180-days`. Sync routes write source snapshots under `sync/<job>/<source>/<YYYY-MM-DD>/` through `lib/services/sync-r2-snapshots.service.ts`; those objects expire after 90 days via R2 lifecycle rule `expire-sync-snapshots-90-days`.

### Market Browser
The item browse/search page with detail panel and recipe cost calculator.

| Layer | Files |
|---|---|
| Page | `app/(dashboard)/dashboard/market/page.tsx` |
| Root component | `app/(dashboard)/dashboard/market/MarketBrowser.tsx` (orchestrator ~250 lines) |
| Types | `app/(dashboard)/dashboard/market/types.ts` (`DbItem`, `FullItem`, `MarketPrice`, `Filters`) |
| Component — item tile | `app/(dashboard)/dashboard/market/components/ItemCard.tsx` |
| Component — filters | `app/(dashboard)/dashboard/market/components/FilterBar.tsx` |
| Component — detail panel | `app/(dashboard)/dashboard/market/components/DetailPanel.tsx` |
| Hook — tab/search | `app/(dashboard)/dashboard/market/hooks/useMarketItems.ts` |
| Hook — item detail | `app/(dashboard)/dashboard/market/hooks/useItemDetail.ts` |
| API — list | `app/api/market/route.ts` (tab browse, name search, recently_added dateRange mode) |
| API — item detail | `app/api/market/item/[id]/route.ts` |
| API — price | `app/api/market/price/[id]/route.ts` |
| API — crafted-by | `app/api/market/crafted-by/[id]/route.ts` |
| API — drop zones | `app/api/market/zones/route.ts` |
| Config | `lib/market-config.ts` (tab → item type mapping; `recently_added` uses dateRange API mode) |
| Folder docs | `app/(dashboard)/dashboard/market/README.md` |

**DB tables**: D1 `items` (read), D1 `market_price_history` (read/write via price route — per-tier prices)
**External API**: `GET /v1/item/{id}/market-history?tier=N` — live fallback in price route when tier > 1 is not yet in DB
**Docs**: `docs/game-mechanics/item-types.md`, `docs/game-mechanics/items.md`, `docs/database.md`

**Tier pricing notes**:
- D1 `market_price_history` stores prices per tier (1-based). The price route reads from this table first.
- Tier 1 fallback: `items.last_sold_price` (populated by sync-prices, always up to date).
- Tier > 1 cache miss: the price route fetches live from IdleMMO API using the session user's token and persists the result.
- The sync-prices jobs (cron + admin) now fetch all tiers for items where `max_tier > 1` is known.

---

### Zone Associations (Gathering Items)

Admin-only UI in the market detail panel to associate ORE, LOG, and FISH items with zones.

| Layer | Files |
|---|---|
| Modal component | `app/(dashboard)/dashboard/market/components/ZonePickerModal.tsx` |
| API — slim zone list | `app/api/admin/zones/route.ts` (`?slim=true` query param) |
| API — item zones | `app/api/items/[id]/zones/route.ts` |
| Service | `lib/services/admin/zones.service.ts` (`getAllZones`, `getZonesForDroppedItem`, `getItemZoneIds`, `replaceItemZones`) |

**DB tables**: D1 `zones` (read), D1 `item_zones` (read/write)
**Requires**: `session.user.role === "admin"`
**Docs**: `docs/api/internal/item-zones.md`

---

### Item Sync (Catalog)
Weekly cron that refreshes the item catalog from the IdleMMO API.

| Layer | Files |
|---|---|
| Cron route | `app/api/cron/sync-items/route.ts` |
| Admin route | `app/api/admin/sync-items/route.ts` |
| IdleMMO client | `lib/idlemmo.ts` → `searchItemsByType()` |

**DB tables**: D1 `items` (upsert catalog fields), D1 `sync_state` (marks job done)
**R2 objects**: `sync/items/<source>/<YYYY-MM-DD>/<type>/...` stores parsed item-search payloads.
**External API**: `GET /v1/item/search?type={type}&page={n}`
**Schedule**: Monday 00:00 UTC (`0 0 * * 1`)
**Docs**: `docs/database.md`, `docs/game-mechanics/item-types.md`

---

### Recipe Sync
Weekly cron that populates `recipeResultHashedId` for RECIPE-type items.

| Layer | Files |
|---|---|
| Cron route | `app/api/cron/sync-recipes/route.ts` |
| Admin route | `app/api/admin/sync-recipes/route.ts` |
| IdleMMO client | `lib/idlemmo.ts` → `inspectItem()` |

**DB tables**: D1 `items` (write `recipeResultHashedId`), D1 `sync_state` (gates on items done, marks recipes done)
**External API**: `GET /v1/item/{hashedId}/inspect`
**Schedule**: Monday 02:00 UTC (`0 2 * * 1`)
**Docs**: `docs/database.md`

---

### Price Sync
Daily cron that updates market prices, cycling through all items via `priceCheckedAt` ordering.

| Layer | Files |
|---|---|
| Cron route | `app/api/cron/sync-prices/route.ts` |
| Admin route | `app/api/admin/sync-prices/route.ts` |
| IdleMMO client | `lib/idlemmo.ts` |

**DB tables**: D1 `items` (write `lastSoldPrice`, `lastSoldAt`, `priceCheckedAt`), D1 `market_price_history` (insert), D1 `sync_state` (read status)
**R2 objects**: `sync/prices/<source>/<YYYY-MM-DD>/<type?>/<hashed-id>/...` stores parsed market-history payloads.
**External API**: `GET /v1/item/{hashedId}/market-history?tier=0&type=listings`
**Schedule**: Daily 04:00 UTC (`0 4 * * *`) — processes 80 items per run ordered by `priceCheckedAt ASC NULLS FIRST`
**Docs**: `docs/database.md`, `docs/api/rate-limiting.md`

---

### Inspect Sync
Admin-only sync that populates full item stats (combat stats, effects, requirements, tier modifiers).

| Layer | Files |
|---|---|
| Admin route | `app/api/admin/sync-inspect/route.ts` |
| IdleMMO client | `lib/idlemmo.ts` → `inspectItem()` |

**DB tables**: D1 `items` (write inspect fields: `description`, `baseStats`, `tierModifiers`, `effects`, `recipe`, `requirements`, `inspectedAt`)
**R2 objects**: `sync/inspect/admin/<YYYY-MM-DD>/<type>/<page>/<hashed-id>/...` stores parsed inspect payloads.
**External API**: `GET /v1/item/{hashedId}/inspect`
**Docs**: `docs/database.md`, `docs/game-mechanics/items.md`, `docs/game-mechanics/combat-stats.md`

---

### Investments (Price Tracker)
User-tracked items with price history charts.

| Layer | Files |
|---|---|
| Page | `app/(dashboard)/dashboard/investments/page.tsx` |
| Component | `app/(dashboard)/dashboard/investments/InvestmentTracker.tsx` |
| API — list/add | `app/api/investments/route.ts` |
| API — delete | `app/api/investments/[id]/route.ts` |
| API — history | `app/api/investments/[id]/history/route.ts` |
| Service | `lib/services/price-tracker.service.ts` |

**DB tables**: D1 `price_tracker` (read/write tracked items), D1 `market_price_history` (read for chart data)
**External API**: `GET /v1/item/{hashedId}/market-history?tier={tier}&type=listings` via history route
**Docs**: `docs/database.md`, `docs/api/internal/investments.md`

---

### Forge Planner
Batch planner that lets users select Forge recipes and totals the required materials.

| Layer | Files |
|---|---|
| Page | `app/(dashboard)/dashboard/forge-planner/page.tsx` |
| Component | `app/(dashboard)/dashboard/forge-planner/ForgePlanner.tsx` |
| Types | `app/(dashboard)/dashboard/forge-planner/types.ts` |
| Pure material totals lib | `lib/domain/forge-planner.ts` |
| Sidebar nav | `components/economy-nav.tsx` |

**DB tables**: D1 `items` (read `recipe` JSON for Forge recipes)
**External API**: none
**Docs**: `docs/database.md`, `docs/game-mechanics/items.md`

---

### Gear Calculator
Gear set builder with combat stat preview and preset save/load.

| Layer | Files |
|---|---|
| Page | `app/(dashboard)/dashboard/gear/page.tsx` |
| Root component | `app/(dashboard)/dashboard/gear/GearCalculator.tsx` (orchestrator ~280 lines) |
| Server actions | `app/(dashboard)/dashboard/gear/actions.ts` (`savePreset`, `updatePreset`, `deletePreset`) |
| Types | `app/(dashboard)/dashboard/gear/types.ts` (`WeaponStyle`, `SlotKey`, `GearSet`, `CatalogItem`, `InspectEntry`, `ComputedStats`, `SlotStatsMap`) |
| Pure stat lib | `app/(dashboard)/dashboard/gear/lib/gear-stats.ts` (`applyTier`, `buildSlotStats`, `computeGearStats`) |
| Component — gear set | `app/(dashboard)/dashboard/gear/components/GearSetPanel.tsx` |
| Component — item picker | `app/(dashboard)/dashboard/gear/components/ItemPickerModal.tsx` |
| Component — stats table | `app/(dashboard)/dashboard/gear/components/StatsPanel.tsx` |
| Component — presets | `app/(dashboard)/dashboard/gear/components/PresetManager.tsx` |
| Hook — character stats | `app/(dashboard)/dashboard/gear/hooks/useCharacterStats.ts` |
| Hook — item search | `app/(dashboard)/dashboard/gear/hooks/useItemSearch.ts` |
| Service | `lib/services/gear-presets.service.ts` |
| Folder docs | `app/(dashboard)/dashboard/gear/README.md` |

**DB tables**: D1 `gear_presets` (read/write), D1 `items` (read for item lookup by hashedId)
**External API**: `getCharacterInfo()`, `getAltCharacters()` (populate character selector)
**Docs**: `docs/game-mechanics/combat-stats.md`, `lib/game-constants.ts` (SLOT_LABELS, CHAR_STAT_MAP)

---

### Combat Planner
DPS calculator with enemy list and character selector.

| Layer | Files |
|---|---|
| Page | `app/(dashboard)/dashboard/combat/page.tsx` |
| Component | `app/(dashboard)/dashboard/combat/CombatPlanner.tsx` |
| Enemy data | `data/enemy-combat-stats.ts` (static — not in API) |
| Hook — enemy scaling | `app/(dashboard)/dashboard/combat/hooks/useEnemyScaling.ts` |
| Lib — MF pure functions | `app/(dashboard)/dashboard/combat/lib/combat-scaling.ts` |

**DB tables**: none
**External API**: `getCharacterInfo()`, `getAltCharacters()`, `getEnemies()`
**Docs**: `docs/game-mechanics/combat.md`, `docs/game-mechanics/combat-stats.md`, `data/enemy-combat-stats.ts`

---

### Dungeons Explorer
Dungeon difficulty calculator with character stat comparison, idle time planner, and loot table viewer.

| Layer | Files |
|---|---|
| Page | `app/(dashboard)/dashboard/dungeons/page.tsx` |
| Component | `app/(dashboard)/dashboard/dungeons/DungeonExplorer.tsx` |
| Static data | `app/(dashboard)/dashboard/dungeons/difficulty.ts` |
| API — admin sync | `app/api/admin/sync-dungeons/route.ts` |
| API — effects proxy | `app/api/idlemmo/character/[id]/effects/route.ts` |

**DB tables**: D1 `dungeons` (read for dungeon catalog), D1 `gear_presets` (read for preset selector), D1 `characters` (read via `getDbCharacters` for `isMember`/`isPrimary`)
**External API**: `getDungeons()` (admin sync only), `getCharacterEffects()` (proxied via effects route)
**Docs**: `docs/game-mechanics/dungeons.md`, `docs/game-mechanics/combat-stats.md`, `docs/database.md`, `docs/api/internal/dungeons-sync.md`, `docs/api/internal/character-effects.md`

---

### Characters
Character roster and detail pages.

| Layer | Files |
|---|---|
| List page | `app/(dashboard)/dashboard/characters/page.tsx` |
| Detail page | `app/(dashboard)/dashboard/characters/[id]/page.tsx` |
| Client component — sync pet button | `app/(dashboard)/dashboard/characters/[id]/SyncPetButton.tsx` |
| API — list | `app/api/characters/route.ts` |
| API — detail | `app/api/idlemmo/character/[id]/route.ts` |
| API — sync pet | `app/api/characters/[id]/sync-pet/route.ts` |
| API — pet stats (GET/PATCH) | `app/api/characters/[id]/pet-stats/route.ts` |
| Service | `lib/services/character-pets.service.ts` |

**DB tables**: D1 `character_pets` (read/write via sync-pet and pet-stats routes)
**External API**: `getCharacterInfo()`, `getAltCharacters()`, `getCharacterPets()`
**Docs**: `docs/game-mechanics/classes.md`, `docs/game-mechanics/pets.md`, `docs/database.md`, `docs/api/internal/pet-stats.md`

---

### Dashboard Home
Customisable 3×2 shortcut grid with character overview.

| Layer | Files |
|---|---|
| Page | `app/(dashboard)/dashboard/page.tsx` |
| Component | `components/dashboard-grid.tsx` |
| Server action | `app/actions/preferences.ts` → `saveDashboardLayout()` |
| Preferences service | `lib/services/user-preferences.service.ts` → `getUserPreferences()`, `saveUserDashboardLayout()` |
| Cache service | `lib/services/character-cache.ts` → `getCachedCharacters()` |

**DB tables**: D1 `userPreferences` (read/write `dashboardLayout`), D1 `characters` (read/write roster cache)
**External API**: `getCharacterInfo()`, `getAltCharacters()` — called only when cache is stale (> 5 min)

---

### Settings
Account settings and IdleMMO API key configuration.

| Layer | Files |
|---|---|
| Page | `app/(dashboard)/dashboard/settings/page.tsx` |
| Components | `components/settings-account-form.tsx` |
| Server actions | `app/actions/account.ts`, `app/actions/locale.ts` |
| Account service | `lib/services/auth-users.service.ts` |
| Preferences service | `lib/services/user-preferences.service.ts` → `saveUserLanguage()` |

**DB tables**: D1 `user` (read/write `idlemmoToken`, `idlemmoCharacterId`, `name`), D1 `userPreferences` (write `language`)

---

### Admin Panel
Admin panel is organized into section pages under a collapsible sidebar nav (Economy / World / Users). The root `/dashboard/admin` redirects to `/dashboard/admin/economy/items`.

| Layer | Files |
|---|---|
| Sidebar nav | `components/admin-nav.tsx` |
| Shared components | `components/admin/AdminTable.tsx` — generic paginated table |
| | `components/admin/SyncLog.tsx` — live sync log |
| Root (redirect) | `app/(dashboard)/dashboard/admin/page.tsx` → redirects to economy/items |
| Items page | `app/(dashboard)/dashboard/admin/economy/items/page.tsx` |
| Sync status page | `app/(dashboard)/dashboard/admin/sync/page.tsx` |
| API inspector page | `app/(dashboard)/dashboard/admin/api-inspector/page.tsx` |
| Dungeons page | `app/(dashboard)/dashboard/admin/world/dungeons/page.tsx` |
| Zones page | `app/(dashboard)/dashboard/admin/world/zones/page.tsx` |
| World Bosses (placeholder) | `app/(dashboard)/dashboard/admin/world/world-bosses/page.tsx` |
| Enemies (placeholder) | `app/(dashboard)/dashboard/admin/world/enemies/page.tsx` |
| Users page | `app/(dashboard)/dashboard/admin/users/page.tsx` |
| Sync routes | `app/api/admin/sync-items/route.ts` |
| | `app/api/admin/sync-prices/route.ts` |
| | `app/api/admin/sync-recipes/route.ts` |
| | `app/api/admin/sync-inspect/route.ts` |
| | `app/api/admin/sync-dungeons/route.ts` |
| API — sync logs | `app/api/admin/sync-logs/route.ts` (`GET` — recent manual sync job events) |
| | `app/api/admin/market-type-check/route.ts` |
| API inspector routes | `app/api/admin/api-inspector/route.ts` |
| | `app/api/admin/api-inspector/run/route.ts` |
| | `app/api/admin/api-inspector/schema/route.ts` |
| API — items | `app/api/admin/items/route.ts` (`GET` — paginated, filterable by name/type/quality) |
| API — dungeons | `app/api/admin/dungeons/route.ts` (`GET` — paginated, filterable by name/minLevel) |
| API — zones | `app/api/admin/zones/route.ts` (`GET`, `POST`) |
| | `app/api/admin/zones/[id]/route.ts` (`GET`, `PATCH`, `DELETE`) |
| API — users | `app/api/admin/users/route.ts` (`GET` — paginated with characters) |
| | `app/api/admin/users/[id]/route.ts` (`PATCH` email/password, `DELETE`) |
| | `app/api/admin/users/[id]/characters/[charId]/route.ts` (`DELETE` — dissociate) |
| Services | `lib/services/admin/items.service.ts` → `getAdminItems()` |
| | `lib/services/admin/dungeons.service.ts` → `getAdminDungeons()` |
| | `lib/services/admin/zones.service.ts` → `getAdminZones()`, `getZoneDetail()`, CRUD, associations |
| | `lib/services/admin/users.service.ts` → re-exports D1-backed user helpers from `lib/services/auth-users.service.ts` |
| | `lib/services/admin/sync-logs.service.ts` → `recordSyncLog()`, `getRecentSyncLogs()` |
| | `lib/services/admin/api-inspector.service.ts` -> endpoint specs, typed schema inference, schema diffs, observations |
| | `lib/services/admin/api-inspector-r2-snapshots.service.ts` -> R2 raw response snapshot archival |
**DB tables**: D1 `items`, D1 `market_price_history`, D1 `sync_state`, D1 `sync_job_logs`, D1 `api_endpoint_specs`, D1 `api_response_schemas`, D1 `api_schema_observations`, D1 `dungeons`, D1 `zones`, `enemies`, `world_bosses`, `zone_resources`, D1 `user`, D1 `characters`
**R2 objects**: `api-inspector/<endpoint-key>/<YYYY-MM-DD>/<timestamp>-<observation-id>.json` stores raw API Inspector responses plus metadata, inferred schema, and diff. Admin sync routes store successful source payloads under `sync/<job>/admin/<YYYY-MM-DD>/`.
**External API**: All IdleMMO sync endpoints
**Requires**: `session.user.role === "admin"`
**Docs**: `docs/api/internal/admin-items.md`, `docs/api/internal/admin-users.md`, `docs/api/internal/admin-zones.md`, `docs/api/internal/cron-sync.md`, `docs/api/internal/sync-logs.md`, `docs/api/internal/api-inspector.md`

---

### Auth
Email/password auth via better-auth.

| Layer | Files |
|---|---|
| Server config | `lib/auth.ts` |
| Client | `lib/auth-client.ts` |
| API handler | `app/api/auth/[...all]/route.ts` |
| Login UI | `app/(auth)/login/page.tsx`, `components/login-form.tsx` |
| Register UI | `app/(auth)/register/page.tsx`, `components/register-form.tsx` |
| Password recovery request | `app/forgot-password/page.tsx`, `components/forgot-password-form.tsx` |
| Password reset | `app/reset-password/page.tsx`, `components/reset-password-form.tsx` |
| Password reset email delivery | `lib/services/password-reset-email.ts` |

**DB tables**: D1 `user`, D1 `session`, D1 `account`, D1 `verification`
**D1 migration**: `d1/migrations/0013_auth.sql`
**Account service**: `lib/services/auth-users.service.ts`
**External services**: Resend API when `RESEND_API_KEY` and `PASSWORD_RESET_EMAIL_FROM` are configured; development logs reset links when email is not configured.
**Docs**: better-auth — use context7 before modifying

---

## Shared Libraries

| File | What it provides |
|---|---|
| `lib/db/schema.ts` | Shared TypeScript-only data shapes used by D1 services and UI types |
| `lib/db/d1.ts` | Cloudflare D1 binding helper and minimal D1 statement types |
| `lib/storage/r2.ts` | Cloudflare R2 `IMMO_SOURCES_BUCKET` binding helper |
| `lib/services/sync-r2-snapshots.service.ts` | Sync source snapshot archival to R2 |
| `lib/services/admin/api-inspector-r2-snapshots.service.ts` | API Inspector raw response snapshot archival to R2 |
| `lib/idlemmo.ts` | IdleMMO API client — all external API functions and interfaces |
| `lib/idlemmo-queue.ts` | Client-side rate-limit queue for browser API calls |
| `lib/game-constants.ts` | `QUALITY_COLORS`, `SLOT_LABELS`, `CHAR_STAT_MAP`, `STATUS_DOT_COLOR` |
| `lib/market-config.ts` | Market tab definitions (id, label, item types list) |
| `lib/auth.ts` | better-auth server instance |
| `lib/auth-client.ts` | better-auth browser client |
| `lib/utils.ts` | `cn()` class name helper |
| `data/enemy-combat-stats.ts` | Hardcoded enemy AP/Prot/Agi/Acc (not in IdleMMO API) |

---

## DB Tables Quick-Lookup

| Table | Populated by | Read by |
|---|---|---|
| D1 `items` | sync-items, sync-prices, sync-inspect, sync-recipes | market, gear, investments, admin |
| D1 `market_price_history` | sync-prices (cron + admin), market price live fallback | investments history, market price route |
| D1 `price_tracker` | investments API (user action) | investments page |
| D1 `gear_presets` | gear actions | gear page, dungeons page |
| D1 `userPreferences` | preferences and locale actions | dashboard, settings |
| `syncState` | all cron jobs | cron jobs (gating), admin panel |
| D1 `sync_job_logs` | admin sync routes | admin sync status page |
| D1 `api_endpoint_specs` | API inspector defaults/admin edits | API inspector |
| D1 `api_response_schemas` | API inspector schema saves | API inspector, future API docs work |
| D1 `api_schema_observations` | API inspector endpoint runs | API inspector |
| D1 `characters` | character-cache service | dashboard, characters list |
| D1 `character_pets` | sync-pet API route (user action) | character detail page |
| D1 `dungeons` | admin sync-dungeons route | dungeons page |
| `enemies` | future sync (placeholder) | admin enemies picker |
| `world_bosses` | future sync (placeholder) | admin world-bosses picker |
| D1 `zones` | manually (admin UI) | zone associations feature |
| D1 `item_zones` | zone associations admin UI | zone associations feature |
| D1 `user` / `session` / `account` / `verification` | better-auth | auth middleware |

---

## Cron Schedule Summary

| Job | Schedule | Gated on |
|---|---|---|
| `sync-items` | Monday 00:00 UTC | — |
| `sync-recipes` | Monday 02:00 UTC | items done today |
| `sync-prices` | Daily 04:00 UTC | — (processes 80 items/day, cycles all items over time) |

**Current runtime target**: Cloudflare Cron Triggers via `wrangler.jsonc`.

---

## E2E Smoke Tests

Playwright tests that verify key pages load without a 500 error against the production deployment. CI should set `BASE_URL` to `https://immo-web-suite.void-presence.workers.dev`.

| File | Purpose |
|---|---|
| `playwright.config.ts` | Playwright configuration — base URL, projects, storageState path |
| `e2e/auth.setup.ts` | One-time login fixture — saves session to `playwright/.auth/user.json` |
| `e2e/smoke.spec.ts` | Smoke tests: unauthenticated redirect check + authenticated page load checks |
| `.github/workflows/ci.yml` | CI/CD workflow — runs type check, build, D1 migrations, deploys `master` to Cloudflare Workers, and smoke-tests Cloudflare production |

**Secrets required** (already in GitHub repo): `E2E_EMAIL`, `E2E_PASSWORD`

---

## Keeping This Map Current

After every task that adds, moves, or renames a route, component, table column, or cron job — update the relevant section(s) above. If you add a new feature area, add a new section.
