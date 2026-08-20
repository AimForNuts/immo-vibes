# Internal API Routes (`app/api/`)

This directory contains the app's own Next.js route handlers. These are separate from the IdleMMO external API references in `docs/api/`.

Use this file as a route inventory. Detailed request and response shapes live in `docs/api/internal/` where available.

---

## Auth Model

Most routes require a better-auth session. Routes that call IdleMMO also require the logged-in user to have an IdleMMO API token configured in Settings. Admin routes additionally require `session.user.role === "admin"`. Cron routes are protected by `CRON_SECRET`.

Common error shape:

```json
{ "error": "Human-readable message" }
```

Common status codes:

| Code | Meaning |
|---|---|
| `400` | Missing or invalid request parameter/body |
| `401` | No authenticated session or invalid cron secret |
| `403` | Authenticated user lacks the required role |
| `404` | Requested resource was not found |
| `500` | Upstream API, database, or unexpected server error |

---

## Route Groups

### `auth/[...all]/`

better-auth catch-all handler.

| Method | Path | Purpose |
|---|---|---|
| managed | `/api/auth/[...all]` | Sign in, sign out, session, registration, and other better-auth endpoints. |

Source: `app/api/auth/[...all]/route.ts`

Do not edit route behavior directly unless updating better-auth configuration in `lib/auth.ts`.

---

### `characters/`

Authenticated character and pet routes.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/characters` | Return the authenticated user's character roster. |
| `POST` | `/api/characters/[id]/sync-pet` | Fetch and upsert the selected character's current pet. |
| `GET` | `/api/characters/[id]/pet-stats` | Read locally saved pet stats for a character. |
| `PATCH` | `/api/characters/[id]/pet-stats` | Update manually maintained pet stats. |

Related docs:

- `docs/api/internal/characters.md`
- `docs/api/internal/pet-stats.md`
- `docs/game-mechanics/pets.md`

---

### `idlemmo/`

Authenticated proxy routes for IdleMMO data. These routes use the session user's saved IdleMMO token and may forward rate-limit headers for browser queueing.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/idlemmo/auth-check` | Validate an IdleMMO API token. |
| `GET` | `/api/idlemmo/character/[id]` | Fetch character detail from IdleMMO. |
| `GET` | `/api/idlemmo/character/[id]/effects` | Fetch character effects from IdleMMO. |
| `GET` | `/api/idlemmo/character/raw` | Fetch raw character data for inspection/debugging. |
| `GET` | `/api/idlemmo/item/[id]` | Fetch full item inspect data from IdleMMO. |
| `GET` | `/api/idlemmo/dungeons` | Fetch normalized dungeon data from IdleMMO. |
| `GET` | `/api/idlemmo/dungeons/raw` | Fetch raw dungeon data for inspection/debugging. |

Related docs:

- `docs/api/internal/character-detail.md`
- `docs/api/internal/character-effects.md`
- `docs/api/internal/dungeons.md`
- `docs/api/internal/item-inspect.md`
- `docs/api/`

---

### `market/`

DB-backed market browser routes. Most routes read from local tables populated by sync jobs. The price route can call IdleMMO on a tiered cache miss.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/market` | Paginated market item list by tab, name query, or recently-added mode. |
| `GET` | `/api/market/item/[id]` | Full local item detail including inspect fields. |
| `GET` | `/api/market/price/[id]` | Latest market price for an item/tier, with tier fallback behavior. |
| `GET` | `/api/market/crafted-by/[id]` | Find recipe items that craft the selected result item. |
| `GET` | `/api/market/zones` | Market-facing zone lookup for resource/location features. |

Related docs:

- `docs/api/internal/market.md`
- `docs/api/internal/market-zones.md`
- `app/(dashboard)/dashboard/market/README.md`
- `docs/game-mechanics/item-types.md`
- `docs/game-mechanics/items.md`

---

### `items/`

Local item search and item-zone association routes.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/items` | Search the local item catalog by type/name/quality. |
| `GET` | `/api/items/[id]/zones` | Read zones associated with a gathering item. |
| `PUT` | `/api/items/[id]/zones` | Replace a gathering item's associated zones. Admin-only. |

Related docs:

- `docs/api/internal/items.md`
- `docs/api/internal/market-zones.md`
- `docs/database.md`

---

### `investments/`

