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
| API — list | `app/api/market/route.ts` |
| API — item detail | `app/api/market/item/[id]/route.ts` |
| API — price | `app/api/market/price/[id]/route.ts` |
| API — crafted-by | `app/api/market/crafted-by/[id]/route.ts` |
| Config | `lib/market-config.ts` (tab → item type mapping) |
| Folder docs | `app/(dashboard)/dashboard/market/README.md` |

**DB tables**: `items` (read), `market_price_history` (read/write via price route — per-tier prices)
**External API**: `GET /v1/item/{id}/market-history?tier=N` — live fallback in price route when tier > 1 is not yet in DB
**Docs**: `docs/game-mechanics/item-types.md`, `docs/game-mechanics/items.md`, `docs/database.md`

**Tier pricing notes**:
- `market_price_history` stores prices per tier (1-based). The price route reads from this table first.
- Tier 1 fallback: `items.last_sold_price` (populated by sync-prices, always up to date).
- Tier > 1 cache miss: the price route fetches live from IdleMMO API using the session user's token and persists the result.
- The sync-prices jobs (cron + admin) now fetch all tiers for items where `max_tier > 1` is known.

---

### Item Sync (Catalog)
Weekly cron that refreshes the item catalog from the IdleMMO API.

| Layer | Files |
|---|---|
| Cron route | `app/api/cron/sync-items/route.ts` |
| Admin route | `app/api/admin/sync-items/route.ts` |
| IdleMMO client | `lib/idlemmo.ts` → `searchItemsByType()` |

**DB tables**: `items` (upsert catalog fields), `sync_state` (marks job done)
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

**DB tables**: `items` (write `recipeResultHashedId`), `sync_state` (gates on items done, marks recipes done)
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

**DB tables**: `items` (write `lastSoldPrice`, `lastSoldAt`, `priceCheckedAt`), `market_price_history` (insert), `sync_state` (read status)
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

**DB tables**: `items` (write inspect fields: `description`, `baseStats`, `tierModifiers`, `effects`, `recipe`, `requirements`, `whereToFind`, `inspectedAt`)
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

**DB tables**: `priceTracker` (read/write), `marketPriceHistory` (read for chart data)
**External API**: none
**Docs**: `docs/database.md`

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
| Folder docs | `app/(dashboard)/dashboard/gear/README.md` |

**DB tables**: `gearPresets` (read/write), `items` (read for item lookup by hashedId)
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

**DB tables**: none
**External API**: `getCharacterInfo()`, `getAltCharacters()`, `getEnemies()`
**Docs**: `docs/game-mechanics/combat.md`, `docs/game-mechanics/combat-stats.md`, `data/enemy-combat-stats.ts`

---

### Dungeons Explorer
Dungeon difficulty calculator with character stat comparison.

| Layer | Files |
|---|---|
| Page | `app/(dashboard)/dashboard/dungeons/page.tsx` |
| Component | `app/(dashboard)/dashboard/dungeons/DungeonExplorer.tsx` |
| Static data | `app/(dashboard)/dashboard/dungeons/difficulty.ts` |

**DB tables**: `gearPresets` (read for preset selector)
**External API**: `getCharacterInfo()`, `getAltCharacters()`, `getDungeons()`
**Docs**: `docs/game-mechanics/dungeons.md`, `docs/game-mechanics/combat-stats.md`

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

**DB tables**: `character_pets` (read/write via sync-pet route)
**External API**: `getCharacterInfo()`, `getAltCharacters()`, `getCharacterPets()`
**Docs**: `docs/game-mechanics/classes.md`, `docs/game-mechanics/pets.md`, `docs/database.md`

---

### Dashboard Home
Customisable 3×2 shortcut grid with character overview.

| Layer | Files |
|---|---|
| Page | `app/(dashboard)/dashboard/page.tsx` |
| Component | `components/dashboard-grid.tsx` |
| Server action | `app/actions/preferences.ts` → `saveDashboardLayout()` |
| Cache service | `lib/services/character-cache.ts` → `getCachedCharacters()` |

**DB tables**: `userPreferences` (read/write `dashboardLayout`), `characters` (read/write roster cache)
**External API**: `getCharacterInfo()`, `getAltCharacters()` — called only when cache is stale (> 5 min)

---

### Settings
Account settings and IdleMMO API key configuration.

| Layer | Files |
|---|---|
| Page | `app/(dashboard)/dashboard/settings/page.tsx` |
| Components | `components/settings-account-form.tsx` |
| Server actions | `app/actions/account.ts` |

**DB tables**: `user` (read/write `idlemmoToken`, `idlemmoCharacterId`, `name`)

---

### Admin Panel
Manual sync triggers with live activity log and per-type status.

| Layer | Files |
|---|---|
| Page | `app/(dashboard)/dashboard/admin/page.tsx` |
| Admin routes | `app/api/admin/sync-items/route.ts` |
| | `app/api/admin/sync-prices/route.ts` |
| | `app/api/admin/sync-recipes/route.ts` |
| | `app/api/admin/sync-inspect/route.ts` |
| | `app/api/admin/market-type-check/route.ts` |

**DB tables**: `items`, `market_price_history`, `sync_state`
**External API**: All IdleMMO sync endpoints
**Requires**: `session.user.role === "admin"`

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
| Modal slot | `app/@modal/` |

**DB tables**: `user`, `session`, `account`, `verification`
**Docs**: better-auth — use context7 before modifying

---

## Shared Libraries

| File | What it provides |
|---|---|
| `lib/db/schema.ts` | All Drizzle table definitions and TS types |
| `lib/db/index.ts` | `db` — Drizzle client (Neon serverless) |
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
| `items` | sync-items, sync-prices, sync-inspect, sync-recipes | market, gear, investments, admin |
| `market_price_history` | sync-prices (cron + admin) | investments history, market price route |
| `priceTracker` | investments API (user action) | investments page |
| `gearPresets` | gear actions | gear page, dungeons page |
| `userPreferences` | preferences action | dashboard, settings |
| `syncState` | all cron jobs | cron jobs (gating), admin panel |
| `characters` | character-cache service | dashboard, characters list |
| `character_pets` | sync-pet API route (user action) | character detail page |
| `user` / `session` / `account` / `verification` | better-auth | auth middleware |

---

## Cron Schedule Summary

| Job | Schedule | Gated on |
|---|---|---|
| `sync-items` | Monday 00:00 UTC | — |
| `sync-recipes` | Monday 02:00 UTC | items done today |
| `sync-prices` | Daily 04:00 UTC | — (processes 80 items/day, cycles all items over time) |

**Hobby plan limit**: 1 execution per day per cron — `*/N` expressions are rejected at deploy time.

---

## E2E Smoke Tests

Playwright tests that verify key pages load without a 500 error against the production deployment at `https://immowebsuite.vercel.app`.

| File | Purpose |
|---|---|
| `playwright.config.ts` | Playwright configuration — base URL, projects, storageState path |
| `e2e/auth.setup.ts` | One-time login fixture — saves session to `playwright/.auth/user.json` |
| `e2e/smoke.spec.ts` | Smoke tests: unauthenticated redirect check + authenticated page load checks |
| `.github/workflows/e2e.yml` | CI workflow — runs on push to master and on PRs |

**Secrets required** (already in GitHub repo): `E2E_EMAIL`, `E2E_PASSWORD`

---

## Keeping This Map Current

After every task that adds, moves, or renames a route, component, table column, or cron job — update the relevant section(s) above. If you add a new feature area, add a new section.