Authenticated price tracker routes.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/investments` | List the authenticated user's tracked items. |
| `POST` | `/api/investments` | Add an item/tier to the authenticated user's tracker. |
| `DELETE` | `/api/investments/[id]` | Remove a tracked item. |
| `GET` | `/api/investments/[id]/history` | Return price history for a tracked item. |

Related docs:

- `docs/database.md`
- `app/(dashboard)/dashboard/investments/README.md`

---

### `admin/`

Admin-only routes. These require an authenticated admin session unless noted otherwise by an individual route.

#### Sync And Diagnostics

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/admin/sync-items` | Sync item catalog data from IdleMMO. |
| `POST` | `/api/admin/sync-prices` | Sync market prices into D1 `items` and D1 `market_price_history`. |
| `POST` | `/api/admin/sync-recipes` | Populate recipe result metadata for recipe items. |
| `POST` | `/api/admin/sync-inspect` | Sync inspect data: stats, effects, requirements, recipes, tiers. |
| `POST` | `/api/admin/sync-dungeons` | Sync dungeon catalog and loot data from IdleMMO. |
| `GET` | `/api/admin/market-type-check` | Inspect market listing counts by item type. |

#### Economy

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/admin/items` | Paginated item admin table with name/type/quality filters. |
| `PATCH` | `/api/admin/items/[id]/store-price` | Update an item's NPC store price. |

#### World

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/admin/dungeons` | Paginated dungeon admin table with filters. |
| `GET` | `/api/admin/zones` | Paginated zone admin table or slim zone list with `?slim=true`. |
| `POST` | `/api/admin/zones` | Create a zone. |
| `GET` | `/api/admin/zones/[id]` | Read zone detail. |
| `PATCH` | `/api/admin/zones/[id]` | Update zone metadata and JSON association fields supported by the route. |
| `DELETE` | `/api/admin/zones/[id]` | Delete a zone. |

#### Users

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/admin/users` | Paginated user table with character data. |
| `PATCH` | `/api/admin/users/[id]` | Update a user's email/password fields. |
| `DELETE` | `/api/admin/users/[id]` | Delete a user. |
| `DELETE` | `/api/admin/users/[id]/characters/[charId]` | Dissociate a character from a user. |

Related docs:

- `docs/api/internal/admin-store-price.md`
- `docs/api/internal/admin-items.md`
- `docs/api/internal/admin-users.md`
- `docs/api/internal/admin-zones.md`
- `docs/api/internal/cron-sync.md`
- `docs/api/internal/dungeons-sync.md`
- `docs/api/internal/sync-items.md`
- `app/(dashboard)/dashboard/admin/README.md`
- `docs/database.md`

---

### `cron/`

Cron-triggered routes called by Vercel. All current cron route handlers export `POST` and are protected by `CRON_SECRET`.

| Method | Path | Schedule | Purpose |
|---|---|---|---|
| `POST` | `/api/cron/sync-items` | Monday 00:00 UTC | Refresh the item catalog. |
| `POST` | `/api/cron/sync-recipes` | Monday 02:00 UTC | Populate recipe result metadata after item sync. |
| `POST` | `/api/cron/sync-prices` | Daily 04:00 UTC | Refresh market prices for a batch of items. |

Related docs:

- `docs/database.md`
- `docs/api/rate-limiting.md`
- `docs/api/internal/cron-sync.md`
- `docs/project-map.md`

---

## Detailed Docs Coverage

Existing detailed internal API docs:

- `docs/api/internal/admin-store-price.md`
- `docs/api/internal/admin-items.md`
- `docs/api/internal/admin-users.md`
- `docs/api/internal/admin-zones.md`
- `docs/api/internal/character-detail.md`
- `docs/api/internal/character-effects.md`
- `docs/api/internal/characters.md`
- `docs/api/internal/dungeons-sync.md`
- `docs/api/internal/dungeons.md`
- `docs/api/internal/item-inspect.md`
- `docs/api/internal/items.md`
- `docs/api/internal/market-zones.md`
- `docs/api/internal/market.md`
- `docs/api/internal/overview.md`
- `docs/api/internal/pet-stats.md`
- `docs/api/internal/sync-items.md`
- `docs/api/internal/cron-sync.md`

Known documentation gaps are tracked in `docs/iteration/improvements.md`.
